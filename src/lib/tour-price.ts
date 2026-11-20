import type { TourPriceMode } from "./types";

export const DEFAULT_BATE_E_VOLTA_PRICE_NOTES = [
  "Taxa de embarque do barco: R$ 15,00",
  "Taxa da jardineira (ida e volta do estacionamento de Arraial at\u00e9 o barco): R$ 20,00",
  "Crian\u00e7as at\u00e9 5 anos n\u00e3o pagam; de 6 a 10 anos pagam meia.",
];

export function tourPriceLabel(mode: TourPriceMode = "per_person", groupSize?: number | null) {
  if (mode !== "per_group") return "por pessoa";
  const size = Math.max(1, Number(groupSize) || 1);
  return size === 2 ? "por casal (até 2 pessoas)" : `por grupo (até ${size} pessoas)`;
}

export function tourPriceShortLabel(mode: TourPriceMode = "per_person", groupSize?: number | null) {
  if (mode !== "per_group") return "por pessoa";
  const size = Math.max(1, Number(groupSize) || 1);
  return size === 2 ? "por casal" : `por grupo de até ${size}`;
}
