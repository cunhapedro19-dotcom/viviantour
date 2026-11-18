/**
 * Parser e gerador de iCalendar (ICS) — sem dependências externas.
 *
 * Suporta o essencial dos feeds do Airbnb (e similares):
 * - DTSTART/DTEND com VALUE=DATE (dia inteiro, DTEND exclusivo)
 * - DTSTART/DTEND com horário UTC (…T000000Z)
 * - Linhas dobradas (continuação com espaço/tab)
 * - STATUS:CANCELLED é ignorado
 *
 * Limitações conhecidas (intencionais): não prometemos sincronização
 * instantânea nem leitura de RRULEs complexas — feeds de marketplace
 * expõem noites ocupadas como eventos concretos.
 */

export interface ICalEvent {
  uid: string;
  summary?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status: string;
}

interface RawProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfold(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if (
      line.length > 0 &&
      (line.startsWith(" ") || line.startsWith("\t")) &&
      lines.length > 0
    ) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseProp(line: string): RawProp | null {
  const colon = findColon(line);
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1).trim();

  const parts = head.split(";");
  const name = (parts.shift() ?? "").trim().toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq > 0) {
      params[p.slice(0, eq).trim().toUpperCase()] = p.slice(eq + 1).trim().replace(/^"|"$/g, "");
    }
  }
  return { name, params, value };
}

// não separar dentro de aspas (TZID="America/Sao_Paulo":...)
function findColon(line: string): number {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === ":" && !inQuotes) return i;
  }
  return -1;
}

function parseIcsDate(value: string, params: Record<string, string>): { date: Date; allDay: boolean } {
  const v = value.trim();

  // 20261120 → dia inteiro (meio-dia UTC evita deslocamentos de fuso)
  if (params.VALUE === "DATE" || /^\d{8}$/.test(v)) {
    if (!/^\d{8}$/.test(v)) throw new Error("Data inválida no calendário.");
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    if (new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10).replace(/-/g, "") !== v) throw new Error("Data inválida no calendário.");
    return { date: new Date(Date.UTC(y, m - 1, d, 12, 0, 0)), allDay: true };
  }

  // 20261120T140000Z → UTC | 20261120T140000 → flutuante (assume -03:00)
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (m) {
    const [, y, mo, d, h, mi, s, z] = m;
    if (+h > 23 || +mi > 59 || +s > 59 || new Date(Date.UTC(+y, +mo - 1, +d)).toISOString().slice(0, 10).replace(/-/g, "") !== `${y}${mo}${d}`) throw new Error("Data inválida no calendário.");
    const utc = z === "Z" ? Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) : Date.UTC(+y, +mo - 1, +d, +h + 3, +mi, +s);
    let date = new Date(utc);
    if (!z && params.TZID) {
      const target = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
      const formatter = new Intl.DateTimeFormat("en-US", { timeZone: params.TZID,
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
      date = new Date(target);
      for (let i = 0; i < 3; i++) {
        const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
        const rendered = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
        date = new Date(date.getTime() + target - rendered);
      }
    }
    return { date, allDay: false };
  }

  // fallback: ISO parseável
  return { date: new Date(NaN), allDay: false };
}

export function parseICS(raw: string): ICalEvent[] {
  if (!/^BEGIN:VCALENDAR\s*$/mi.test(raw) || !/^END:VCALENDAR\s*$/mi.test(raw)) {
    throw new Error("Calendário inválido. Use o link de exportação iCal (.ics), sem página de login.");
  }
  if (/^(RRULE|RDATE|EXDATE|RECURRENCE-ID)[;:]/mi.test(raw)) {
    throw new Error("Este calendário contém recorrências ainda não suportadas. Exporte os períodos como eventos individuais. Os bloqueios anteriores foram preservados.");
  }
  const events: ICalEvent[] = [];
  const lines = unfold(raw);
  if (lines.filter(l => l.trim().toUpperCase() === "BEGIN:VEVENT").length !== lines.filter(l => l.trim().toUpperCase() === "END:VEVENT").length) {
    throw new Error("Calendário inválido: eventos incompletos. Os bloqueios anteriores foram preservados.");
  }

  let current: Record<string, RawProp[]> | null = null;
  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      if (current) throw new Error("Calendário inválido: evento incompleto.");
      current = {};
      continue;
    }
    if (upper === "END:VEVENT") {
      if (current) {
        const ev = buildEvent(current);
        if (ev) events.push(ev);
      }
      current = null;
      continue;
    }
    if (current) {
      const prop = parseProp(line);
      if (prop) {
        (current[prop.name] ??= []).push(prop);
      }
    }
  }
  if (current) throw new Error("Calendário inválido: evento incompleto.");
  return events;
}

function buildEvent(props: Record<string, RawProp[]>): ICalEvent | null {
  const first = (name: string) => props[name]?.[0];
  const dtStart = first("DTSTART");
  const dtEnd = first("DTEND");
  if (!dtStart && first("STATUS")?.value.toUpperCase() !== "CANCELLED") throw new Error("Evento sem data de início. Confira o calendário de origem.");
  if (!dtStart) return null;
  if (first("TRANSP")?.value.toUpperCase() === "TRANSPARENT") return null;

  const status = (first("STATUS")?.value ?? "confirmed").toLowerCase();
  if (status === "cancelled") return null;

  const startInfo = parseIcsDate(dtStart.value, dtStart.params);
  let endInfo = dtEnd
    ? parseIcsDate(dtEnd.value, dtEnd.params)
    : { date: new Date(startInfo.date.getTime() + 24 * 3600 * 1000), allDay: startInfo.allDay };

  if (Number.isNaN(startInfo.date.getTime())) throw new Error("Calendário contém uma data inválida.");
  if (Number.isNaN(endInfo.date.getTime()) || endInfo.date <= startInfo.date) {
    throw new Error("Calendário contém um período inválido (fim anterior ao início).");
  }

  return {
    uid: first("UID")?.value ?? `${dtStart.value}-${dtEnd?.value ?? "one-day"}-${first("SUMMARY")?.value ?? "busy"}`,
    summary: first("SUMMARY")?.value,
    start: startInfo.date,
    end: endInfo.date,
    allDay: startInfo.allDay || endInfo.allDay,
    status,
  };
}

// ---------------------------------------------------------------------------
// Geração de feed (exportação de disponibilidade)
// ---------------------------------------------------------------------------

export interface IcsRange {
  uid: string;
  start: string | Date; // inclusivo
  end: string | Date; // exclusivo
  summary?: string;
}

function icsDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildAvailabilityICS(ranges: IcsRange[], calendarName: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Viviantourr//Disponibilidade//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];
  for (const r of ranges) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.start).slice(0, 8)}`,
      `DTEND;VALUE=DATE:${icsDate(r.end).slice(0, 8)}`,
      `SUMMARY:${escapeIcs(r.summary ?? "Reservado")}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
