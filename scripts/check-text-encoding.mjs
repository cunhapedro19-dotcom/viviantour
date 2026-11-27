import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const strictUTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const windows1252 = "\u20ac\u0081\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u008d\u017d\u008f\u0090\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u009d\u017e\u0178";
const reverse1252 = new Map([...windows1252].map((char, i) => [char, i + 128]));
const textExtensions = new Set(".ts .tsx .mts .cts .js .jsx .mjs .cjs .json .md .mdx .css .scss .html .htm .yaml .yml .toml .sql .py .svg .txt .xml .ics .sh .ps1 .csv .tsv .ini .conf .config .map .webmanifest".split(" "));
const textNames = new Set([".gitignore", ".gitattributes", ".editorconfig", ".env.example", ".npmrc", "Dockerfile"]);

// Only local copies, caches and downloaded media evidence. Never exclude active source.
export const exclusions = [
  ".git/", "node_modules/", ".next/", "out/", "build/", "coverage/",
  ".claude/worktrees/", ".codex-temp/", ".codex-audit-tmp-phase2/", ".phase4-checkpoint/",
  "visual-validation/", "casa-oceano-airbnb/", "casa-serena-airbnb/", "flor-do-sal-airbnb/",
];

function legacyByte(char) {
  if (reverse1252.has(char)) return reverse1252.get(char);
  const code = char?.codePointAt(0);
  return code <= 255 ? code : undefined;
}

// A candidate must reconstruct a complete, strictly valid UTF-8 sequence.
// This preserves lone accented capitals, normal Portuguese, emoji and other scripts.
export function findMojibake(text) {
  const found = [];
  for (let i = 0; i < text.length; i++) {
    const lead = legacyByte(text[i]);
    const length = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
    if (!length) continue;
    const chars = text.slice(i, i + length);
    const bytes = [...chars].map(legacyByte);
    if (bytes.length !== length || bytes.slice(1).some((b) => b === undefined || b < 0x80 || b > 0xbf)) continue;
    try {
      const decoded = strictUTF8.decode(Uint8Array.from(bytes));
      const severity = [0xc2, 0xc3, 0xe2, 0xef, 0xf0].includes(lead) ? "error" : "warning";
      found.push({ index: i, type: "mojibake", severity, sequence: chars, suggestion: decoded });
      i += length - 1;
    } catch { /* Not a valid re-interpretation; leave legitimate Unicode untouched. */ }
  }
  return found;
}

export function inspectBytes(bytes, file = "<buffer>") {
  let text;
  try { text = strictUTF8.decode(bytes); }
  catch {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let offset = 0;
    try {
      for (; offset < bytes.length; offset++) decoder.decode(bytes.subarray(offset, offset + 1), { stream: true });
      decoder.decode();
    } catch { /* Locate the offending sequence only after strict decoding fails. */ }
    const prefix = Buffer.from(bytes.subarray(0, offset)).toString("utf8");
    const lines = prefix.split("\n");
    return [{ file, line: lines.length, column: lines.at(-1).length + 1, severity: "error", type: "invalid-utf8", content: "Bytes inválidos para UTF-8; inspecione o arquivo original." }];
  }
  const findings = [];
  const add = (line, column, type, content, severity = "error", suggestion) => findings.push({ file, line, column, severity, type, content, ...(suggestion ? { suggestion } : {}) });
  if (text.charCodeAt(0) === 0xfeff) add(1, 1, "bom", "UTF-8 com BOM; use UTF-8 sem BOM.");
  text.split(/\r?\n/).forEach((line, i) => {
    for (const match of line.matchAll(/\uFFFD|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g)) {
      add(i + 1, match.index + 1, match[0] === "\uFFFD" ? "replacement" : "control", line);
    }
    for (const m of findMojibake(line)) add(i + 1, m.index + 1, m.type, line, m.severity, m.suggestion);
    if (/^(?:<{7}(?: |$)|={7}$|>{7}(?: |$)|\|{7}(?: |$))/.test(line)) add(i + 1, 1, "conflict-marker", line);
    if (/&amp;(?:[a-z]+|#\d+|#x[\da-f]+);/i.test(line)) add(i + 1, 1, "double-html-entity", line, "warning");
  });
  return findings;
}

// These files intentionally construct corruption examples/mapping tables in memory.
// Their raw bytes remain audited. No application source gets this exception.
const decodedFixtures = new Set(["tests/encoding.test.mjs", "scripts/check-text-encoding.mjs", "docs/integrity/encoding-inventory.json"]);
export function inspectEscapedLiterals(text, file) {
  if (decodedFixtures.has(file) || !/\.(?:[cm]?[jt]sx?|json)$/i.test(file)) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const findings = [];
  function visit(node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && /\\(?:u[\da-f]{4}|u\{[\da-f]+\}|x[\da-f]{2})/i.test(node.getText(source))) {
      const location = source.getLineAndCharacterOfPosition(node.getStart(source));
      for (const f of inspectBytes(Buffer.from(node.text), file)) findings.push({ ...f, line: location.line + 1, column: location.character + 1, type: `escaped-${f.type}` });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return findings;
}

export function isRelevantFile(file) {
  const path = file.replaceAll("\\", "/");
  return !exclusions.some((prefix) => path.startsWith(prefix)) &&
    (textExtensions.has(extname(path).toLowerCase()) || textNames.has(path.split("/").at(-1)));
}

export function repositoryFiles(root) {
  return [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean))]
    .filter(isRelevantFile).sort();
}

export function auditFiles(root, files) {
  const findings = [];
  let audited = 0;
  for (const file of files) {
    const path = resolve(root, file);
    // A tracked deletion is legitimate. Unreadable existing files must fail closed.
    if (!existsSync(path)) continue;
    audited++;
    try {
      const bytes = readFileSync(path);
      const raw = inspectBytes(bytes, file);
      findings.push(...raw);
      if (!raw.some((f) => f.type === "invalid-utf8")) findings.push(...inspectEscapedLiterals(strictUTF8.decode(bytes), file));
    }
    catch { findings.push({ file, line: 1, column: 1, severity: "error", type: "read-error", content: "Não foi possível ler o arquivo." }); }
  }
  return { audited, errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, findings };
}

export function main(args = process.argv.slice(2)) {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const explicit = args.indexOf("--files");
  const files = explicit >= 0 ? args.slice(explicit + 1).filter((a) => a !== "--json").map((p) => relative(root, resolve(p))) : repositoryFiles(root);
  const report = auditFiles(root, files);
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    for (const f of report.findings) console.error(`${f.file}:${f.line}:${f.column}: ${f.severity} [${f.type}] ${JSON.stringify(f.content)}`);
    console.log(`Codificação: ${report.audited} arquivos; ${report.errors} erros; ${report.warnings} avisos.`);
  }
  return report.errors ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`Auditoria não executada: ${error.message}`); process.exitCode = 1; }
}
