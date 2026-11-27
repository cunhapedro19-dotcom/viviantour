const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("centraliza os dados oficiais e a URL extraída do QR Code", () => {
  const config = read("src/lib/cadastur.ts");

  assert.match(config, /28\.167\.645\/0001-32/);
  assert.match(config, /VIVIAN TOUR SERVICOS DE TURISMO LTDA/);
  assert.match(config, /04\/11\/2026/);
  assert.match(config, /04\/11\/2028/);
  assert.match(config, /qrcode\/28167645000132/);
});

test("reutiliza o mesmo componente na página inicial e no rodapé", () => {
  const home = read("src/app/(site)/page.tsx");
  const footer = read("src/components/site/Footer.tsx");
  const trust = read("src/components/site/CadasturTrust.tsx");

  assert.match(home, /<CadasturTrust variant="home" \/>/);
  assert.match(footer, /<CadasturTrust variant="footer" \/>/);
  assert.equal((trust.match(/CadasturCertificateDialog/g) || []).length >= 3, true);
});

test("mantém o certificado original como ativo público", () => {
  const certificate = path.join(root, "public/cadastur/certificado-vivian-tourr.png");
  assert.equal(fs.existsSync(certificate), true);
  assert.equal(fs.statSync(certificate).size > 100_000, true);
});
