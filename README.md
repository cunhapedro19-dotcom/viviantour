# Viviantourr 🌊

**Marketplace de turismo multi-fornecedor de Arraial do Cabo, RJ.**

Conecta viajantes, proprietários de hospedagens e prestadores de serviços turísticos
(passeios de barco, escunas, mergulho, experiências) em uma plataforma só — inspirada
no modelo de marketplaces de estadia, com identidade própria.

Três grandes áreas:

| Área | Quem usa | O que faz |
|---|---|---|
| **Marketplace público** | Turistas | Busca, filtros, páginas de anúncio, solicitação de reserva, favoritos, avaliações |
| **Painel do fornecedor** (`/painel`) | Proprietários e prestadores | Anúncios, fotos, tarifas, calendário, iCal, saídas operacionais, reservas, financeiro |
| **Painel Viviantourr** (`/admin`) | Administração master | Aprovações, moderação, todas as reservas, KPIs e comissões |

---

## 🚀 Começando (modo demonstração)

O projeto roda **imediatamente sem nenhuma configuração**, em *modo demonstração*:
dados realistas de Arraial do Cabo, reserva simulada no navegador e perfis de exemplo
para explorar todos os painéis.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

**Para explorar os painéis**, vá em **Entrar** e escolha um perfil demo:

- 🧳 **Viajante** — Ana Costa (solicita e acompanha reservas)
- 🏡 **Proprietário** — Carlos Mendes, Vista Mar Imóveis (imóveis, calendário, iCal)
- ⛵ **Prestador** — Roberto Nunes, Mar Azul Escunas (passeios, saídas, vagas)
- 🛡️ **Administração** — equipe Viviantourr (aprovações e moderação)

> No modo demonstração, reservas criadas no site aparecem nos painéis correspondentes
> (persistência local no navegador). Nada é cobrado; não há e-mails reais.

---

## 🔌 Ativando o modo real (Supabase)

### 1. Crie o projeto

