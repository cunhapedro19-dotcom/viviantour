import Link from "next/link";
import { Artwork } from "@/components/Artwork";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/site/SearchBar";
import { HeroVideo } from "@/components/site/HeroVideo";
import { CadasturTrust } from "@/components/site/CadasturTrust";
import { StarRating } from "@/components/StarRating";
import { DEMO_MODE } from "@/lib/config";
import { stayToCard, tourToCard } from "@/lib/card";
import { getHomeData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { label: "Prainhas do Pontal", href: "/buscar?q=pontal" },
  { label: "Passeio de escuna", href: "/buscar?categoria=escuna" },
  { label: "Mergulho", href: "/buscar?categoria=mergulho" },
  { label: "Bate e volta", href: "/buscar?tipo=tour&categoria=bate-e-volta" },
  { label: "Pé na areia", href: "/buscar?tipo=stay&beachfront=true" },
  { label: "Pôr do sol", href: "/buscar?q=p%C3%B4r+do+sol" },
];

export default async function HomePage() {
  const { stays, tours, categories, regions } = await getHomeData();

  const stayCards = stays.slice(0, 4).map(stayToCard);
  // A ordem da consulta não define o tipo do serviço. Separar pelo formato evita
  // que, por exemplo, um passeio de buggy apareça na vitrine de embarcações.
  const boatTourCards = tours.filter((tour) => tour.kind === "boat_tour").slice(0, 4).map(tourToCard);
  const experienceCards = tours.filter((tour) => tour.kind !== "boat_tour").slice(0, 4).map(tourToCard);
  const stayCategorySlugs = new Set(stays.map((stay) => stay.categorySlug));
  const tourCategorySlugs = new Set(tours.map((tour) => tour.categorySlug));
  const stayCategories = categories.filter((c) => c.kind === "stay" && stayCategorySlugs.has(c.slug));
  const tourCategories = categories.filter((c) => c.kind === "tour" && tourCategorySlugs.has(c.slug));
  const visibleCategories = [...stayCategories, ...tourCategories];

  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[650px] overflow-hidden sm:min-h-[700px] lg:min-h-[720px]">
        <HeroVideo />
        <div className="absolute inset-0 bg-gradient-to-b from-oceano-950/30 via-transparent to-oceano-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_48%,rgba(7,30,44,0.78)_0%,rgba(7,30,44,0.48)_34%,transparent_68%)]" />
        <div className="container-x relative flex min-h-[650px] flex-col items-center justify-center gap-5 py-20 text-center sm:min-h-[700px] sm:gap-6 sm:py-24 lg:min-h-[720px] lg:items-start lg:text-left">
          <p className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-oceano-950/25 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-turquesa-200 backdrop-blur-sm sm:px-4 sm:text-xs sm:tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-turquesa-300 shadow-[0_0_12px_rgba(120,212,200,0.9)]" />
            Arraial do Cabo · Rio de Janeiro
          </p>
          <h1 className="w-full max-w-4xl text-balance font-display text-[2.3rem] font-medium leading-[1.03] tracking-[-0.035em] text-white drop-shadow-[0_2px_18px_rgba(7,30,44,0.28)] sm:text-6xl lg:max-w-3xl lg:text-7xl">
            Sua viagem para <span className="font-semibold italic text-turquesa-200">Arraial do Cabo</span> começa aqui na Vívian Tour
          </h1>
          <p className="w-full max-w-2xl text-pretty text-base font-medium leading-relaxed text-white/90 drop-shadow-sm sm:text-lg lg:max-w-xl">
            Hospedagens selecionadas, passeios de barco e experiências com a melhor agência de turismo de Arraial do Cabo.
          </p>
          <div className="w-full max-w-2xl lg:max-w-3xl">
            <SearchBar />
          </div>
          <div className="flex max-w-3xl flex-wrap items-center justify-center gap-2 lg:justify-start">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full border border-white/30 bg-oceano-950/20 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:border-turquesa-200/70 hover:bg-white/15"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="container-x py-5 sm:py-6">
        <h2 className="section-title mb-3 text-2xl sm:text-3xl">Explore por categoria</h2>
        <div className="flex flex-wrap gap-2.5">
          {[...stayCategories, ...tourCategories].map((c) => (
              <CategoryTile
                key={`${c.kind}-${c.id}`}
                slug={c.slug}
                label={c.label}
                icon={c.icon}
                kind={c.kind}
              />
          ))}
          <Link
            href="/combos"
            className="group inline-flex items-center gap-2 rounded-full border border-areia-200 bg-white px-3 py-2 text-center shadow-card transition hover:-translate-y-0.5 hover:border-turquesa-300 hover:shadow-pop sm:px-3.5"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-oceano-50 text-sm transition group-hover:bg-turquesa-50">
              🎁
            </span>
            <span className="text-xs font-semibold leading-tight text-tinta-soft group-hover:text-oceano-700">Combos</span>
          </Link>
        </div>
      </section>

      {/* HOSPEDAGENS EM DESTAQUE */}
      <section className="container-x py-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="kicker">Fique bem alojado</p>
            <h2 className="section-title">Hospedagens em destaque</h2>
          </div>
          {stayCards.length > 0 && (
            <Link href="/buscar?tipo=stay" className="btn-outline btn-sm hidden sm:inline-flex">
              Ver todas
            </Link>
          )}
        </div>
        {stayCards.length === 0 ? (
          <EmptyListings
            title="Primeiras hospedagens chegando"
            text="Estamos de portas abertas para proprietários de Arraial do Cabo. Em breve você encontra casas, pousadas e flats aqui."
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stayCards.map((card) => (
                <ListingCard key={card.id} data={card} />
              ))}
            </div>
            <Link href="/buscar?tipo=stay" className="btn-outline btn-sm mt-5 inline-flex sm:hidden">
              Ver todas as hospedagens
            </Link>
          </>
        )}
      </section>

      {regions.length > 0 && (
        <section className="container-x py-10">
          <p className="kicker">Escolha sua localização</p>
          <h2 className="section-title mb-5">Hospedagens por região</h2>
          <div className="flex flex-wrap gap-3">
            {regions.map((region) => <Link key={region.key} href={`/buscar?tipo=stay&regiao=${encodeURIComponent(region.key)}`} className="btn-outline">{region.label}</Link>)}
          </div>
        </section>
      )}

      {/* PASSEIOS DE BARCO */}
      <section className="bg-white py-14">
        <div className="container-x">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="kicker">Navegue conosco</p>
              <h2 className="section-title">Passeios de barco</h2>
            </div>
            {boatTourCards.length > 0 && (
              <Link href="/buscar?tipo=tour" className="btn-outline btn-sm hidden sm:inline-flex">
                Ver todos
              </Link>
            )}
          </div>
          {boatTourCards.length === 0 ? (
            <EmptyListings
              title="Primeiros passeios chegando"
              text="Escunas, speedboats, mergulho e experiências com operadores locais — em breve no ar."
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {boatTourCards.map((card) => (
                  <ListingCard key={card.id} data={card} />
                ))}
              </div>
              <Link href="/buscar?tipo=tour" className="btn-outline btn-sm mt-5 inline-flex sm:hidden">
                Ver todos os passeios
              </Link>
            </>
          )}
        </div>
      </section>

      {/* EXPERIÊNCIAS */}
      {experienceCards.length > 0 && (
        <section className="container-x py-14">
          <p className="kicker">Viva Arraial</p>
          <h2 className="section-title mb-6">Experiências turísticas</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {experienceCards.map((card) => (
              <ListingCard key={card.id} data={card} />
            ))}
          </div>
        </section>
      )}

      {/* POR QUE VIVIANTOURR */}
      <section className="bg-areia-100 py-14">
        <div className="container-x">
          <div className="grid gap-8 md:grid-cols-3">
            {[
            {
              title: "Fornecedores locais verificados",
              text: "Todo proprietário e operador passa pela aprovação da Viviantourr antes de publicar. Você reserva com quem vive e cuida de Arraial.",
              icon: (
                <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm-1.2 12.6l5-5-1.4-1.4-3.6 3.6-1.8-1.8-1.4 1.4 3.2 3.2z" />
              ),
            },
            {
              title: "Atendimento direto pelo WhatsApp",
              text: "Escolha a hospedagem ou passeio, informe os detalhes principais e envie o pedido pronto para a equipe confirmar com você.",
              icon: <path d="M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2zm3 5h10v2H7V9zm0 4h6v2H7v-2z" />,
            },
            {
              title: "Experiências locais selecionadas",
              text: "Conheça opções de hospedagem, passeios e experiências de quem vive e trabalha em Arraial do Cabo.",
              icon: (
                <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.7 1.2 4.8 2.7l1 1.4 1-1.4c1.1-1.5 2.6-2.7 4.8-2.7 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z" />
              ),
            },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white shadow-card">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-turquesa-500">
                    {f.icon}
                  </svg>
                </span>
                <div>
                  <h3 className="font-semibold text-tinta">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-tinta-mute">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
          <CadasturTrust variant="home" />
        </div>
      </section>

      {/* DEPOIMENTOS — apenas na demonstração; na plataforma real só aparecem avaliações verdadeiras */}
      {DEMO_MODE && (
        <section className="container-x py-14">
          <p className="kicker">Quem viveu, recomenda</p>
          <h2 className="section-title mb-8">Avaliações reais de viajantes</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                name: "Marina S.",
                context: "Hóspede · Casa Vista Atalaia",
                text: "Casa impecável e as fotos nem fazem justiça à vista. A piscina ao pôr do sol é um espetáculo. Voltaremos com certeza!",
              },
              {
                name: "Natália E.",
                context: "Mergulhadora · Gruta Azul",
                text: "Nunca havia mergulhado e me senti 100% segura. O fundo da Gruta Azul é de outro planeta.",
              },
              {
                name: "Helena P.",
                context: "Hóspede · Pousada Recanto do Atalaia",
                text: "O café da manhã vale o preço da estadia! Todo mundo tratando a gente como família.",
              },
            ].map((t) => (
              <figure key={t.name} className="card flex h-full flex-col gap-3 p-6">
                <StarRating rating={5} />
                <blockquote className="flex-1 text-sm leading-relaxed text-tinta-soft">“{t.text}”</blockquote>
                <figcaption>
                  <p className="text-sm font-semibold text-tinta">{t.name}</p>
                  <p className="text-xs text-tinta-mute">{t.context}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* CTA PARCEIROS */}
      <section className="container-x pb-4">
        <div className="relative overflow-hidden rounded-4xl bg-oceano-800 px-6 py-12 text-center sm:px-12 sm:py-16">
          <Artwork seed="hero-2" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold text-white sm:text-4xl">
              Tem um imóvel, embarcação ou experiência em Arraial?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-oceano-100">
              Crie sua conta de fornecedor, publique seus anúncios e gerencie reservas, agenda e
              faturamento em um painel só. A Viviantourr cuida da visibilidade.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/cadastro" className="btn-turquesa">
                Quero anunciar
              </Link>
              <Link href="/anuncie" className="btn border border-white/40 text-white hover:bg-white/10">
                Saiba como funciona
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyListings({ title, text }: { title: string; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-oceano-50 text-2xl">🌊</span>
      <h3 className="font-display text-lg font-semibold text-tinta">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-tinta-mute">{text}</p>
      <Link href="/anuncie" className="btn-outline btn-sm mt-1">
        Quero anunciar
      </Link>
    </div>
  );
}

function CategoryTile({
  slug,
  label,
  icon,
  kind,
}: {
  slug: string;
  label: string;
  icon?: string | null;
  kind: "stay" | "tour";
}) {
  return (
    <Link
      href={`/buscar?tipo=${kind}&categoria=${slug}`}
      className="group inline-flex items-center gap-2 rounded-full border border-areia-200 bg-white px-3 py-2 text-center shadow-card transition hover:-translate-y-0.5 hover:border-turquesa-300 hover:shadow-pop sm:px-3.5"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-oceano-50 text-sm transition group-hover:bg-turquesa-50">
        {categoryIcon(icon)}
      </span>
      <span className="text-xs font-semibold leading-tight text-tinta-soft group-hover:text-oceano-700">{label}</span>
    </Link>
  );
}

function categoryIcon(icon?: string | null) {
  switch (icon) {
    case "sailboat":
      return "⛵";
    case "droplet":
      return "🤿";
    case "compass":
      return "🧭";
    case "map":
      return "🗺️";
    case "bus":
      return "🚌";
    case "fish":
      return "🎣";
    case "waves":
      return "🌊";
    case "building":
      return "🏢";
    default:
      return "🏠";
  }
}
