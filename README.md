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
2. Novo query: cole `supabase/seed.sql` e execute.
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

## 🗺️ Roadmap de fases (status)

| Fase | Escopo | Status |
|---|---|---|
| 1 | Identidade, marketplace e navegação | ✅ Entregue (home, busca com filtros, páginas de anúncio) |
| 2 | Cadastro e autenticação dos usuários | ✅ Entregue (Supabase Auth + papéis + middleware + demo) |
| 3 | Painel de proprietários e prestadores | ✅ Entregue (visão geral, reservas, financeiro, onboarding de organização) |
| 4 | Cadastro e publicação de anúncios | ✅ Entregue (imóveis e passeios, fotos, tarifas, fluxo de aprovação) |
| 5 | Calendários e disponibilidade | ✅ Entregue (bloqueios manuais, iCal de entrada e saída, cron de sincronização) |
| 6 | Sistema de reservas | ✅ Entregue (solicitação → aceitação → confirmação, com controle de concorrência no banco) |
| 7 | Comissões e pagamentos | 🟡 Fundação pronta (regras de comissão ativas; gateway/split na próxima etapa) |
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
  Aplicada na confirmação via `respond_booking`, registrada em `commissions`.

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
    (site)/            → marketplace público (home, /buscar, /hospedagem/[slug], /passeio/[slug], /sobre, /anuncie, /entrar, /cadastro, /minhas-viagens, /favoritos)
    painel/            → painel do fornecedor (imóveis, passeios, saídas, reservas, financeiro)
    admin/             → painel Viviantourr (dashboard, fornecedores, anúncios, reservas)
    api/
      cron/sync-calendars/  → sincronização iCal + conclusão de reservas (protegida por CRON_SECRET)
      calendars/[token]/    → feed ICS de disponibilidade por imóvel
    auth/callback/     → troca de código do Supabase Auth
  components/          → UI (cards, widgets de reserva, calendário, painéis)
  lib/                 → config, tipos, queries (demo/Supabase), iCal, demo-store, ops dos painéis
supabase/
  migrations/0001_init.sql  → schema completo + RLS + funções
  seed.sql                  → dados de referência + promoção de admin
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
   demonstração funciona sem nenhuma variável).
3. Clique em **Deploy**. Em ~2 minutos o site estará no ar em `seu-projeto.vercel.app`.
4. No Supabase, adicione o domínio da Vercel em **Authentication → URL Configuration**
   (Site URL e Redirect URLs, ex.: `https://seu-dominio.vercel.app/auth/callback`).

**Sincronização iCal (cron):** no plano gratuito da Vercel o cron roda 1× ao dia —
o `vercel.json` já está configurado assim (`0 9 * * *`). Para sincronizar a cada 15
minutos de graça, cadastre a URL `/api/cron/sync-calendars` (com header
`Authorization: Bearer <CRON_SECRET>`) em um serviço como o cron-job.org, ou faça
upgrade do plano Vercel e mude o schedule de volta para `*/15 * * * *`.

## 🔒 Notas de segurança

- `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` **nunca** vão para o cliente
  (sem prefixo `NEXT_PUBLIC_`).
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