import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/Artwork";

export const metadata: Metadata = {
  title: "Sobre a Viviantourr",
  description:
    "A Viviantourr é o marketplace de turismo de Arraial do Cabo: conecta viajantes, proprietários e prestadores de serviços em uma plataforma só.",
};

export default function SobrePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <Artwork seed="hero-2" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-oceano-950/60" />
        <div className="container-x relative py-20 text-center">
          <p className="kicker text-turquesa-300">Nossa história</p>
          <h1 className="mx-auto mt-2 max-w-2xl font-display text-4xl font-semibold text-white">
            O paraíso organiza melhor quando quem vive aqui conduz
          </h1>
        </div>
      </section>

      <section className="container-x prose-content mx-auto max-w-3xl py-12">
        <p className="text-lg">
          A <strong>Viviantourr</strong> nasceu em Arraial do Cabo com um objetivo simples: organizar
          o melhor destino da Região dos Lagos em uma única plataforma, valorizando quem produz o
          turismo local. Em vez de um site institucional, construímos um{" "}
          <strong>marketplace multi-fornecedor</strong>: cada proprietário e cada operador tem conta
          própria, painel exclusivo e controle total dos seus anúncios, agenda, reservas e
          faturamento.
        </p>
        <p>
          A Viviantourr é a marca central que administra o ecossistema — aprova fornecedores, modera
          avaliações, define as regras comerciais e cuida da experiência de quem visita. E foi
          desenhada para crescer: amanhã, o mesmo sistema pode servir a outras regiões.
        </p>

        <div className="my-10 grid gap-5 sm:grid-cols-3">
          {[
            { n: "1", t: "Marketplace", d: "Viajantes pesquisam, comparam e solicitam reservas com informações claras e avaliações reais." },
            { n: "2", t: "Painel do fornecedor", d: "Proprietários e operadores gerenciam anúncios, calendários (inclusive iCal do Airbnb), saídas e reservas." },
            { n: "3", t: "Administração central", d: "A Viviantourr aprova cadastros, acompanha a operação e garante a qualidade do ecossistema." },
          ].map((c) => (
            <div key={c.n} className="card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-turquesa-500 font-bold text-white">
                {c.n}
              </span>
              <h3 className="mt-3 font-semibold text-tinta">{c.t}</h3>
              <p className="mt-1 text-sm text-tinta-mute">{c.d}</p>
            </div>
          ))}
        </div>

        <h2 className="section-title text-2xl">Como funciona para viajantes</h2>
        <p>
          Você pesquisa hospedagens e passeios, escolhe as datas (ou a saída do passeio), envia uma
          solicitação e acompanha cada etapa — pendente, confirmada, concluída. O fornecedor tem 24
          horas para responder. Só quem viveu a experiência avalia.
        </p>

        <h2 className="section-title mt-10 text-2xl">Como funciona para fornecedores</h2>
        <p>
          Proprietários cadastram imóveis com fotos, tarifas, comodidades e regras — e conectam o
          calendário do Airbnb por URL privada (iCal) para evitar conflitos de datas. Operadores
          cadastram embarcações, criam saídas com capacidade e preços, e acompanham as vagas em
          tempo real. A comissão da plataforma é transparente e configurável por categoria.
        </p>

        <div className="mt-10 rounded-3xl bg-oceano-800 p-8 text-white">
          <h2 className="font-display text-2xl font-semibold">Quer fazer parte?</h2>
          <p className="mt-2 text-oceano-100">
            Se você tem um imóvel, uma embarcação ou conduz experiências em Arraial do Cabo, crie
            sua conta de fornecedor. A curadoria é nossa, a gestão é sua.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/cadastro" className="btn-turquesa">Criar conta de fornecedor</Link>
            <Link href="/anuncie" className="btn border border-white/40 text-white hover:bg-white/10">
              Entender as regras
            </Link>
          </div>
        </div>
      </section>

      {/* GUIA SUPABASE (modo demonstração) */}
      <section id="supabase" className="border-t border-areia-200 bg-areia-100 py-12">
        <div className="container-x mx-auto max-w-3xl">
          <p className="kicker">Modo demonstração</p>
          <h2 className="section-title mt-1 mb-4">Ativando a plataforma real com Supabase</h2>
          <p className="text-sm leading-relaxed text-tinta-soft">
            Este app está rodando com dados de demonstração. Para ativar contas, anúncios e reservas
            reais: (1) crie um projeto gratuito em supabase.com; (2) abra o SQL Editor e execute os
            arquivos <code className="rounded bg-white px-1.5 py-0.5">supabase/migrations/0001_init.sql</code>{" "}
            e <code className="rounded bg-white px-1.5 py-0.5">supabase/seed.sql</code>; (3) copie as
            chaves do projeto para o arquivo <code className="rounded bg-white px-1.5 py-0.5">.env.local</code>{" "}
            (use o <code className="rounded bg-white px-1.5 py-0.5">.env.example</code> como modelo);
            (4) reinicie o servidor. O guia completo está no README do projeto.
          </p>
        </div>
      </section>
    </div>
  );
}
