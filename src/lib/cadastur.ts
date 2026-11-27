import { OFFICIAL_SITE_URL } from "@/lib/config";

export const CADASTUR = {
  commercialName: "Vivian Tourr",
  legalName: "VIVIAN TOUR SERVICOS DE TURISMO LTDA",
  activity: "Agência de Turismo",
  registrationNumber: "28.167.645/0001-32",
  validFrom: "04/11/2026",
  validThrough: "04/11/2028",
  authority: "Ministério do Turismo",
  verificationUrl:
    "https://cadastur.turismo.gov.br/cadastur/#!/public/qrcode/28167645000132",
  certificateImage: {
    src: "/cadastur/certificado-vivian-tourr.png",
    width: 1320,
    height: 903,
    alt: "Certificado Cadastur da Vivian Tour Serviços de Turismo Ltda",
  },
} as const;

export const TRAVEL_AGENCY_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: CADASTUR.commercialName,
  legalName: CADASTUR.legalName,
  url: OFFICIAL_SITE_URL,
  identifier: {
    "@type": "PropertyValue",
    name: "Cadastur",
    value: CADASTUR.registrationNumber,
    url: CADASTUR.verificationUrl,
  },
  areaServed: {
    "@type": "City",
    name: "Arraial do Cabo",
    containedInPlace: {
      "@type": "State",
      name: "Rio de Janeiro",
    },
  },
  sameAs: [CADASTUR.verificationUrl],
} as const;
