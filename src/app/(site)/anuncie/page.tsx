import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/Artwork";

export const metadata: Metadata = {
  title: "Seja um parceiro Viviantourr",
  description:
    "Apresente sua hospedagem à curadoria Viviantourr. Envie as informações e fotos da propriedade para análise da Vivian.",
};

const steps = [
  {
    title: "1. Crie sua conta de proprietário",
    description:
      "Informe seus dados para acessar a plataforma e acompanhar sua solicitação.",
  },
  {
    title: "2. Envie sua propriedade",
    description:
      "Preencha o formulário com as informações da hospedagem, comodidades e fotos. Você não precisa montar o anúncio sozinho.",
  },
  {
    title: "3. Aguarde a análise da Vivian",
    description:
      "A equipe vai avaliar o material e falar com você pelo WhatsApp. A propriedade só será publicada após a aprovação e o alinhamento dos detalhes.",
  },
];

export default function AnunciePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <Artwork seed="hero-1" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-oceano-950/75 to-oceano-900/40" />
        <div className="container-x relative py-20">
          <p className="kicker text-turquesa-300">Para proprietários</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl font-semibold leading-tight text-white">
            Apresente sua hospedagem à curadoria Viviantourr
          </h1>
          <p className="mt-4 max-w-xl text-oceano-100">
            Envie as informações e as fotos da sua propriedade. A Vivian vai analisar o material e
            entrar em contato com você.
          </p>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="card p-6">
              <h2 className="font-display text-lg font-semibold text-tinta">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-tinta-mute">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-areia-100 p-8">
          <h2 className="section-title text-xl">O que acontece depois do envio?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-tinta-soft">
            A curadoria vai conferir as informações e as fotos, tirar dúvidas com você e alinhar os
            detalhes da hospedagem. Se a propriedade for aprovada, a equipe ajuda a preparar o anúncio
            para publicação no site.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/cadastro?role=owner&next=%2Fanuncie%2Fpropriedade" className="btn-primary">
            Enviar minha propriedade para análise
          </Link>
          <p className="mt-3 text-xs text-tinta-mute">
            Dúvidas? Fale com a gente: contato@viviantourr.com.br
          </p>
        </div>
      </section>
    </div>
  );
}
