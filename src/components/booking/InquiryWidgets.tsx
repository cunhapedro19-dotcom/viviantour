"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Departure } from "@/lib/types";
import { CalendarMonth } from "./CalendarMonth";
import { whatsappRequestUrl } from "@/lib/whatsapp";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/config";

function todayIso() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function StayInquiryWidget({
  name,
  phone,
  blockedDates,
  availabilityError = false,
  maxDate,
  minNights,
  capacity,
}: {
  name: string;
  phone?: string | null;
  blockedDates: string[];
  availabilityError?: boolean;
  maxDate?: string;
  minNights: number;
  capacity: number;
}) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const unavailable = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return false;
    const cursor = new Date(`${checkIn}T12:00:00`);
    const end = new Date(`${checkOut}T12:00:00`);
    while (cursor < end) {
      if (blocked.has(cursor.toISOString().slice(0, 10))) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }, [checkIn, checkOut, blocked]);
  const nights = checkIn && checkOut ? Math.round((Date.parse(`${checkOut}T12:00:00`) - Date.parse(`${checkIn}T12:00:00`)) / 86_400_000) : 0;
  const guests = adults + children;
  const valid = Boolean(checkIn && checkOut && nights >= minNights && guests <= capacity && !unavailable && !availabilityError);
  function pickDate(iso: string) {
    if (!checkIn || checkOut) {
      setCheckIn(iso);
      setCheckOut("");
    } else if (iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut("");
    } else {
      setCheckOut(iso);
    }
  }
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar esta hospedagem:\n\n${name}\nCheck-in: ${checkIn ? format(new Date(`${checkIn}T12:00:00`), "dd/MM/yyyy") : ""}\nCheck-out: ${checkOut ? format(new Date(`${checkOut}T12:00:00`), "dd/MM/yyyy") : ""}\nHóspedes: ${adults} adulto(s)${children ? ` e ${children} criança(s)` : ""}\n\nPode confirmar a disponibilidade e me informar o valor para esse período?`;
  const href = valid ? whatsappRequestUrl(phone, message) : null;

  return (
    <div className="card sticky top-24 overflow-hidden">
      <div className="border-b border-areia-200 bg-areia-50 px-5 py-4">
        <h2 className="font-semibold text-tinta">Consulte esta hospedagem</h2>
        <p className="mt-1 text-xs text-tinta-mute">Preencha os dados da viagem para enviar uma mensagem pronta.</p>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="label">Escolha check-in e check-out na agenda</p>
          {availabilityError ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Não foi possível carregar a disponibilidade desta hospedagem. Tente novamente mais tarde ou fale com a equipe.</p>
          ) : (
            <>
              <CalendarMonth blockedDates={blocked} checkIn={checkIn} checkOut={checkOut} onPick={pickDate} maxDate={maxDate} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tinta-mute">
                <span>● Datas livres</span><span className="text-areia-400">● Ocupadas ou indisponíveis</span>
              </div>
            </>
          )}
          <p className="mt-2 text-xs text-tinta-soft">
            Check-in: {checkIn ? format(new Date(`${checkIn}T12:00:00`), "dd/MM/yyyy") : "selecione uma data"} · Check-out: {checkOut ? format(new Date(`${checkOut}T12:00:00`), "dd/MM/yyyy") : "selecione uma data"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="stay-adults">Adultos</label><select id="stay-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{Array.from({ length: capacity }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="label" htmlFor="stay-kids">Crianças</label><select id="stay-kids" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>{Array.from({ length: capacity + 1 }, (_, i) => i).map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        {nights > 0 && nights < minNights && <p className="text-xs text-red-700">Estadia mínima: {minNights} noite(s).</p>}
        {guests > capacity && <p className="text-xs text-red-700">Esta hospedagem acomoda até {capacity} pessoas.</p>}
        {unavailable && <p className="text-xs text-red-700">Há datas ocupadas nesse período. Escolha outras datas.</p>}
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa flex w-full justify-center">Consultar pelo WhatsApp</a> : <button type="button" disabled className="btn-turquesa w-full opacity-50">{valid ? "WhatsApp indisponível" : "Informe período e hóspedes"}</button>}
        {!phone && !DEFAULT_WHATSAPP_NUMBER && <p className="text-center text-xs text-tinta-mute">O WhatsApp de atendimento ainda não foi configurado.</p>}
        <p className="text-center text-xs text-tinta-mute">A equipe confirma disponibilidade e valores pelo WhatsApp.</p>
      </div>
    </div>
  );
}

export function TourInquiryWidget({
  name,
  phone,
  departures,
  maxGuests,
}: {
  name: string;
  phone?: string | null;
  departures: Departure[];
  maxGuests: number;
}) {
  const available = departures.filter((d) => d.status === "open" && d.capacity > d.seatsBooked && d.startsAt >= new Date().toISOString());
  const [date, setDate] = useState("");
  const [departureId, setDepartureId] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const sameDayDepartures = available.filter((d) => d.startsAt.slice(0, 10) === date);
  const departure = sameDayDepartures.find((d) => d.id === departureId);
  const guests = adults + children;
  const valid = Boolean(date && guests <= maxGuests && (!departure || guests <= departure.capacity - departure.seatsBooked));
  const when = date ? `${format(new Date(`${date}T12:00:00`), "EEEE, dd/MM/yyyy", { locale: ptBR })}${departure ? ` às ${format(new Date(departure.startsAt), "HH:mm")}` : " (horário a combinar)"}` : "";
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar este passeio:\n\n${name}\nData e horário desejados: ${when}\nParticipantes: ${adults} adulto(s)${children ? ` e ${children} criança(s)` : ""}\n\nPode confirmar as vagas e me informar o valor?`;
  const href = valid ? whatsappRequestUrl(phone, message) : null;

  return (
    <div className="card sticky top-24 overflow-hidden">
      <div className="border-b border-areia-200 bg-areia-50 px-5 py-4">
        <h2 className="font-semibold text-tinta">Consulte este passeio</h2>
        <p className="mt-1 text-xs text-tinta-mute">Informe a data e envie o pedido completo pelo WhatsApp.</p>
      </div>
      <div className="space-y-4 p-5">
        <div><label className="label" htmlFor="tour-date">Data desejada</label><input id="tour-date" type="date" min={todayIso()} className="input" value={date} onChange={(e) => { setDate(e.target.value); setDepartureId(""); }} /></div>{sameDayDepartures.length > 0 && <div><label className="label" htmlFor="tour-time">Horário disponível</label><select id="tour-time" className="input" value={departureId} onChange={(e) => setDepartureId(e.target.value)}><option value="">A combinar</option>{sameDayDepartures.map((d) => <option key={d.id} value={d.id}>{format(new Date(d.startsAt), "HH:mm")}</option>)}</select></div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="tour-adults">Adultos</label><select id="tour-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="label" htmlFor="tour-kids">Crianças</label><select id="tour-kids" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>{Array.from({ length: maxGuests + 1 }, (_, i) => i).map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        {guests > maxGuests && <p className="text-xs text-red-700">Este passeio aceita até {maxGuests} pessoas por pedido.</p>}
        {departure && guests > departure.capacity - departure.seatsBooked && <p className="text-xs text-red-700">Não há vagas suficientes nessa saída.</p>}
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa flex w-full justify-center">Consultar pelo WhatsApp</a> : <button type="button" disabled className="btn-turquesa w-full opacity-50">{valid ? "WhatsApp indisponível" : "Informe data e participantes"}</button>}
        {!phone && !DEFAULT_WHATSAPP_NUMBER && <p className="text-center text-xs text-tinta-mute">O WhatsApp de atendimento ainda não foi configurado.</p>}
        <p className="text-center text-xs text-tinta-mute">A equipe confirma as vagas e o valor pelo WhatsApp.</p>
      </div>
    </div>
  );
}
