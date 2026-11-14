import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/Artwork";

export const metadata: Metadata = {
  title: "Seja um parceiro Viviantourr",
  description:
    "Anuncie sua hospedagem, embarcação ou experiência turística em Arraial do Cabo com painel próprio, calendário e gestão de reservas.",
};

export default function AnunciePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <Artwork seed="hero-1" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-oceano-950/75 to-oceano-900/40" />
        <div className="container-x relative py-20">
          <p className="kicker text-turquesa-300">Para fornecedores</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-white">
            Sua operação, seu painel — a visibilidade é por nossa conta
          </h1>
          <p className="mt-4 max-w-xl text-oceano-100">
            Hospedagens, embarcações, passeios e experiências: publique em minutos e gerencie tudo
            em um lugar só.
          </p>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "1. Crie sua conta",
              d: "Escolha o perfil de Proprietário (hospedagens) ou Prestador de serviços (passeios, embarcações e experiências). O cadastro comercial é aprovado pela curadoria Viviantourr.",
            },
            {
              t: "2. Publique seus anúncios",
              d: "Fotos, descrições, comodidades, tarifas, regras, capacidade e calendário. Operadores criam saídas com datas, horários e vagas controladas.",
            },
            {
              t: "3. Receba e gerencie reservas",
              d: "Solicitações chegam no seu painel com notificação. Aceite, recuse ou cancele — e acompanhe faturamento e comissões em tempo real.",
            },
          ].map((s) => (
            <div key={s.t} className="card p-6">
              <h2 className="font-display text-lg font-semibold text-tinta">{s.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-tinta-mute">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <h2 className="section-title text-xl">Para proprietários</h2>
            <ul className="mt-4 space-y-3 text-sm text-tinta-soft">
              <li className="flex gap-2.5">
                <Check /> Cadastro ilimitado de imóveis na mesma conta
              </li>
              <li className="flex gap-2.5">
                <Check /> Calendário com bloqueios manuais e tarifas por temporada
              </li>
              <li className="flex gap-2.5">
                <Check /> Sincronização iCal com o Airbnb (e outros calendários) — URLs privadas, protegidas no servidor
              </li>
              <li className="flex gap-2.5">
                <Check /> Histórico de hóspedes e avaliações
              </li>
            </ul>
          </div>
          <div className="card p-7">
            <h2 className="section-title text-xl">Para operadores e guias</h2>
            <ul className="mt-4 space-y-3 text-sm text-tinta-soft">
              <li className="flex gap-2.5">
                <Check /> Cadastro de embarcações e passeios com roteiro e ponto de embarque
              </li>
              <li className="flex gap-2.5">
                <Check /> Agenda operacional: saídas, capacidade, bloqueios e preço por saída
              </li>
              <li className="flex gap-2.5">
                <Check /> Controle de vagas em tempo real, sem overbooking
              </li>
              <li className="flex gap-2.5">
                <Check /> Lista de passageiros por saída
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-3xl bg-areia-100 p-8">
          <h2 className="section-title text-xl">Comissão transparente</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-tinta-soft">
            A Viviantourr cobra uma comissão padrão de <strong>10%</strong> sobre cada reserva
            confirmada — sem mensalidade, sem taxa de publicação. A regra pode variar por categoria
            ou por acordo comercial com fornecedores, e sempre aparece discriminada no seu painel
            financeiro: valor bruto, comissão e valor líquido.
          </p>
          <p className="mt-3 max-w-3xl text-xs text-tinta-mute">
            Pagamentos online e repasses automáticos serão habilitados em uma fase seguinte, com
            gateway parceiro e divisão de recebíveis. Até lá, o combinado financeiro é feito
            diretamente entre você e o cliente, com todo o registro salvo na plataforma.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/cadastro" className="btn-primary">
            Criar minha conta de fornecedor
          </Link>
          <p className="mt-3 text-xs text-tinta-mute">
            Dúvidas? Fale com a gente: contato@viviantourr.com.br
          </p>
        </div>
      </section>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 fill-turquesa-500">
      <path d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zm4 6.6l-5 5-3-3 1.4-1.4 1.6 1.6 3.6-3.6L14 8.1z" />
    </svg>
  );
}
