import type { TourPriceMode } from "./types";

export function tourPriceLabel(mode: TourPriceMode = "per_person", groupSize?: number | null) {
  if (mode !== "per_group") return "por pessoa";
  const size = Math.max(1, Number(groupSize) || 1);
  return size === 2 ? "por casal (at� 2 pessoas)" : `por grupo (at� ${size} pessoas)`;
}

export function tourPriceShortLabel(mode: TourPriceMode = "per_person", groupSize?: number | null) {
  if (mode !== "per_group") return "por pessoa";
  const size = Math.max(1, Number(groupSize) || 1);
  return size === 2 ? "por casal" : `por grupo de at� ${size}`;
}
