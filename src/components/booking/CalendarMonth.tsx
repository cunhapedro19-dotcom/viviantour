"use client";

import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

export function CalendarMonth({
  blockedDates,
  checkIn,
  checkOut,
  onPick,
  maxDate,
}: {
  blockedDates: Set<string>;
  checkIn?: string | null;
  checkOut?: string | null;
  onPick: (date: string) => void;
  maxDate?: string;
}) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const weeks = useMemo(() => buildWeeks(cursor), [cursor]);

  const today = startOfDay(new Date());

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-areia-100"
          aria-label="Mês anterior"
          disabled={cursor <= today}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-tinta-soft">
            <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-sm font-semibold capitalize text-tinta">
          {format(cursor, "MMMM yyyy", { locale: ptBR })}
        </p>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-areia-100"
          aria-label="Próximo mês"
          disabled={Boolean(maxDate && cursor >= new Date(new Date(`${maxDate}T12:00:00`).getFullYear(), new Date(`${maxDate}T12:00:00`).getMonth(), 1))}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-tinta-soft">
            <path d="M7.5 4.5L13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="py-1 text-[11px] font-semibold text-tinta-mute">
            {d}
          </span>
        ))}
        {weeks.flat().map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />;
          const iso = format(day, "yyyy-MM-dd");
          const isPast = isBefore(day, today);
          const isBlocked = blockedDates.has(iso);
          const isCheckoutCandidate = Boolean(checkIn && !checkOut && iso > checkIn);
          let crossesBlockedNight = false;
          if (isCheckoutCandidate && checkIn) {
            const cursor = new Date(`${checkIn}T12:00:00`);
            while (format(cursor, "yyyy-MM-dd") < iso) {
              if (blockedDates.has(format(cursor, "yyyy-MM-dd"))) {
                crossesBlockedNight = true;
                break;
              }
              cursor.setDate(cursor.getDate() + 1);
            }
          }
          // A blocked day can still be a checkout day: occupancy ends at checkout.
          const disabled = isPast || (maxDate ? iso > maxDate : false) || (isBlocked && !isCheckoutCandidate) || crossesBlockedNight;
          const isCheckIn = checkIn === iso;
          const isCheckOut = checkOut === iso;
          const inRange =
            checkIn && checkOut && iso > checkIn && iso < checkOut;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onPick(iso)}
              className={[
                "mx-auto grid h-9 w-9 place-items-center rounded-full text-sm transition",
                disabled ? "cursor-not-allowed text-areia-400 line-through decoration-areia-300" : "text-tinta hover:bg-turquesa-100",
                inRange ? "bg-turquesa-50 rounded-none" : "",
                isCheckIn || isCheckOut ? "bg-oceano-600 font-bold text-white hover:bg-oceano-700" : "",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildWeeks(firstOfMonth: Date): (Date | null)[][] {
  const year = firstOfMonth.getFullYear();
  const month = firstOfMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();

  const cells: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
