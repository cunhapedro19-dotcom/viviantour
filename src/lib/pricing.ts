import type { SeasonalPriceRule } from "./types";

export function isWeekend(isoDate: string): boolean {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

/** Regra datada sempre vence a tarifa recorrente de fim de semana. */
export function priceForDate({
  date,
  basePriceCents,
  weekendPriceCents,
  rules = [],
}: {
  date: string;
  basePriceCents: number;
  weekendPriceCents?: number | null;
  rules?: SeasonalPriceRule[];
}): { priceCents: number; rule?: SeasonalPriceRule } {
  const rule = [...rules]
    .filter((item) => item.startsOn <= date && (!item.endsOn || date < item.endsOn))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.startsOn.localeCompare(a.startsOn))[0];

  if (rule) return { priceCents: rule.priceCents, rule };
  if (isWeekend(date) && weekendPriceCents != null) return { priceCents: weekendPriceCents };
  return { priceCents: basePriceCents };
}

export function stayPriceForPeriod({
  checkIn,
  checkOut,
  basePriceCents,
  weekendPriceCents,
  rules = [],
}: {
  checkIn: string;
  checkOut: string;
  basePriceCents: number;
  weekendPriceCents?: number | null;
  rules?: SeasonalPriceRule[];
}): number {
  let total = 0;
  const cursor = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  while (cursor < end) {
    total += priceForDate({
      date: cursor.toISOString().slice(0, 10),
      basePriceCents,
      weekendPriceCents,
      rules,
    }).priceCents;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}
