import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { inspectBytes, inspectEscapedLiterals, auditFiles, repositoryFiles } from "../scripts/check-text-encoding.mjs";

const inspect = (text) => inspectBytes(Buffer.from(text));
const corrupt = (text) => Buffer.from(text).toString("latin1");
const positives = ["Você", "Não", "Descrição", "Administração", "Localização", "Hospedagens", "Experiências", "São Paulo", "Arraial do Cabo", "ÁREA ADMINISTRATIVA", "SÃO JOÃO", "AÇÃO", "Âncora", "Ã", "Â", "⛵ 🏖️ ✅ → ← … — “Olá”", "日本語 العربية Ελληνικά кириллица"];
for (const text of positives) test(`preserva ${text}`, () => assert.deepEqual(inspect(text), []));

for (const text of ["Você", "Não", "Descrição", "Administração", "Localização", "Experiências", "“Olá” – ’", "🏖️ ⛵"])
  for (let depth = 1; depth <= 4; depth++) test(`detecta camada ${depth}: ${text}`, () => {
    let broken = text;
    for (let i = 0; i < depth; i++) broken = corrupt(broken);
    assert.ok(inspect(broken).some((f) => f.severity === "error"));
  });

test("detecta Windows-1252, pontuação e emoji, inclusive os bytes 0x80-0x9f", () => {
  for (const text of ["Voc\u00c3\u00aa", "Descri\u00c3\u00a7\u00c3\u00a3o", "\u00e2\u20ac\u2122", "\u00e2\u20ac\u201c", "\u00f0\u0178\u0152\u00b4", "\u00c3\u0192\u00c2\u00a7"])
    assert.ok(inspect(text).some((f) => f.type === "mojibake" && f.severity === "error"));
});
test("rejeita bytes inválidos e UTF-16", () => {
  for (const bytes of [[0xc3, 0x28], [0xff, 0xfe, 0x41, 0], [0xe2, 0x82]]) assert.equal(inspectBytes(Uint8Array.from(bytes))[0].type, "invalid-utf8");
});
test("localiza UTF-8 inválido depois da primeira linha", () => {
  assert.equal(inspectBytes(Buffer.concat([Buffer.from("correto\n"), Buffer.from([0xff])]))[0].line, 2);
});
test("inspeciona strings escapadas da aplicação e JSON, mantendo fixtures controladas", () => {
  const source = 'const message = "Voc' + String.raw`\u00c3\u00aa` + '";';
  assert.ok(inspectEscapedLiterals(source, "src/example.tsx").some((f) => f.type === "escaped-mojibake"));
  assert.ok(inspectEscapedLiterals('{"message":"' + String.raw`\ufffd` + '"}', "public/messages.json").some((f) => f.type === "escaped-replacement"));
  assert.deepEqual(inspectEscapedLiterals(source, "tests/encoding.test.mjs"), []);
  assert.deepEqual(inspectEscapedLiterals('const label = "' + String.raw`S\u00c3O JO\u00c3O` + '";', "src/example.ts"), []);
});
test("detecta controles reais de cadastro, admin e README e U+FFFD", () => {
  for (const char of ["\ufffd", "\u001a", "\u001b", "\u0000", "\u0085", "\u007f"]) {
    const [f] = inspect(`válido\ntexto${char}fim`);
    assert.equal(f.line, 2); assert.equal(f.column, 6); assert.equal(f.severity, "error");
  }
  assert.deepEqual(inspect("texto\tcom tab\r\ne newline\n"), []);
});
test("detecta BOM e conflitos residuais", () => {
  assert.equal(inspect("\ufefftexto")[0].type, "bom");
  for (const marker of ["<<<<<<< Updated upstream", "=======", ">>>>>>> Stashed changes", "||||||| base"]) assert.equal(inspect(marker)[0].type, "conflict-marker");
});
test("distingue avisos heurísticos de erros", () => {
  assert.equal(inspect("&amp;" + "atilde;")[0].severity, "warning");
  assert.equal(inspect("\u00d8\u00a7")[0].severity, "warning");
});
test("audita exemplos reais do inventário sem excluir arquivos de teste", () => {
  const inventory = JSON.parse(readFileSync(new URL("../docs/integrity/encoding-inventory.json", import.meta.url)));
  for (const row of inventory.records) {
    assert.ok(inspect(row.found).some((f) => f.severity === "error"), `${row.file}:${row.line}`);
    assert.deepEqual(inspect(row.expected), [], `${row.file}:${row.line}`);
  }
});
test("inclui SQL, arquivos novos, dotfiles e scripts; exclui somente artefatos", () => {
  const root = mkdtempSync(join(tmpdir(), "vivian-encoding-"));
  try {
    execFileSync("git", ["init", "-q", root]);
    writeFileSync(join(root, ".gitignore"), "node_modules/\n");
    for (const dir of ["src", "supabase", "node_modules", ".codex-temp", "tests"]) mkdirSync(join(root, dir));
    for (const file of ["src/new.tsx", "supabase/new.sql", ".editorconfig", "tests/new.mjs", ".codex-temp/old.ts", "node_modules/dep.js"]) writeFileSync(join(root, file), "texto");
    execFileSync("git", ["add", ".gitignore"], { cwd: root });
    assert.deepEqual(repositoryFiles(root), [".editorconfig", ".gitignore", "src/new.tsx", "supabase/new.sql", "tests/new.mjs"]);
    const bytes = Buffer.from("erro\ufffd"); writeFileSync(join(root, "supabase/new.sql"), bytes);
    assert.equal(auditFiles(root, repositoryFiles(root)).errors, 1);
    assert.deepEqual(readFileSync(join(root, "supabase/new.sql")), bytes);
    const cli = spawnSync(process.execPath, [resolve("scripts/check-text-encoding.mjs"), "--json"], { cwd: root, encoding: "utf8" });
    assert.equal(cli.status, 1); assert.equal(JSON.parse(cli.stdout).findings[0].file, "supabase/new.sql");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
