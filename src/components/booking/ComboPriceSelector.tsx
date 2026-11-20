"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { priceForDate } from "@/lib/pricing";
import { whatsappRequestUrl } from "@/lib/whatsapp";
import type { SeasonalPriceRule } from "@/lib/types";

function todayIso() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function displayDate(iso: string) { return iso.split("-").reverse().join("/"); }

function optionIndexForDate(date: string, options: ComboPriceOption[]) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const weekend = weekday === 5 || weekday === 6 || weekday === 0;
  const index = options.findIndex((option) => {
    const label = option.label.toLocaleLowerCase("pt-BR");
    return weekend ? /sexta|sábado|sabado|domingo|fim de semana/.test(label) : /segunda|terça|terca|quarta|dia útil|dia util/.test(label);
  });
  return index >= 0 ? index : 0;
}

export type ComboPriceOption = { label: string; priceCents: number; details?: string; promoEndsOn?: string };

type Props = {
  name: string;
  itemNames: string[];
  basePriceCents: number | null;
  weekendPriceCents?: number | null;
  priceRules: SeasonalPriceRule[];
  promoPriceCents?: number | null;
  promoEndsOn?: string | null;
  priceLabel?: string | null;
  additionalFees?: string[];
  priceOptions?: ComboPriceOption[];
  bookingWhatsapp?: string | null;
};

export function ComboPriceSelector({
  name, itemNames, basePriceCents, weekendPriceCents, priceRules, promoPriceCents = null, promoEndsOn = null,
  priceLabel = null, additionalFees = [], priceOptions = [], bookingWhatsapp = null,
}: Props) {
  const [date, setDate] = useState(todayIso());
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(() => optionIndexForDate(todayIso(), priceOptions));
  const selectedOption = priceOptions[selectedOptionIndex] ?? null;
  const regularSelection = basePriceCents == null ? null : priceForDate({ date, basePriceCents, weekendPriceCents, rules: priceRules });
  const promoApplies = !selectedOption && Boolean(promoPriceCents != null && promoEndsOn && date <= promoEndsOn);
  const optionPromoExpired = Boolean(selectedOption?.promoEndsOn && date > selectedOption.promoEndsOn);
  const selection = selectedOption && !optionPromoExpired
    ? { priceCents: selectedOption.priceCents, label: selectedOption.label, details: selectedOption.details, promo: Boolean(selectedOption.promoEndsOn), promoEndsOn: selectedOption.promoEndsOn }
    : promoApplies
      ? { priceCents: promoPriceCents as number, promo: true }
      : regularSelection
        ? { priceCents: regularSelection.priceCents, rule: regularSelection.rule, promo: false }
        : null;
  const optionName = selectedOption ? `Modalidade: ${selectedOption.label}\n` : "";
  const message = `Olá! Vim pelo site Viviantourr e gostaria de reservar o combo:\n\n${name}${priceLabel ? ` (${priceLabel})` : ""}\n${optionName}Data desejada: ${displayDate(date)}\nInclui: ${itemNames.join(" + ")}${selection ? `\nValor informado no site: ${formatBRL(selection.priceCents)}` : optionPromoExpired ? "\nA oferta exibida expirou para esta data; gostaria de consultar a tarifa atual." : ""}${additionalFees.length ? `\nTaxas/observações: ${additionalFees.join(" | ")}` : ""}\n\nPodem confirmar disponibilidade e reserva?`;
  const href = whatsappRequestUrl(bookingWhatsapp, message);

  return (
    <section className="mt-8 card flex flex-wrap items-end justify-between gap-4 p-6">
      <div className="min-w-0 flex-1">
        <label htmlFor="combo-date" className="text-sm text-tinta-mute">Data desejada</label>
        <input id="combo-date" type="date" min={todayIso()} value={date} onChange={(event) => { setDate(event.target.value); setSelectedOptionIndex(optionIndexForDate(event.target.value, priceOptions)); }} className="input mt-1" />
        {priceOptions.length > 0 && <fieldset className="mt-5"><legend className="text-sm font-medium text-tinta">Escolha o período</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{priceOptions.map((option, index) => { const expired = Boolean(option.promoEndsOn && date > option.promoEndsOn); return <label key={`${option.label}-${index}`} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${selectedOptionIndex === index ? "border-turquesa-500 bg-turquesa-50" : "border-areia-200 hover:border-turquesa-300"}`}><input className="mr-2" type="radio" name="combo-price-option" checked={selectedOptionIndex === index} onChange={() => setSelectedOptionIndex(index)} /><span className="font-semibold text-tinta">{option.label}</span><span className="mt-1 block font-bold text-oceano-700">{expired ? "Consulte novas tarifas" : formatBRL(option.priceCents)}</span>{option.promoEndsOn && <span className="mt-1 block text-xs text-tinta-mute">Oferta até {displayDate(option.promoEndsOn)}</span>}{option.details && <span className="mt-1 block text-xs text-tinta-mute">{option.details}</span>}</label>; })}</div></fieldset>}
        <p className="mt-4 text-sm text-tinta-mute">Valor do pacote{priceLabel ? ` · ${priceLabel}` : ""}</p>
        {selection ? <>{promoApplies && regularSelection && <p className="mt-1 text-sm text-tinta-mute line-through">De {formatBRL(regularSelection.priceCents)}</p>}<p className="text-2xl font-bold text-tinta">{selection.promo ? "Por " : ""}{formatBRL(selection.priceCents)}</p>{selection.promoEndsOn && <p className="mt-1 text-xs font-medium text-coral-600">Oferta válida para datas até {displayDate(selection.promoEndsOn)}.</p>}{selection.promo && promoEndsOn && !selection.promoEndsOn && <p className="mt-1 text-xs font-medium text-coral-600">Oferta válida para datas até {displayDate(promoEndsOn)}.</p>}{selection.rule?.label && <p className="mt-1 text-xs text-tinta-mute">Regra aplicada: {selection.rule.label}</p>}</> : <div><p className="text-2xl font-bold text-tinta">{optionPromoExpired ? "Consulte novas tarifas" : "Consulte condições"}</p>{optionPromoExpired && selectedOption?.promoEndsOn && <p className="mt-1 text-xs text-tinta-mute">O preço promocional vale até {displayDate(selectedOption.promoEndsOn)}.</p>}</div>}
        {additionalFees.length > 0 && <p className="mt-3 max-w-xl text-xs leading-relaxed text-tinta-mute">Taxas e itens não inclusos são informados abaixo e confirmados no atendimento.</p>}
      </div>
      {href && <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa">Reservar pelo WhatsApp</a>}
    </section>
  );
}
