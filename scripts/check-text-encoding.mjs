import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => /\.(?:[cm]?[jt]sx?|json|md|css|html|ya?ml|toml)$/i.test(file));

const suspicious = /\uFFFD|(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|â€[\u0080-\u00BF]|ðŸ)/;
const problems = [];

for (const file of files) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(file));
  } catch {
    problems.push(`${file}: arquivo não está em UTF-8 válido`);
    continue;
  }

  text.split(/\r?\n/).forEach((line, index) => {
    if (suspicious.test(line)) problems.push(`${file}:${index + 1}: sequência suspeita de codificação`);
  });
}

if (problems.length) {
  console.error("Verificação de codificação falhou:\n" + problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Codificação UTF-8 válida; ${files.length} arquivos verificados.`);
}
