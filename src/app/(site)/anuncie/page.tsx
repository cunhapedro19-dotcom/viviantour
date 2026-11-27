import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/Artwork";
import {
  MONETIZATION_DESCRIPTION,
  MONETIZATION_LABEL,
  modelAppliesCommission,
  modelAppliesMonthlyFee,
} from "@/lib/monetization";
import { fetchMonetizationServer } from "@/lib/monetization-server";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Seja um parceiro Viviantourr",
  description:
    "Anuncie sua hospedagem, embarca��o ou experi�ncia tur�stica em Arraial do Cabo com painel pr�prio, calend�rio e gest�o de reservas.",
};

export default async function AnunciePage() {
  const monetization = await fetchMonetizationServer();

  return (
    <div>
      <section className="relative overflow-hidden">
        <Artwork seed="hero-1" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-oceano-950/75 to-oceano-900/40" />
        <div className="container-x relative py-20">
          <p className="kicker text-turquesa-300">Para fornecedores</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-white">
            Sua opera��o, seu painel - a visibilidade � por nossa conta
          </h1>
          <p className="mt-4 max-w-xl text-oceano-100">
            Hospedagens, embarca��es, passeios e experi�ncias: publique em minutos e gerencie tudo
            em um lugar s�.
          </p>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "1. Crie sua conta",
              d: "Escolha o perfil de Propriet�rio (hospedagens) ou Prestador de servi�os (passeios, embarca��es e experi�ncias). O cadastro comercial � aprovado pela curadoria Viviantourr.",
            },
            {
              t: "2. Publique seus an�ncios",
              d: "Fotos, descri��es, comodidades, tarifas, regras, capacidade e calend�rio. Operadores criam sa�das com datas, hor�rios e vagas controladas.",
            },
            {
              t: "3. Receba e gerencie reservas",
              d: "Solicita��es chegam no seu painel com notifica��o. Aceite, recuse ou cancele - e acompanhe faturamento e comiss�es em tempo real.",
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
            <h2 className="section-title text-xl">Para propriet�rios</h2>
            <ul className="mt-4 space-y-3 text-sm text-tinta-soft">
              <li className="flex gap-2.5">
                <Check /> Cadastro ilimitado de im�veis na mesma conta
              </li>
              <li className="flex gap-2.5">
                <Check /> Calend�rio com bloqueios manuais e tarifas por temporada
              </li>
              <li className="flex gap-2.5">
                <Check /> Sincroniza��o iCal com o Airbnb (e outros calend�rios) - URLs privadas, protegidas no servidor
              </li>
              <li className="flex gap-2.5">
                <Check /> Hist�rico de h�spedes e avalia��es
              </li>
            </ul>
          </div>
          <div className="card p-7">
            <h2 className="section-title text-xl">Para operadores e guias</h2>
            <ul className="mt-4 space-y-3 text-sm text-tinta-soft">
              <li className="flex gap-2.5">
                <Check /> Cadastro de embarca��es e passeios com roteiro e ponto de embarque
              </li>
              <li className="flex gap-2.5">
                <Check /> Agenda operacional: sa�das, capacidade, bloqueios e pre�o por sa�da
              </li>
              <li className="flex gap-2.5">
                <Check /> Controle de vagas em tempo real, sem overbooking
              </li>
              <li className="flex gap-2.5">
                <Check /> Lista de passageiros por sa�da
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-3xl bg-areia-100 p-8">
          <h2 className="section-title text-xl">{MONETIZATION_LABEL[monetization.model]}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-tinta-soft">
            {MONETIZATION_DESCRIPTION[monetization.model]}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-tinta-soft">
            {modelAppliesCommission(monetization.model) && (
              <>
                Comiss�o vigente: <strong>{monetization.percent}%</strong> sobre cada reserva
                confirmada
                {modelAppliesMonthlyFee(monetization.model) && <> � </>}
              </>
            )}
            {modelAppliesMonthlyFee(monetization.model) && (
              <>
                Mensalidade:{" "}
                <strong>
                  {formatBRL(monetization.monthlyFeeCents)}
                </strong>{" "}
                por m�s
              </>
            )}
            {monetization.model === "free" && (
              <>Sem comiss�o, sem mensalidade, sem taxa de publica��o.</>
            )}
            {monetization.model !== "free" && (
              <>
                {" "}
                A regra pode variar por acordo comercial com fornecedores, e sempre aparece
                discriminada no seu painel financeiro: valor bruto, comiss�o e valor l�quido.
              </>
            )}
          </p>
          <p className="mt-3 max-w-3xl text-xs text-tinta-mute">
            Pagamentos online e repasses autom�ticos ser�o habilitados em uma fase seguinte, com
            gateway parceiro e divis�o de receb�veis. At� l�, o combinado financeiro � feito
            diretamente entre voc� e o cliente, com todo o registro salvo na plataforma.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/cadastro?role=owner&next=%2Fanuncie%2Fpropriedade" className="btn-primary">
            Enviar minha propriedade para an�lise
          </Link>
          <p className="mt-3 text-xs text-tinta-mute">
            D�vidas? Fale com a gente: contato@viviantourr.com.br
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

