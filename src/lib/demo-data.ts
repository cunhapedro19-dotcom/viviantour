// ============================================================================
// DADOS DE DEMONSTRAÇÃO — Viviantourr
// Conteúdo realista de Arraial do Cabo / RJ para o modo demonstração.
// Também serve de referência editorial para o conteúdo real da plataforma.
// ============================================================================

import { addDays } from "date-fns";
import type {
  Category,
  Departure,
  Organization,
  PropertyBlock,
  Review,
  Stay,
  Tour,
} from "./types";

export const demoOrganizations: Organization[] = [
  {
    id: "org-host-1",
    name: "Vista Mar Imóveis",
    slug: "vista-mar-imoveis",
    kind: "host",
    status: "active",
    bio: "Casas e coberturas selecionadas nas melhores localizações de Arraial do Cabo.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
  {
    id: "org-host-2",
    name: "Pousadas do Pontal",
    slug: "pousadas-do-pontal",
    kind: "host",
    status: "active",
    bio: "Hospitalidade à beira-mar com o conforto de casa.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
  {
    id: "org-op-1",
    name: "Mar Azul Escunas",
    slug: "mar-azul-escunas",
    kind: "operator",
    status: "active",
    bio: "Escunas e lanchas para os passeios mais bonitos da Região dos Lagos.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
  {
    id: "org-op-2",
    name: "Atalaia Divers",
    slug: "atalaia-divers",
    kind: "operator",
    status: "active",
    bio: "Mergulho, experiências náuticas e aventuras guiadas por profissionais.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
  {
    id: "org-host-3",
    name: "Pousada Bella Vista",
    slug: "pousada-bella-vista",
    kind: "host",
    status: "pending",
    bio: "Novo fornecedor aguardando aprovação da curadoria Viviantourr.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
  {
    id: "org-op-3",
    name: "Arraial Speedboats",
    slug: "arraial-speedboats",
    kind: "operator",
    status: "pending",
    bio: "Novo operador náutico aguardando aprovação da curadoria Viviantourr.",
    city: "Arraial do Cabo",
    state: "RJ",
  },
];

export const demoCategories: Category[] = [
  { id: "cat-casa", slug: "casa", label: "Casas", kind: "stay", icon: "home" },
  { id: "cat-apto", slug: "apartamento", label: "Apartamentos", kind: "stay", icon: "building" },
  { id: "cat-cobertura", slug: "cobertura", label: "Coberturas", kind: "stay", icon: "building" },
  { id: "cat-pousada", slug: "pousada", label: "Pousadas", kind: "stay", icon: "home" },
  { id: "cat-loft", slug: "loft", label: "Lofts", kind: "stay", icon: "home" },
  { id: "cat-flat", slug: "flat-pe-na-areia", label: "Pé na areia", kind: "stay", icon: "waves" },
  { id: "cat-barco", slug: "passeio-de-barco", label: "Passeios de barco", kind: "tour", icon: "sailboat" },
  { id: "cat-escuna", slug: "escuna", label: "Escunas", kind: "tour", icon: "sailboat" },
  { id: "cat-mergulho", slug: "mergulho", label: "Mergulho", kind: "tour", icon: "droplet" },
  { id: "cat-nautica", slug: "experiencia-nautica", label: "Experiências náuticas", kind: "tour", icon: "compass" },
  { id: "cat-bate-volta", slug: "bate-e-volta", label: "Bate e volta", kind: "tour", icon: "bus" },
  { id: "cat-citytour", slug: "city-tour", label: "City tours", kind: "tour", icon: "map" },
  { id: "cat-quadriciclo", slug: "quadriciclo", label: "Quadriciclo", kind: "tour", icon: "mountain" },
  { id: "cat-jet-casal", slug: "jet-ski-casal", label: "Jet ski casal", kind: "tour", icon: "waves" },
  { id: "cat-jet-individual", slug: "jet-ski-individual", label: "Jet ski individual", kind: "tour", icon: "waves" },
  { id: "cat-buggy-arubinha", slug: "buggy-arubinha", label: "Buggy Arubinha", kind: "tour", icon: "car" },
  { id: "cat-buggy-arraial", slug: "buggy-arraial-do-cabo", label: "Buggy Arraial do Cabo", kind: "tour", icon: "car" },
  { id: "cat-paramotor", slug: "paramotor", label: "Paramotor", kind: "tour", icon: "wind" },
  { id: "cat-mergulho-cilindro", slug: "mergulho-de-cilindro", label: "Mergulho de cilindro", kind: "tour", icon: "droplet" },
];

const CITY = "Arraial do Cabo";
const ST = "RJ";

export const demoStays: Stay[] = [
  {
    id: "stay-1",
    slug: "casa-vista-atalaia",
    name: "Casa Vista Atalaia com piscina",
    summary: "Casa ampla com vista para as Prainhas do Pontal e piscina privativa.",
    description:
      "A Casa Vista Atalaia fica em uma das ruas mais desejadas da Ponta do Atalaia, a poucos minutos a pé das Prainhas — o cartão-postal de Arraial do Cabo. São três quartos amplos sendo duas suítes, sala integrada com teto alto e uma varanda feita para o fim de tarde.\n\nA piscina privativa com deck de madeira é o coração da casa: de lá você vê o mar e o pôr do sol atrás do Farol. A cozinha é completa, com churrasqueira na área externa para aquele almoço longo.\n\nIdeal para famílias e grupos de amigos que querem conforto e localização: 5 minutos de carro do centro e das praias do Pontal.",
    categorySlug: "casa",
    categoryLabel: "Casa inteira",
    orgId: "org-host-1",
    orgName: "Vista Mar Imóveis",
    orgSlug: "vista-mar-imoveis",
    neighborhood: "Ponta do Atalaia",
    city: CITY,
    state: ST,
    capacity: 8,
    bedrooms: 3,
    bathrooms: 3,
    basePriceCents: 75000,
    cleaningFeeCents: 15000,
    minNights: 2,
    rules: "Não é permitido eventos ou som alto após 22h. Máximo 8 hóspedes. Aceitamos pets de pequeno porte.",
    status: "published",
    rating: 4.9,
    reviewsCount: 87,
    images: ["casa-vista-atalaia-1", "casa-vista-atalaia-2", "casa-vista-atalaia-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Piscina", "Churrasqueira", "Vista para o mar", "Estacionamento", "Cozinha equipada", "Roupa de cama e banho"],
    featured: true,
  },
  {
    id: "stay-2",
    slug: "loft-centro-arraial",
    name: "Loft no coração do centro histórico",
    summary: "Loft charmoso a 2 quadras da Praia dos Anjos e da orla.",
    description:
      "Um loft pensado para casais: pé-direito duplo, mezanino com cama queen e janelões que deixam a luz do fim de tarde entrar. Você sai do prédio e em duas quadras está na Praia dos Anjos ou no calçadão do centro.\n\nA cozinha compacta tem tudo para o básico, e a bandeja de boas-vindas com café da região é um carinho à parte.\n\nNão precisa de carro: restaurantes, mercado e o ponto dos passeios de barco estão todos a pé.",
    categorySlug: "loft",
    categoryLabel: "Loft",
    orgId: "org-host-2",
    orgName: "Pousadas do Pontal",
    orgSlug: "pousadas-do-pontal",
    neighborhood: "Centro",
    city: CITY,
    state: ST,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    basePriceCents: 28000,
    cleaningFeeCents: 6000,
    minNights: 2,
    rules: "Somente casais ou duas pessoas. Não aceitamos pets. Check-in das 14h às 20h.",
    status: "published",
    rating: 4.8,
    reviewsCount: 132,
    images: ["loft-centro-arraial-1", "loft-centro-arraial-2", "loft-centro-arraial-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Smart TV com streaming", "Cozinha equipada", "Varanda"],
    featured: true,
  },
  {
    id: "stay-3",
    slug: "cobertura-praia-dos-anjos",
    name: "Cobertura frente-mar na Praia dos Anjos",
    summary: "Cobertura duplex com vista frontal para o mar e sacada panorâmica.",
    description:
      "Do terceiro andar, a sacada dessa cobertura emoldura a Praia dos Anjos de lado a lado — o mar de Arraial em primeiro plano e as embarcações saindo para os passeios.\n\nSão três quartos (duas suítes), sala com sofás de canto e uma mesa de jantar que rende almoços longos. O condomínio tem piscina e elevador.\n\nVocê desce em traje de banho e está na areia. O centro com restaurantes e bares fica a 5 minutos a pé.",
    categorySlug: "cobertura",
    categoryLabel: "Cobertura",
    orgId: "org-host-1",
    orgName: "Vista Mar Imóveis",
    orgSlug: "vista-mar-imoveis",
    neighborhood: "Praia dos Anjos",
    city: CITY,
    state: ST,
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    basePriceCents: 56000,
    cleaningFeeCents: 12000,
    minNights: 2,
    rules: "Condomínio residencial: sem festas. Silêncio após 22h.",
    status: "published",
    rating: 4.9,
    reviewsCount: 64,
    images: ["cobertura-praia-dos-anjos-1", "cobertura-praia-dos-anjos-2", "cobertura-praia-dos-anjos-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Vista para o mar", "Piscina", "Estacionamento", "Máquina de lavar", "Roupa de cama e banho"],
    featured: true,
  },
  {
    id: "stay-4",
    slug: "casa-pe-na-areia-praia-grande",
    name: "Casa pé na areia na Praia Grande",
    summary: "Areia na porta, deck com rede e o mar quebrando na janela.",
    description:
      "Uma casa de praia de verdade: areia batida na entrada, deck com redes e um deque voltado para a Praia Grande. Quatro quartos, sendo três com vista para o mar.\n\nA Praia Grande é a favorita de quem ama mar aberto e sol — e da comunidade de surf. O centro e a Praia do Pontal ficam a 10 minutos de caminhada pela orla.\n\nA casa tem churrasqueira, ducha externa e estacionamento para dois carros.",
    categorySlug: "casa",
    categoryLabel: "Casa inteira",
    orgId: "org-host-1",
    orgName: "Vista Mar Imóveis",
    orgSlug: "vista-mar-imoveis",
    neighborhood: "Praia Grande",
    city: CITY,
    state: ST,
    capacity: 10,
    bedrooms: 4,
    bathrooms: 3,
    basePriceCents: 98000,
    cleaningFeeCents: 20000,
    minNights: 3,
    rules: "Eventos somente sob consulta. Não aceitamos pets neste imóvel.",
    status: "published",
    rating: 4.7,
    reviewsCount: 58,
    images: ["casa-pe-na-areia-1", "casa-pe-na-areia-2", "casa-pe-na-areia-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Vista para o mar", "Churrasqueira", "Estacionamento", "Praia a poucos passos", "Máquina de lavar"],
  },
  {
    id: "stay-5",
    slug: "flat-das-prainhas",
    name: "Flat das Prainhas com varanda",
    summary: "Flat arejado a 700m das Prainhas do Pontal, ótimo custo-benefício.",
    description:
      "Segundo andar com varanda e vista verde para o morro do Atalaia. Um quarto com cama queen, sofá-cama na sala e cozinha americana completa.\n\nA localização é o diferencial: 700 metros da entrada das Prainhas e 5 minutos de carro do centro. Estacionamento coberto incluso.\n\nPerfeito para casais ou família pequena que prioriza estar perto das praias mais bonitas da cidade.",
    categorySlug: "apartamento",
    categoryLabel: "Apartamento",
    orgId: "org-host-2",
    orgName: "Pousadas do Pontal",
    orgSlug: "pousadas-do-pontal",
    neighborhood: "Ponta do Atalaia",
    city: CITY,
    state: ST,
    capacity: 4,
    bedrooms: 1,
    bathrooms: 1,
    basePriceCents: 32000,
    cleaningFeeCents: 7000,
    minNights: 2,
    rules: "Check-out até 11h. Não é permitido fumar.",
    status: "published",
    rating: 4.8,
    reviewsCount: 41,
    images: ["flat-das-prainhas-1", "flat-das-prainhas-2", "flat-das-prainhas-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Varanda", "Estacionamento", "Smart TV com streaming"],
  },
  {
    id: "stay-6",
    slug: "pousada-recanto-atalaia",
    name: "Pousada Recanto do Atalaia",
    summary: "Pousada completa com café da manhã incluso e piscina cercada de coqueiros.",
    description:
      "A Pousada Recanto do Atalaia é aquele lugar que você chega e desacelera: piscina cercada de coqueiros, sala de estar com rede, e um café da manhã de bolo caseiro que os hóspedes não cansam de elogiar.\n\nSão seis quartos com entrada independente — a reserva é para o uso integral da pousada, com direito a todas as áreas comuns.\n\nFica na estrada do Atalaia, entre o centro e as Prainhas: 5 minutos de carro para cada lado.",
    categorySlug: "pousada",
    categoryLabel: "Pousada",
    orgId: "org-host-2",
    orgName: "Pousadas do Pontal",
    orgSlug: "pousadas-do-pontal",
    neighborhood: "Estrada do Atalaia",
    city: CITY,
    state: ST,
    capacity: 12,
    bedrooms: 6,
    bathrooms: 6,
    basePriceCents: 64000,
    cleaningFeeCents: 0,
    minNights: 2,
    rules: "Café da manhã das 7h30 às 10h30. Não aceitamos eventos.",
    status: "published",
    rating: 4.9,
    reviewsCount: 203,
    images: ["pousada-recanto-atalaia-1", "pousada-recanto-atalaia-2", "pousada-recanto-atalaia-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Piscina", "Estacionamento", "Berço para bebê", "Varanda"],
    featured: true,
  },
  {
    id: "stay-7",
    slug: "casa-jardim-do-ceu",
    name: "Casa Jardim do Céu no Monte Alto",
    summary: "Casa charmosa com vista panorâmica da cidade e do mar.",
    description:
      "No alto do Monte Alto, essa casa tem uma das melhores vistas de Arraial: do deck você vê a cidade, o mar e, à noite, as luzes da orla.\n\nTrês quartos, sala com lareira de área externa e um jardim com espreguiçadeiras. O silêncio é o grande luxo daqui.\n\nMelhor para quem tem carro: são 8 minutos até o centro e 10 até as praias.",
    categorySlug: "casa",
    categoryLabel: "Casa inteira",
    orgId: "org-host-2",
    orgName: "Pousadas do Pontal",
    orgSlug: "pousadas-do-pontal",
    neighborhood: "Monte Alto",
    city: CITY,
    state: ST,
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    basePriceCents: 43000,
    cleaningFeeCents: 9000,
    minNights: 2,
    rules: "Recomendado para quem vem de carro. Estrada com ladeira.",
    status: "published",
    rating: 4.8,
    reviewsCount: 36,
    images: ["casa-jardim-do-ceu-1", "casa-jardim-do-ceu-2", "casa-jardim-do-ceu-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Churrasqueira", "Estacionamento", "Vista para o mar"],
  },
  {
    id: "stay-8",
    slug: "studio-praia-do-pontal",
    name: "Studio a 2 minutos da Praia do Pontal",
    summary: "Studio compacto e novinho, na areia da Praia do Pontal.",
    description:
      "Studio com decoração contemporânea, cama queen e kitchenette — o cômodo que você precisa para ficar dias na praia.\n\nA saída do prédio dá direto na faixa de areia da Praia do Pontal. De manhã, você caminha na areia até as Prainhas.\n\nÓtima pedida para casais e viajantes solo que querem estar no meio de tudo gastando pouco.",
    categorySlug: "apartamento",
    categoryLabel: "Apartamento",
    orgId: "org-host-1",
    orgName: "Vista Mar Imóveis",
    orgSlug: "vista-mar-imoveis",
    neighborhood: "Praia do Pontal",
    city: CITY,
    state: ST,
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    basePriceCents: 21000,
    cleaningFeeCents: 5000,
    minNights: 2,
    rules: "Não aceitamos pets. Estacionamento não incluso (estacionamentos pagos nas redondezas).",
    status: "published",
    rating: 4.7,
    reviewsCount: 95,
    images: ["studio-praia-do-pontal-1", "studio-praia-do-pontal-2", "studio-praia-do-pontal-3"],
    amenityLabels: ["Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Praia a poucos passos", "Smart TV com streaming"],
  },
];

export const demoTours: Tour[] = [
  {
    id: "tour-1",
    slug: "escuna-6-praias",
    name: "Escuna: 6 praias e ilhas com parada na Fenda",
    summary: "O passeio clássico de Arraial: escuna com guia, paradas para banho e a famosa Fenda.",
    description:
      "A bordo de uma escuna com deck frontal e andar superior, você contorna as principais atrações marítimas de Arraial do Cabo: a Ponta do Atalaia, a Fenda, a Gruta Azul, a Ilha dos Anjos e as praias que só se veem de barco.\n\nHá duas paradas para banho de mar (a Fenda e a Gruta Azul, conforme as condições do mar) e guia narrando a história da cidade, da pesca e da vida marinha.\n\nInclui máscara e colete. Concessionária no bar a bordo. Saídas do Cais Turístico da Praia dos Anjos.",
    categorySlug: "escuna",
    categoryLabel: "Passeio de escuna",
    kind: "boat_tour",
    orgId: "org-op-1",
    orgName: "Mar Azul Escunas",
    orgSlug: "mar-azul-escunas",
    durationMinutes: 210,
    meetingPoint: "Cais Turístico — Praia dos Anjos (chegar 30 min antes)",
    itinerary: [
      { order: 1, title: "Embarque na Praia dos Anjos", description: "Check-in no guichê com 30 minutos de antecedência." },
      { order: 2, title: "Volta da Ilha do Farol", description: "Panorama da Ponta do Atalaia e do Farol histórico." },
      { order: 3, title: "Parada para banho na Fenda", description: "O estreito de rochas mais fotografado de Arraial." },
      { order: 4, title: "Gruta Azul", description: "Parada para banho e fotos (sujeita às condições do mar)." },
      { order: 5, title: "Retorno pela Baía dos Anjos", description: "Fim do passeio no cais, ao lado do centro." },
    ],
    included: ["Guia credenciado", "Máscara de snorkel", "Colete salva-vidas", "Seguro de passeio"],
    pricePerPersonCents: 12000,
    childPriceCents: 6000,
    minGuests: 1,
    maxGuests: 80,
    vesselName: "Escuna Mar Azul III",
    status: "published",
    rating: 4.8,
    reviewsCount: 412,
    images: ["escuna-6-praias-1", "escuna-6-praias-2"],
    featured: true,
  },
  {
    id: "tour-2",
    slug: "lancha-gruta-azul",
    name: "Lancha privativa: Gruta Azul, Fenda e Ilhas",
    summary: "Lancha exclusiva para o seu grupo com roteiro flexível e motorista dedicado.",
    description:
      "Uma lancha só para vocês, com passeador local que conhece cada recanto da costa: Gruta Azul, Fenda, Ilha do Farol, Pontal do Atalaia e as enseadas de água mais clara da região.\n\nO roteiro é combinado na hora conforme o mar e o que o grupo prefere — mais banho de mar, mais fotos ou mais velocidade.\n\nIdeal para famílias e grupos de até 12 pessoas. Inclua gelo e bebidas por conta da casa.",
    categorySlug: "passeio-de-barco",
    categoryLabel: "Passeio de barco",
    kind: "boat_tour",
    orgId: "org-op-1",
    orgName: "Mar Azul Escunas",
    orgSlug: "mar-azul-escunas",
    durationMinutes: 120,
    meetingPoint: "Cais Turístico — Praia dos Anjos",
    itinerary: [
      { order: 1, title: "Embarque privativo", description: "Reunião rápida com o piloto para montar o roteiro." },
      { order: 2, title: "Gruta Azul", description: "Parada para banho em água cristalina." },
      { order: 3, title: "Fenda e Ilha do Farol", description: "Fotos nas formações rochosas e volta da ilha." },
      { order: 4, title: "Enseadas do Pontal", description: "Última parada para mergulho em ponto raso." },
    ],
    included: ["Piloto dedicado", "Combustível", "Gelo e água", "Colete salva-vidas"],
    pricePerPersonCents: 19000,
    minGuests: 4,
    maxGuests: 12,
    vesselName: "Lancha Don Juan 29 pés",
    status: "published",
    rating: 4.9,
    reviewsCount: 158,
    images: ["lancha-gruta-azul-1", "lancha-gruta-azul-2"],
    featured: true,
  },
  {
    id: "tour-3",
    slug: "mergulho-batismo-gruta-azul",
    name: "Mergulho batismo na Gruta Azul",
    summary: "Primeiro mergulho com instrutores certificados — sem precisar de experiência.",
    description:
      "O batismo é a porta de entrada do mergulho: depois de um briefing de 20 minutos, você desce com um instrutor exclusivo a até 6 metros de profundidade, entre peixes coloridos e as paredes da Gruta Azul.\n\nTodo o equipamento está incluso (cilindro, regulador, colete, roupa de neoprene). Não é necessário saber nadar muito bem — o instrutor acompanha você o tempo todo.\n\nSaída em lancha rápida com dois pontos de mergulho. A partir de 10 anos, com autorização dos pais.",
    categorySlug: "mergulho",
    categoryLabel: "Mergulho",
    kind: "experience",
    orgId: "org-op-2",
    orgName: "Atalaia Divers",
    orgSlug: "atalaia-divers",
    durationMinutes: 180,
    meetingPoint: "Base Atalaia Divers — Praia dos Anjos",
    itinerary: [
      { order: 1, title: "Briefing teórico", description: "Sinais, igualação e segurança — sem pressa." },
      { order: 2, title: "Saída de lancha", description: "10 minutos até o ponto de mergulho." },
      { order: 3, title: "Mergulho 1: Gruta Azul", description: "Até 6 m de profundidade com instrutor dedicado." },
      { order: 4, title: "Mergulho 2 (opcional)", description: "Segundo ponto, conforme o grupo." },
    ],
    included: ["Instrutor certificado PADI/SCUBA", "Equipamento completo", "Seguro de mergulho", "Lanche a bordo"],
    pricePerPersonCents: 28000,
    minGuests: 1,
    maxGuests: 8,
    vesselName: "Lancha de apoio Atalaia I",
    status: "published",
    rating: 5.0,
    reviewsCount: 231,
    images: ["mergulho-batismo-1", "mergulho-batismo-2"],
    featured: true,
  },
  {
    id: "tour-4",
    slug: "mergulho-autonomo-ilhas",
    name: "Mergulho autônomo: Ilha dos Anjos e Ponta do Atalaia",
    summary: "Dois mergulhos certificados nos pontos mais preservados da região.",
    description:
      "Para mergulhadores certificados: dois tanques nos pontos clássicos da costa de Arraial — a lapa da Ilha dos Anjos e as lajes da Ponta do Atalaia, com visibilidade que passa de 20 metros nos dias de mar calmo.\n\nGuia de mergulho acompanhando em pequenos grupos (máx. 4 por guia), botijão e lastro inclusos.\n\nApresente seu certificado e logbook no check-in.",
    categorySlug: "mergulho",
    categoryLabel: "Mergulho",
    kind: "experience",
    orgId: "org-op-2",
    orgName: "Atalaia Divers",
    orgSlug: "atalaia-divers",
    durationMinutes: 240,
    meetingPoint: "Base Atalaia Divers — Praia dos Anjos",
    itinerary: [
      { order: 1, title: "Check-in e montagem de equipamento", description: "Separação de tanques e briefing do ponto." },
      { order: 2, title: "Mergulho 1: Ilha dos Anjos", description: "Parede com corais e grande vida marinha." },
      { order: 3, title: "Intervalo de superfície", description: "Lanche a bordo." },
      { order: 4, title: "Mergulho 2: Ponta do Atalaia", description: "Lajes com cardumes e tartarugas." },
    ],
    included: ["Guia de mergulho", "2 cilindros", "Lastro", "Lanche e água"],
    pricePerPersonCents: 45000,
    minGuests: 2,
    maxGuests: 8,
    vesselName: "Lancha de apoio Atalaia I",
    status: "published",
    rating: 4.9,
    reviewsCount: 118,
    images: ["mergulho-autonomo-1", "mergulho-autonomo-2"],
  },
  {
    id: "tour-5",
    slug: "por-do-sol-saveiro",
    name: "Pôr do sol de saveiro com espumante",
    summary: "Uma hora e meia de navegação tranquila brindando o pôr do sol na baía.",
    description:
      "O passeio mais romântico de Arraial: saveiro com velas, música ambiente e espumante gelado enquanto o sol desce atrás do Farol.\n\nSai uma hora antes do pôr do sol e contorna a baía dos Anjos com parada em ponto panorâmico para fotos.\n\nInclui uma taça de espumante por pessoa e suco para as crianças.",
    categorySlug: "passeio-de-barco",
    categoryLabel: "Passeio de barco",
    kind: "boat_tour",
    orgId: "org-op-1",
    orgName: "Mar Azul Escunas",
    orgSlug: "mar-azul-escunas",
    durationMinutes: 105,
    meetingPoint: "Cais Turístico — Praia dos Anjos",
    itinerary: [
      { order: 1, title: "Embarque ao entardecer", description: "Boas-vindas com espumante gelado." },
      { order: 2, title: "Navegação pela baía", description: "Música ambiente e vista do Farol." },
      { order: 3, title: "Ponto panorâmico", description: "Parada para fotos com o sol se pondo." },
      { order: 4, title: "Retorno sob as primeiras luzes", description: "Fim no cais, a passos do centro." },
    ],
    included: ["Taça de espumante", "Suco e água", "Música ambiente", "Guia"],
    pricePerPersonCents: 15000,
    childPriceCents: 7500,
    minGuests: 1,
    maxGuests: 60,
    vesselName: "Saveiro Aurora",
    status: "published",
    rating: 4.9,
    reviewsCount: 176,
    images: ["saveiro-sunset-1", "saveiro-sunset-2"],
    featured: true,
  },
  {
    id: "tour-6",
    slug: "fast-boat-5-praias",
    name: "Fast boat: as 5 praias em um dia",
    summary: "Lancha rápida com paradas nas praias do Pontal, Fenda, Gruta e Ilha do Farol.",
    description:
      "Para quem quer ver tudo em um dia: fast boat com 5 paradas curtas nas praias e pontos mais bonitos, incluindo a Fenda e a Gruta Azul.\n\nGuia local, snorkel e fotos inclusos. Ótima opção para grupos de amigos com pouco tempo na cidade.",
    categorySlug: "passeio-de-barco",
    categoryLabel: "Passeio de barco",
    kind: "boat_tour",
    orgId: "org-op-2",
    orgName: "Atalaia Divers",
    orgSlug: "atalaia-divers",
    durationMinutes: 240,
    meetingPoint: "Cais Turístico — Praia dos Anjos",
    itinerary: [
      { order: 1, title: "Embarque", description: "Reunião rápida de roteiro com o guia." },
      { order: 2, title: "Praia do Pontal", description: "Primeira parada para banho." },
      { order: 3, title: "Fenda e Gruta Azul", description: "Fotos e banho de mar." },
      { order: 4, title: "Ilha do Farol", description: "Volta da ilha com parada para snorkel." },
    ],
    included: ["Guia local", "Snorkel", "Água e gelo", "Colete salva-vidas"],
    pricePerPersonCents: 16000,
    minGuests: 2,
    maxGuests: 22,
    vesselName: "Fast boat Vivian",
    status: "published",
    rating: 4.7,
    reviewsCount: 89,
    images: ["fast-boat-1", "fast-boat-2"],
  },
  {
    id: "tour-7",
    slug: "stand-up-pontal",
    name: "Stand up paddle ao amanhecer no Pontal",
    summary: "Aula/passeio de SUP nas águas mansas da manhã, com fotos inclusas.",
    description:
      "Antes do vento e das embarcações, o mar do Pontal fica um espelho — o cenário perfeito para aprender ou praticar stand up paddle.\n\nAula para iniciantes com instrutor certificado ou aluguel guiado para quem já pratica. As fotos do amanhecer estão inclusas.",
    categorySlug: "experiencia-nautica",
    categoryLabel: "Experiência náutica",
    kind: "experience",
    orgId: "org-op-2",
    orgName: "Atalaia Divers",
    orgSlug: "atalaia-divers",
    durationMinutes: 90,
    meetingPoint: "Praia do Pontal — em frente ao Quiosque 7",
    itinerary: [
      { order: 1, title: "Encontro no Pontal", description: "Equipamento e instruções básicas." },
      { order: 2, title: "Remada guiada", description: "Costeando a orla em direção às Prainhas." },
      { order: 3, title: "Fotos na água", description: "Gopro a postos para o registro." },
    ],
    included: ["Prancha e rema", "Instrutor certificado", "Fotos digitais", "Colete"],
    pricePerPersonCents: 9000,
    minGuests: 1,
    maxGuests: 10,
    status: "published",
    rating: 4.8,
    reviewsCount: 54,
    images: ["stand-up-pontal-1", "stand-up-pontal-2"],
  },
  {
    id: "tour-8",
    slug: "city-tour-quatro-praias",
    name: "City tour das 4 praias + Farol",
    summary: "Ônibus panorâmico aberto pelas praias do Pontal, Grande, Forno e Anjos, com parada no Farol.",
    description:
      "O tour perfeito para o primeiro dia: em um ônibus panorâmico aberto você conhece as quatro praias da cidade com paradas para fotos, o mirante do Farol e o centro histórico.\n\nGuia credenciado narrando a história de Arraial — da época de Cabo Frio ao boom do turismo — e dicas de restaurantes e passeios.\n\nEmbarque no centro histórico. Duração total de 3 horas.",
    categorySlug: "city-tour",
    categoryLabel: "City tour",
    kind: "guide",
    orgId: "org-op-2",
    orgName: "Atalaia Divers",
    orgSlug: "atalaia-divers",
    durationMinutes: 180,
    meetingPoint: "Praça Santos Dumont — Centro Histórico",
    itinerary: [
      { order: 1, title: "Centro histórico", description: "Encontro e contextualização histórica." },
      { order: 2, title: "Praia Grande e Prainhas", description: "Paradas panorâmicas para fotos." },
      { order: 3, title: "Mirante do Farol", description: "A melhor vista da cidade." },
      { order: 4, title: "Praias dos Anjos e do Forno", description: "Fim do tour com dicas personalizadas." },
    ],
    included: ["Guia credenciado", "Transporte panorâmico", "Água"],
    pricePerPersonCents: 11000,
    childPriceCents: 5500,
    minGuests: 1,
    maxGuests: 15,
    status: "published",
    rating: 4.6,
    reviewsCount: 67,
    images: ["city-tour-praias-1", "city-tour-praias-2"],
  },
];

// ---------------------------------------------------------------------------
// Avaliações
// ---------------------------------------------------------------------------
function review(id: string, authorName: string, rating: number, date: string, comment: string, reply?: string): Review {
  return { id, authorName, rating, date, comment, reply: reply ?? null };
}

export const demoReviewsByItem: Record<string, Review[]> = {
  "stay-1": [
    review("rv-1", "Marina S.", 5, "2026-09-14", "Casa impecável e as fotos nem fazem justiça à vista. A piscina ao pôr do sol é um espetáculo. Voltaremos com certeza!"),
    review("rv-2", "Rodrigo A.", 5, "2026-08-30", "Localização perfeita: fomos a pé para as Prainhas. Anfitrião atencioso, casa equipada até com churrasqueira limpa."),
    review("rv-3", "Fernanda L.", 4.5, "2026-07-19", "Excelente casa, única ressalva é a ladeira de acesso — de carro não tem problema.", "Obrigado, Fernanda! Estamos finalizando a calçada nova de acesso."),
  ],
  "stay-2": [
    review("rv-4", "Camila R.", 5, "2026-09-02", "O loft é uma graça, decorado com muito bom gosto e a localização não poderia ser melhor. Café de boas-vindas delicioso."),
    review("rv-5", "Paulo H.", 4.5, "2026-06-21", "Ótimo custo-benefício, cama confortável e tudo limpinho. Ar-condicionado gelando muito."),
  ],
  "stay-3": [
    review("rv-6", "Juliana T.", 5, "2026-10-05", "Acordar com aquela vista da Praia dos Anjos não tem preço. Cobertura muito bem cuidada, com tudo funcionando."),
    review("rv-7", "Eduardo M.", 5, "2026-08-11", "Anfitrião nota 10, respondeu tudo em minutos. A sacada é ainda melhor do que nas fotos."),
  ],
  "stay-4": [
    review("rv-8", "Patrícia C.", 5, "2026-09-28", "Pé na areia de verdade! As crianças viveram na praia. Casa espaçosa e confortável para 10 pessoas."),
    review("rv-9", "Gustavo F.", 4.5, "2026-07-07", "Maravilhosa. Wi-Fi funciona bem até na varanda — dá para estender a viagem trabalhando de lá."),
  ],
  "stay-5": [
    review("rv-10", "Beatriz N.", 5, "2026-10-01", "Flat novinho, cheiroso, com tudo novo. A varanda é ótima para o café da manhã."),
    review("rv-11", "Tiago V.", 4.5, "2026-08-15", "Muito bem localizado para quem quer as Prainhas. Estacionamento coberto fez diferença."),
  ],
  "stay-6": [
    review("rv-12", "Helena P.", 5, "2026-09-20", "O café da manhã vale o preço da estadia! Bolo caseiro, frutas da estação e todo mundo tratando a gente como família."),
    review("rv-13", "Roberto K.", 5, "2026-07-30", "Piscina entre coqueiros, paz e silêncio. Melhor pousada de Arraial."),
    review("rv-14", "Sofia G.", 4.5, "2026-06-10", "Quartos grandes e limpos. Localização entre o centro e as praias é estratégica."),
  ],
  "stay-7": [
    review("rv-15", "Larissa D.", 5, "2026-08-25", "A vista do deck é surreal. Ótima opção para quem quer tranquilidade longe do burburinho."),
  ],
  "stay-8": [
    review("rv-16", "André B.", 5, "2026-10-12", "Sai do studio e estava com os pés na areia. Simples e perfeito."),
    review("rv-17", "Vanessa O.", 4.5, "2026-09-05", "Pequeno, mas muito bem aproveitado. Ótimo para casal."),
  ],
  "tour-1": [
    review("rv-18", "Marcos V.", 5, "2026-10-08", "Equipe super organizada, escuna limpa e o guia Sabiá é uma atração à parte. A parada na Fenda foi o auge."),
    review("rv-19", "Aline W.", 4.5, "2026-09-16", "Passeio lindo e bem narrado. Chegue cedo para pegar os lugares da frente."),
    review("rv-20", "Cristiano J.", 5, "2026-08-22", "Fui com meus pais e filhos — agrada todas as idades. Crianças amaram o banho de mar."),
  ],
  "tour-2": [
    review("rv-21", "Débora S.", 5, "2026-10-11", "Alugamos a lancha para 8 pessoas e foi o melhor dia da viagem. Piloto conhece cada canto e ajustou o roteiro ao nosso humor."),
    review("rv-22", "Fábio R.", 5, "2026-09-09", "Gruta Azul quase só para nós de manhã. Vale cada centavo."),
  ],
  "tour-3": [
    review("rv-23", "Natália E.", 5, "2026-10-15", "Nunca havia mergulhado e me senti 100% segura. O instrutor Lucas foi paciente e o fundo da Gruta Azul é de outro planeta."),
    review("rv-24", "Henrique L.", 5, "2026-08-29", "Experiência transformadora. Fotos lindas inclusas."),
  ],
  "tour-5": [
    review("rv-25", "Isabela F.", 5, "2026-09-25", "O pôr do sol de saveiro com espumante é obrigatório. Cena de filme, sem exagero."),
    review("rv-26", "Rafael P.", 5, "2026-08-17", "Romântico demais. A trip é atenciosa e o timing das fotos perfeito."),
  ],
  "tour-6": [
    review("rv-27", "Thiago M.", 4.5, "2026-09-30", "Rendeu um dia inteiro de diversão. Fast boat novo e seguro."),
  ],
  "tour-7": [
    review("rv-28", "Bruna A.", 5, "2026-10-03", "SUP às 6h30 com o mar espelhado: recarrega a alma. Fotos profissionalmente tiradas."),
  ],
  "tour-8": [
    review("rv-29", "Vera Lúcia T.", 5, "2026-09-12", "Fizemos no primeiro dia e ajudou a organizar o resto da viagem. Guia apaixonado pela história da cidade."),
  ],
};

// ---------------------------------------------------------------------------
// Saídas (departures) — geradas dinamicamente para os próximos 21 dias
// ---------------------------------------------------------------------------
const DEPARTURE_TIMES: Record<string, string[]> = {
  "tour-1": ["10:00", "13:30"],
  "tour-2": ["09:00", "14:00"],
  "tour-3": ["08:00", "10:30"],
  "tour-4": ["08:00"],
  "tour-5": ["16:30"],
  "tour-6": ["09:30"],
  "tour-7": ["06:30"],
  "tour-8": ["09:00", "14:00"],
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDemoDepartures(tour: Tour): Departure[] {
  const times = DEPARTURE_TIMES[tour.id] ?? ["10:00"];
  const out: Departure[] = [];
  const now = new Date();

  for (let d = 1; d <= 21; d++) {
    const day = addDays(now, d);
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const dt = new Date(day);
      dt.setHours(h, m, 0, 0);
      const id = `dep-${hash(tour.id + t + dt.toISOString().slice(0, 10))}`;
      const mod = hash(id) % 10;
      const booked =
        d > 18 ? Math.floor(tour.maxGuests * 0.75) : mod <= 2 ? 0 : Math.floor((tour.maxGuests * mod) / 12);
      out.push({
        id,
        serviceId: tour.id,
        startsAt: dt.toISOString(),
        endsAt: new Date(dt.getTime() + tour.durationMinutes * 60000).toISOString(),
        capacity: tour.maxGuests,
        seatsBooked: Math.min(booked, tour.maxGuests),
        status: mod === 9 ? "blocked" : "open",
      });
    }
  }
  return out;
}

// Bloqueios de exemplo (calendarização das hospedagens)
export function getDemoBlocks(stayId: string): PropertyBlock[] {
  const now = new Date();
  const seed = hash(stayId) % 5;
  const b1Start = addDays(now, 4 + seed);
  const b1End = addDays(now, 7 + seed);
  const b2Start = addDays(now, 20 + seed);
  const b2End = addDays(now, 24 + seed);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return [
    { id: `${stayId}-blk-1`, propertyId: stayId, startDate: iso(b1Start), endDate: iso(b1End), reason: "Reserva externa (Airbnb)" },
    { id: `${stayId}-blk-2`, propertyId: stayId, startDate: iso(b2Start), endDate: iso(b2End), reason: "Manutenção" },
  ];
}

// ---------------------------------------------------------------------------
// Consultas simples
// ---------------------------------------------------------------------------
export function getStayBySlug(slug: string): Stay | undefined {
  return demoStays.find((s) => s.slug === slug);
}
export function getTourBySlug(slug: string): Tour | undefined {
  return demoTours.find((t) => t.slug === slug);
}
export function getStayById(id: string): Stay | undefined {
  return demoStays.find((s) => s.id === id);
}
export function getTourById(id: string): Tour | undefined {
  return demoTours.find((t) => t.id === id);
}
export function getReviews(item: Stay | Tour): Review[] {
  return demoReviewsByItem[item.id] ?? [];
}
export function getOrgById(id: string): Organization | undefined {
  return demoOrganizations.find((o) => o.id === id);
}
