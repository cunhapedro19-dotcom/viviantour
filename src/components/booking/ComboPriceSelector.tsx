"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { priceForDate } from "@/lib/pricing";
import { whatsappRequestUrl } from "@/lib/whatsapp";
import type { SeasonalPriceRule } from "@/lib/types";

function todayIso() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }

export function ComboPriceSelector({ name, itemNames, basePriceCents, weekendPriceCents, priceRules }: { name: string; itemNames: string[]; basePriceCents: number | null; weekendPriceCents?: number | null; priceRules: SeasonalPriceRule[] }) {
  const [date, setDate] = useState(todayIso());
  const selection = basePriceCents == null ? null : priceForDate({ date, basePriceCents, weekendPriceCents, rules: priceRules });
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar o combo:\n\n${name}\nData desejada: ${date.split("-").reverse().join("/")}\nItens: ${itemNames.join(" + ")}${selection ? `\nValor informado no site: ${formatBRL(selection.priceCents)}` : ""}\n\nQuais condições estão disponíveis?`;
  const href = whatsappRequestUrl(null, message);
  return <div className="mt-8 card flex flex-wrap items-end justify-between gap-4 p-6"><div><label htmlFor="combo-date" className="text-sm text-tinta-mute">Data desejada</label><input id="combo-date" type="date" min={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} className="input mt-1" /><p className="mt-3 text-sm text-tinta-mute">Valor do pacote</p><p className="text-2xl font-bold text-tinta">{selection ? formatBRL(selection.priceCents) : "Consulte condições"}</p>{selection?.rule?.label && <p className="mt-1 text-xs text-tinta-mute">Regra aplicada: {selection.rule.label}</p>}</div>{href && <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa">Consultar pelo WhatsApp</a>}</div>;
}
