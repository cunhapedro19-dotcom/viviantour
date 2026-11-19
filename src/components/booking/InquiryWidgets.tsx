"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Departure, SeasonalPriceRule } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import { CalendarMonth } from "./CalendarMonth";
import { whatsappRequestUrl } from "@/lib/whatsapp";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/config";
import { isWeekend, priceForDate, stayPriceForPeriod } from "@/lib/pricing";

function todayIso() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function StayInquiryWidget({ name, phone, blockedDates, availabilityError = false, maxDate, minNights, capacity, basePriceCents, weekendPriceCents, priceRules, showPublicPrices }: {
  name: string; phone?: string | null; blockedDates: string[]; availabilityError?: boolean; maxDate?: string; minNights: number; capacity: number; basePriceCents: number; weekendPriceCents?: number | null; priceRules: SeasonalPriceRule[]; showPublicPrices?: boolean;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const unavailable = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return false;
    const cursor = new Date(`${checkIn}T12:00:00`); const end = new Date(`${checkOut}T12:00:00`);
    while (cursor < end) { if (blocked.has(cursor.toISOString().slice(0, 10))) return true; cursor.setDate(cursor.getDate() + 1); }
    return false;
  }, [checkIn, checkOut, blocked]);
  const nights = checkIn && checkOut ? Math.round((Date.parse(`${checkOut}T12:00:00`) - Date.parse(`${checkIn}T12:00:00`)) / 86_400_000) : 0;
  const estimatedTotal = checkIn && checkOut ? stayPriceForPeriod({ checkIn, checkOut, basePriceCents, weekendPriceCents, rules: priceRules }) : 0;
  const guests = adults + children;
  const valid = Boolean(checkIn && checkOut && nights >= minNights && guests <= capacity && !unavailable && !availabilityError);
  const pickDate = (iso: string) => { if (!checkIn || checkOut || iso <= checkIn) { setCheckIn(iso); setCheckOut(""); } else setCheckOut(iso); };
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar esta hospedagem:\n\n${name}\nCheck-in: ${checkIn ? format(new Date(`${checkIn}T12:00:00`), "dd/MM/yyyy") : ""}\nCheck-out: ${checkOut ? format(new Date(`${checkOut}T12:00:00`), "dd/MM/yyyy") : ""}\nHóspedes: ${adults} adulto(s)${children ? ` e ${children} criança(s)` : ""}${showPublicPrices && estimatedTotal ? `\nValor estimado das diárias: ${formatBRL(estimatedTotal)}` : ""}\n\nPode confirmar a disponibilidade e o valor final para esse período?`;
  const href = valid ? whatsappRequestUrl(phone, message) : null;
  return <div className="card sticky top-24 overflow-hidden">
    <div className="border-b border-areia-200 bg-areia-50 px-5 py-4"><h2 className="font-semibold text-tinta">Consulte esta hospedagem</h2><p className="mt-1 text-xs text-tinta-mute">Preencha os dados da viagem para enviar uma mensagem pronta.</p></div>
    <div className="space-y-4 p-5">
      <div><p className="label">Escolha check-in e check-out na agenda</p>{availabilityError ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Não foi possível carregar a disponibilidade desta hospedagem. Tente novamente mais tarde.</p> : <><CalendarMonth blockedDates={blocked} checkIn={checkIn} checkOut={checkOut} onPick={pickDate} maxDate={maxDate} /><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tinta-mute"><span>• Datas livres</span><span className="text-areia-400">• Ocupadas ou indisponíveis</span></div></>}<p className="mt-2 text-xs text-tinta-soft">Check-in: {checkIn ? format(new Date(`${checkIn}T12:00:00`), "dd/MM/yyyy") : "selecione uma data"} · Check-out: {checkOut ? format(new Date(`${checkOut}T12:00:00`), "dd/MM/yyyy") : "selecione uma data"}</p></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="stay-adults">Adultos</label><select id="stay-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{Array.from({ length: capacity }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div><div><label className="label" htmlFor="stay-kids">Crianças</label><select id="stay-kids" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>{Array.from({ length: capacity + 1 }, (_, i) => i).map((n) => <option key={n}>{n}</option>)}</select></div></div>
      {nights > 0 && nights < minNights && <p className="text-xs text-red-700">Estadia mínima: {minNights} noite(s).</p>}{guests > capacity && <p className="text-xs text-red-700">Esta hospedagem acomoda até {capacity} pessoas.</p>}{unavailable && <p className="text-xs text-red-700">Há datas ocupadas nesse período. Escolha outras datas.</p>}
      {showPublicPrices && nights > 0 && !unavailable && <p className="rounded-xl bg-areia-50 px-3 py-2 text-sm text-tinta-soft">Valor estimado das diárias: <strong className="text-tinta">{formatBRL(estimatedTotal)}</strong><span className="block text-xs text-tinta-mute">Inclui {nights} noite(s); taxas extras, se houver, são confirmadas no atendimento.</span></p>}
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa flex w-full justify-center">Consultar pelo WhatsApp</a> : <button type="button" disabled className="btn-turquesa w-full opacity-50">{valid ? "WhatsApp indisponível" : "Informe período e hóspedes"}</button>}{!phone && !DEFAULT_WHATSAPP_NUMBER && <p className="text-center text-xs text-tinta-mute">O WhatsApp de atendimento ainda não foi configurado.</p>}<p className="text-center text-xs text-tinta-mute">A equipe confirma disponibilidade e valores pelo WhatsApp.</p>
    </div>
  </div>;
}

export function TourInquiryWidget({ name, phone, departures, maxGuests, basePriceCents, weekendPriceCents, startingPriceCents, priceRules, bookingAvailableThrough }: {
  name: string; phone?: string | null; departures: Departure[]; maxGuests: number; basePriceCents: number; weekendPriceCents?: number | null; startingPriceCents: number; priceRules: SeasonalPriceRule[]; bookingAvailableThrough?: string | null;
}) {
  const available = departures.filter((d) => d.status === "open" && d.capacity > d.seatsBooked && d.startsAt >= new Date().toISOString());
  const [date, setDate] = useState(""); const [departureId, setDepartureId] = useState(""); const [adults, setAdults] = useState(2); const [children, setChildren] = useState(0);
  const sameDayDepartures = available.filter((d) => d.startsAt.slice(0, 10) === date); const departure = sameDayDepartures.find((d) => d.id === departureId); const guests = adults + children;
  const selectedPrice = date ? priceForDate({ date, basePriceCents, weekendPriceCents, rules: priceRules }) : { priceCents: basePriceCents };
  const selectedRule = selectedPrice.rule;
  const selectedPriceCents = selectedPrice.priceCents;
  const afterBookingWindow = Boolean(date && bookingAvailableThrough && date > bookingAvailableThrough);
  const valid = Boolean(date && !afterBookingWindow && guests <= maxGuests && (!departure || guests <= departure.capacity - departure.seatsBooked));
  const when = date ? `${format(new Date(`${date}T12:00:00`), "EEEE, dd/MM/yyyy", { locale: ptBR })}${departure ? ` às ${format(new Date(departure.startsAt), "HH:mm")}` : " (horário a combinar)"}` : "";
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar este passeio:\n\n${name}\nData e horário desejados: ${when}\nParticipantes: ${adults} adulto(s)${children ? ` e ${children} criança(s)` : ""}\nValor informado no site: ${formatBRL(selectedPriceCents)} por pessoa${selectedRule?.details ? ` (${selectedRule.details.toLowerCase()})` : ""}\n\nPode confirmar as vagas?`;
  const href = valid ? whatsappRequestUrl(phone, message) : null;
  return <div className="card sticky top-24 overflow-hidden">
    <div className="border-b border-areia-200 bg-areia-50 px-5 py-4"><p className="text-lg"><span className="font-bold text-tinta">A partir de {formatBRL(startingPriceCents)}</span><span className="text-tinta-mute"> / pessoa</span></p><p className="mt-1 text-xs text-tinta-mute">Escolha uma data para consultar disponibilidade pelo WhatsApp.</p></div>
    <div className="space-y-4 p-5">
      <div><label className="label" htmlFor="tour-date">Data desejada</label><input id="tour-date" type="date" min={todayIso()} max={bookingAvailableThrough ?? undefined} className="input" value={date} onChange={(e) => { setDate(e.target.value); setDepartureId(""); }} /></div>
      {(priceRules.length > 0 || weekendPriceCents != null) && <div className="rounded-xl bg-oceano-50 p-3 text-sm text-oceano-900"><p className="font-semibold">Valores e regras</p><ul className="mt-1.5 space-y-1 text-xs">{weekendPriceCents != null && <li><strong>{formatBRL(weekendPriceCents)}</strong> por pessoa — sábados e domingos</li>}{priceRules.map((rule) => <li key={rule.id}><strong>{formatBRL(rule.priceCents)}</strong> por pessoa — {rule.label ?? rule.startsOn}{rule.details ? ` · ${rule.details}` : ""}</li>)}</ul></div>}
      {date && !afterBookingWindow && <p className="rounded-xl bg-areia-50 px-3 py-2 text-sm text-tinta-soft">Valor para esta data: <strong className="text-tinta">{formatBRL(selectedPriceCents)} por pessoa</strong>{selectedRule?.details ? ` · ${selectedRule.details}` : !selectedRule && weekendPriceCents != null && isWeekend(date) ? " · tarifa de fim de semana" : ""}</p>}{afterBookingWindow && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Não há datas disponíveis para reserva após {format(new Date(`${bookingAvailableThrough}T12:00:00`), "dd/MM/yyyy")}.</p>}
      {sameDayDepartures.length > 0 && <div><label className="label" htmlFor="tour-time">Horário disponível</label><select id="tour-time" className="input" value={departureId} onChange={(e) => setDepartureId(e.target.value)}><option value="">A combinar</option>{sameDayDepartures.map((d) => <option key={d.id} value={d.id}>{format(new Date(d.startsAt), "HH:mm")}</option>)}</select></div>}
      <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="tour-adults">Adultos</label><select id="tour-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div><div><label className="label" htmlFor="tour-kids">Crianças</label><select id="tour-kids" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>{Array.from({ length: maxGuests + 1 }, (_, i) => i).map((n) => <option key={n}>{n}</option>)}</select></div></div>
      {guests > maxGuests && <p className="text-xs text-red-700">Este passeio aceita até {maxGuests} pessoas por pedido.</p>}{departure && guests > departure.capacity - departure.seatsBooked && <p className="text-xs text-red-700">Não há vagas suficientes nessa saída.</p>}
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa flex w-full justify-center">Consultar pelo WhatsApp</a> : <button type="button" disabled className="btn-turquesa w-full opacity-50">{valid ? "WhatsApp indisponível" : "Informe data e participantes"}</button>}{!phone && !DEFAULT_WHATSAPP_NUMBER && <p className="text-center text-xs text-tinta-mute">O WhatsApp de atendimento ainda não foi configurado.</p>}<p className="text-center text-xs text-tinta-mute">A equipe confirma a disponibilidade pelo WhatsApp.</p>
    </div>
  </div>;
}
