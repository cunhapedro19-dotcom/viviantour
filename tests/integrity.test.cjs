const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, console, Date, URL, setTimeout, window: { location: { href: '' } } };
  context.require = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  vm.runInNewContext(code, context, { filename });
  return module.exports;
}

test('WhatsApp mantém acentos, emoji, quebras de linha e parâmetros sem dupla codificação', () => {
  const { whatsappRequestUrl } = load('src/lib/whatsapp.ts', { './config': { DEFAULT_WHATSAPP_NUMBER: '5522000000000' } });
  const message = 'Olá! São João ⛵\nDescrição: hóspedes & crianças + 2?';
  const url = new URL(whatsappRequestUrl('(22) 90000-0000', message));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/5522900000000');
  assert.equal(url.searchParams.get('text'), message);
});

test('redirecionamentos preservam a separação entre perfis e rejeitam destino externo', () => {
  const { postLoginPath, canAccessPath } = load('src/lib/access-control.ts');
  assert.equal(postLoginPath('owner', '/anuncie/propriedade'), '/anuncie/propriedade');
  assert.equal(postLoginPath('customer', '/admin'), '/minhas-viagens');
  assert.equal(postLoginPath('owner', '//externo.example'), '/painel/owner');
  assert.equal(canAccessPath('provider', '/painel/owner/imoveis'), false);
  assert.equal(canAccessPath('admin', '/painel/provider'), true);
});

for (const role of ['owner', 'provider']) test(`organização recuperada corresponde ao perfil ${role} e prioriza o proprietário`, async () => {
  let effect;
  const states = [];
  const memberships = [
    { member_role: 'staff', organization: { id: 'operator-staff', name: 'Passeios', kind: 'operator' } },
    { member_role: 'staff', organization: { id: 'host-staff', name: 'Casa', kind: 'host' } },
    { member_role: 'owner', organization: { id: 'host-owner', name: 'Casa principal', kind: 'host' } },
    { member_role: 'owner', organization: { id: 'operator-owner', name: 'Passeios principal', kind: 'operator' } },
    { member_role: 'owner', organization: null },
  ];
  const sb = {
    auth: { getUser: async () => ({ data: { user: { id: 'fictional', email: 'fixture@example.invalid' } } }) },
    from: (table) => ({ select: () => ({ eq: () => table === 'profiles' ? { single: async () => ({ data: { full_name: 'Fixture', role } }) } : Promise.resolve({ data: memberships }) }) }),
  };
  const hooks = {
    useState: (initial) => { const slot = states.length; states.push(initial); return [initial, (v) => { states[slot] = v; }]; },
    useEffect: (fn) => { effect = fn; },
  };
  const { usePanelUser } = load('src/lib/use-panel-user.ts', {
    react: hooks, './config': { DEMO_MODE: false }, './supabase/client': { getSupabaseBrowserClient: () => sb }, './demo-store': {},
  });
  usePanelUser(); effect();
  await new Promise((done) => setImmediate(done));
  assert.equal(states[0].orgId, role === 'owner' ? 'host-owner' : 'operator-owner');
  assert.equal(states[1], false);
});

test('agenda sem bloqueios continua exigindo confirmação e não libera contato sem datas', () => {
  const { StayInquiryWidget } = load('src/components/booking/InquiryWidgets.tsx', {
    './CalendarMonth': { CalendarMonth: () => React.createElement('div', null, 'Calendário isolado') },
    '@/lib/config': { DEFAULT_WHATSAPP_NUMBER: '5522000000000' },
    './config': { DEFAULT_WHATSAPP_NUMBER: '5522000000000' },
  });
  const props = { name: 'Hospedagem fictícia', blockedDates: [], minNights: 2, capacity: 4, basePriceCents: 10000, priceRules: [] };
  const html = renderToStaticMarkup(React.createElement(StayInquiryWidget, props));
  assert.match(html, /Sem bloqueio na agenda/);
  assert.match(html, /Datas sem bloqueio estão sujeitas à confirmação/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /href="https:\/\/wa.me/);
  const error = renderToStaticMarkup(React.createElement(StayInquiryWidget, { ...props, availabilityError: true }));
  assert.match(error, /Não foi possível carregar a disponibilidade/);
  assert.doesNotMatch(error, /Calendário isolado/);
});