1. Acesse [supabase.com](https://supabase.com) → **New project** (plano free funciona).
2. Guarde a **senha do banco** — não será usada pelo app, apenas para o painel.

### 2. Rode a migração e o seed

No menu lateral: **SQL Editor → New query**.

1. Cole todo o conteúdo de `supabase/migrations/0001_init.sql` e execute (**Run**).
   Cria tabelas, índices, RLS, funções de reserva e o bucket de mídia.
2. Novo query: cole `supabase/migrations/0002_payments.sql` e execute.
   Ativa o fluxo de pagamento: `respond_booking` passa a colocar a reserva em
   *aguardando pagamento* e a RPC `record_payment` confirma quando o cliente paga.
3. Novo query: cole `supabase/migrations/0003_onboarding.sql` e execute.
   Correções de RLS para o primeiro uso: o criador passa a enxergar a própria
   organização (onboarding não falha) e avaliações passam a guardar o nome do autor.
4. Novo query: cole `supabase/migrations/0004_monetization.sql` e execute.
   Cria o modelo de monetização configurável pela equipe em /admin/configuracoes
   (gratuito, comissão por reserva, mensalidade ou híbrido).
5. Novo query: cole `supabase/seed.sql` e execute.
   Cria categorias, comodidades e a regra de comissão padrão (10%).

### 3. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores de
**Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # somente servidor (cron iCal)
CRON_SECRET=uma-senha-aleatoria    # protege a rota de cron (opcional, mas recomendado)
```

Reinicie o servidor (`npm run dev`). O banner de demonstração desaparece e a plataforma
real assume: cadastro, login, anúncios, reservas e RLS.

### 4. Crie o administrador master

Cadastre-se pelo site (`/cadastro`) com o e-mail que será o admin e rode no SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
```

### 5. Autenticação por e-mail (opcional)

Por padrão o Supabase exige confirmação de e-mail. Para testes locais sem e-mail real:
**Authentication → Providers → Email → desative "Confirm email"**.

---

## 💳 Pagamentos

O fluxo ficou assim:

1. **Viajante solicita** → reserva entra como *pendente* (datas ainda livres).
2. **Fornecedor aceita** → datas são bloqueadas e a reserva fica *aguardando pagamento*.
3. **Viajante paga** em `/pagamento/<reserva>` → reserva *confirmada* automaticamente
   e a comissão registrada.

Duas formas de pagamento (a segunda exige configuração):

- **Manual** (padrão, sem nenhuma chave): o cliente confirma o pagamento na própria
  página — útil para acerto direto (Pix, na entrada da hospedagem etc.).
- **Mercado Pago Checkout Pro**: defina `MERCADOPAGO_ACCESS_TOKEN` (server-side, no
  `.env.local` ou na Vercel). O botão de pagamento redireciona para o checkout do
  Mercado Pago e o webhook `/api/webhooks/mercadopago` confirma a reserva
  automaticamente. No painel do Mercado Pago, cadastre a URL de notificação:
  `https://SEU-DOMINIO/api/webhooks/mercadopago`.

> O webhook nunca confia no corpo da requisição: ele reconsulta a API do Mercado Pago
> com o token secreto antes de registrar o pagamento.

---

## 🗺️ Roadmap de fases (status)

| Fase | Escopo | Status |
|---|---|---|
| 1 | Identidade, marketplace e navegação | ✅ Entregue (home, busca com filtros, páginas de anúncio) |
| 2 | Cadastro e autenticação dos usuários | ✅ Entregue (Supabase Auth + papéis + middleware + demo) |
| 3 | Painel de proprietários e prestadores | ✅ Entregue (visão geral, reservas, financeiro, onboarding de organização) |
| 4 | Cadastro e publicação de anúncios | ✅ Entregue (imóveis e passeios, fotos, tarifas, fluxo de aprovação) |
| 5 | Calendários e disponibilidade | ✅ Entregue (bloqueios manuais, iCal de entrada e saída, cron de sincronização) |
| 6 | Sistema de reservas | ✅ Entregue (solicitação → aceitação → confirmação, com controle de concorrência no banco) |
| 7 | Comissões e pagamentos | ✅ Entregue (checkout Mercado Pago ou confirmação manual; comissão na aceitação; confirmação automática da reserva) |
| 8 | Relatórios, notificações e otimizações | 🟡 Parcial (painel admin com KPIs; notificações gravadas no banco; upload de fotos, e-mails e relatórios avançados pendentes) |

---

## 🧱 Arquitetura

```
Next.js 14 (App Router, TypeScript) ── Tailwind CSS
        │
        ├── Supabase Auth (e-mail/senha, perfis via trigger)
        ├── PostgreSQL + Row Level Security (isolamento multi-tenant)
        ├── RPCs de reserva (controle de concorrência no banco)
        ├── Supabase Storage (bucket "media", pronto p/ upload)
        ├── Webhook /api/webhooks/mercadopago (confirmação automática de pagamento)
        └── Cron /api/cron/sync-calendars (iCal de entrada + conclusão de reservas)
```

- **Multi-tenant**: usuários → `organizations` (perfil comercial) → anúncios/reservas.
  Toda consulta é filtrada por RLS; o frontend nunca é a única barreira.
- **Papéis**: `admin`, `owner`, `provider`, `customer` (tabela `profiles`).
- **Reservas sem overbooking**:
  - constraint de exclusão no PostgreSQL impede duas reservas confirmadas sobrepostas
    na mesma hospedagem (`bookings_no_overlap_stays`, usando `btree_gist` + `daterange`);
  - as RPCs usam **advisory locks** e `SELECT … FOR UPDATE` nas saídas;
  - disponibilidade = reservas + bloqueios manuais + eventos iCal.
- **iCal**:
  - *Entrada*: fornecedor cola a URL privada do Airbnb em **Calendário externo (iCal)**.
    O cron (`vercel.json` → a cada 15 min) importa os eventos para `calendar_events`.
    URLs ficam no servidor, nunca expostas. Não há sincronização instantânea nem
    reservas automáticas no Airbnb — limitação inerente ao iCal, assumida no design.
  - *Saída*: cada imóvel tem um `feed_token`; `/api/calendars/<token>` gera ICS com as
    reservas/bloqueios para o anfitrião importar no Airbnb/Booking.
- **Comissões**: regra global → categoria → organização (a mais específica vence).
  Aplicada na aceitação via `respond_booking`, registrada em `commissions`.
- **Pagamentos**: a reserva só é confirmada quando o pagamento é aprovado
  (`record_payment`), via Mercado Pago ou confirmação manual. Cancelar uma reserva
  com pagamento aprovado marca reembolso automaticamente.

### Modelo de dados (principais)

`profiles`, `organizations`, `organization_members`, `provider_profiles`, `categories`,
`amenities`, `properties`, `property_photos`, `property_amenities`, `property_blocks`,
`external_calendars`, `calendar_events`, `vessels`, `services`, `service_media`,
`departures`, `bookings`, `booking_guests`, `payments`, `commission_rules`, `commissions`,
`payouts`, `reviews`, `favorites`, `notifications`, `audit_logs`, `platform_settings`.

---

## 📁 Estrutura do projeto

```
src/
  app/
    (site)/            → marketplace público (home, /buscar, /hospedagem/[slug], /passeio/[slug], /sobre, /anuncie, /entrar, /cadastro, /minhas-viagens, /favoritos, /pagamento/[id])
    painel/            → painel do fornecedor (imóveis, passeios, saídas, reservas, financeiro)
    admin/             → painel Viviantourr (dashboard, fornecedores, anúncios, reservas)
    api/
      cron/sync-calendars/  → sincronização iCal + conclusão de reservas (protegida por CRON_SECRET)
      calendars/[token]/    → feed ICS de disponibilidade por imóvel
      payments/checkout/    → cria a preferência de checkout (Mercado Pago) ou modo manual
      webhooks/mercadopago/ → notificações do Mercado Pago (confirmação automática)
    auth/callback/     → troca de código do Supabase Auth
  components/          → UI (cards, widgets de reserva, calendário, painéis)
  lib/                 → config, tipos, queries (demo/Supabase), iCal, demo-store, ops dos painéis
supabase/
  migrations/0001_init.sql      → schema completo + RLS + funções
  migrations/0002_payments.sql  → fluxo de pagamento (aguardando pagamento + record_payment)
  migrations/0003_onboarding.sql→ correções de RLS (onboarding + autor de avaliações)
  migrations/0004_monetization.sql → modelo de monetização (gratuito/comissão/mensalidade/híbrido)
  seed.sql                      → dados de referência + promoção de admin
scripts/generate-artwork.py → regenera as imagens ilustradas de demonstração
public/img/                 → arte gerada (42 imagens)
```

## 🧪 Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run typecheck    # verificação de tipos
python3 scripts/generate-artwork.py   # regenera a arte de demonstração (requer Pillow)
```

## ☁️ Deploy (Vercel)

> **Por que não GitHub Pages?** O Pages só publica arquivos estáticos. O Viviantourr é
> uma aplicação com servidor (autenticação, reservas, APIs, RLS) — precisa de uma
> plataforma como **Vercel** (gratuita, feita pelos criadores do Next.js).

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório `viviantour`.
2. Em **Environment Variables**, adicione depois as chaves do Supabase (o modo
   demonstração funciona sem nenhuma variável). Para cobrança online, adicione
   também `MERCADOPAGO_ACCESS_TOKEN` (opcional).
3. Clique em **Deploy**. Em ~2 minutos o site estará no ar em `seu-projeto.vercel.app`.
4. No Supabase, adicione o domínio da Vercel em **Authentication → URL Configuration**
   (Site URL e Redirect URLs, ex.: `https://seu-dominio.vercel.app/auth/callback`).

**Sincronização iCal (cron):** automática no backend, diariamente às 09:00 UTC
(06:00 em Brasília), mesmo com o painel fechado. O `vercel.json` mantém o
agendamento compatível com o plano Hobby. A Vercel pode executar dentro da hora
prevista; o horário no painel é uma previsão.

- Aplique `supabase/migrations/0013_calendar_sync.sql` no Supabase.
- Configure `SUPABASE_SERVICE_ROLE_KEY` e um `CRON_SECRET` forte no ambiente do
  servidor, além das variáveis públicas do Supabase. Publique novamente o site.
- A chamada é `GET /api/cron/sync-calendars`, com
  `Authorization: Bearer <CRON_SECRET>`. Sem o segredo, retorna 401.
- O botão opcional `Sincronizar agora` usa a sessão autenticada e as mesmas regras
  de importação da rotina automática. Não é necessário clicar para a rotina rodar.
- Eventos são substituídos atomicamente por calendário e UID; reservas e bloqueios
  manuais ficam em suas tabelas originais. Falhas preservam os períodos anteriores
  e a data da última sincronização bem-sucedida.
- Links `webcal://` são convertidos para HTTPS. O servidor bloqueia destinos de
  rede privada, verifica redirecionamentos, limita a resposta a 5 MB e aplica timeout.
- Feeds inválidos e recorrências (`RRULE`, `RDATE`, `EXDATE`, `RECURRENCE-ID`)
  produzem erro útil sem apagar bloqueios; use eventos individuais para ocupações.
- Para atualizar a cada 15 minutos, use um agendador externo ou Vercel Pro e ajuste
  juntos o cron, o cálculo de `next_sync_at` na RPC `finish_calendar_sync` e
  `nextSyncTime` em `src/lib/calendar-sync.ts`.

Validação: `node --test tests/calendar.test.cjs`, `npm run typecheck` e `npm run build`.

## 🔒 Notas de segurança

- `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e `MERCADOPAGO_ACCESS_TOKEN` **nunca**
  vão para o cliente (sem prefixo `NEXT_PUBLIC_`).
- O webhook do Mercado Pago nunca confia no corpo recebido: reconsulta a API
  oficial antes de registrar o pagamento (via `service_role`).
- Na tabela `payments`, a confirmação de pagamento só acontece pela RPC
  `record_payment` ou pelo webhook — o cliente só pode criar cobranças pendentes.
- Inserção/atualização direta em `bookings` é bloqueada por RLS — só as RPCs
  escrevem reservas, com validação de disponibilidade no banco.
- URLs de calendário iCal ficam em `external_calendars` e só são visíveis ao
  proprietário da organização (política de RLS dedicada).
- A promoção para `admin` é feita manualmente via SQL, nunca pelo frontend.

## 🎨 Identidade

Paleta: azul-oceano (`oceano`), turquesa (`turquesa`), areia (`areia`) e navy (`tinta`).
Tipografia: **Fraunces** (títulos) + **Manrope** (interface). Mobile-first.

---

Feito com carinho para o turismo de Arraial do Cabo. Bons ventos! ⛵
#   v i v i a n t o u r  
 