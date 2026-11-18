import ICAL from "ical.js";

/**
 * Parser e gerador iCalendar; ICAL.js expande recorrências e suas exceções.
 *
 * Suporta o essencial dos feeds do Airbnb (e similares):
 * - DTSTART/DTEND com VALUE=DATE (dia inteiro, DTEND exclusivo)
 * - DTSTART/DTEND com horário UTC (…T000000Z)
 * - Linhas dobradas (continuação com espaço/tab)
 * - STATUS:CANCELLED é ignorado
 *
 * Recorrências são expandidas em uma janela móvel de um ano passado e três
 * anos futuros, com limites de processamento. A sincronização não é instantânea.
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

export function parseICS(raw: string, now = new Date()): ICalEvent[] {
  if (!/^BEGIN:VCALENDAR\s*$/mi.test(raw) || !/^END:VCALENDAR\s*$/mi.test(raw)) {
    throw new Error("Calendário inválido. Use o link de exportação iCal (.ics), sem página de login.");
  }
  // Recurrence rules in VTIMEZONE describe daylight saving, not reservations.
  // Inspect VEVENT components only and expand recurring families together.
  let root: InstanceType<typeof ICAL.Component>;
  try { root = new ICAL.Component(ICAL.parse(raw)); }
  catch { throw new Error("Calendário iCal inválido ou incompleto. Os bloqueios anteriores foram preservados."); }
  const components = root.getAllSubcomponents("vevent");
  const recurringUids = new Set<string>();
  for (const component of components) {
    if (["rrule", "rdate", "exdate", "recurrence-id"].some(name => component.hasProperty(name))) {
      const uid = component.getFirstPropertyValue("uid");
      if (typeof uid !== "string" || !uid) throw new Error("Evento recorrente sem identificador UID válido.");
      recurringUids.add(uid);
    }
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
        if (!recurringUids.has(current.UID?.[0]?.value ?? "")) {
          const ev = buildEvent(current);
          if (ev) events.push(ev);
        }
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
  return [...events, ...expandRecurringComponents(components, recurringUids, now)];
}

function expandRecurringComponents(
  components: InstanceType<typeof ICAL.Component>[], uids: Set<string>, now: Date
): ICalEvent[] {
  const out = new Map<string, ICalEvent>();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const until = new Date(now);
  until.setUTCFullYear(until.getUTCFullYear() + 3);
  const deadline = Date.now() + 5000;
  let steps = 0;
  const toDate = (time: InstanceType<typeof ICAL.Time>, component: InstanceType<typeof ICAL.Component>, name: string) => {
    const prop = component.getFirstProperty(name) ?? component.getFirstProperty("dtstart");
    const tzid = String(prop?.getParameter("tzid") ?? time.zone?.tzid ?? "floating");
    // Embedded timezone definitions also support custom Apple TZIDs.
    if (!time.isDate && time.zone?.component) return time.toJSDate();
    return parseIcsDate(time.toICALString(), {
      ...(time.isDate ? { VALUE: "DATE" } : {}),
      ...(!["floating", "UTC", "Z"].includes(tzid) ? { TZID: tzid } : {}),
    }).date;
  };
  const append = (item: InstanceType<typeof ICAL.Event>, startTime: InstanceType<typeof ICAL.Time>, endTime: InstanceType<typeof ICAL.Time>, uid: string) => {
    const status = String(item.component.getFirstPropertyValue("status") ?? "confirmed").toLowerCase();
    if (status === "cancelled" || String(item.component.getFirstPropertyValue("transp")).toUpperCase() === "TRANSPARENT") return;
    const start = toDate(startTime, item.component, "dtstart");
    const end = toDate(endTime, item.component, "dtend");
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error("Evento recorrente contém um período inválido.");
    if (end <= from || start >= until) return;
    if (out.size >= 10000) throw new Error("Calendário com mais de 10.000 ocupações recorrentes. Os bloqueios anteriores foram preservados.");
    out.set(uid, { uid, summary: item.summary, start, end, allDay: startTime.isDate, status });
  };
  const identity = (uid: string, time: InstanceType<typeof ICAL.Time>, component: InstanceType<typeof ICAL.Component>, name: string) =>
    `${uid}::${time.isDate ? time.toString() : toDate(time, component, name).toISOString()}`;
  try {
    for (const component of components) {
      const uid = String(component.getFirstPropertyValue("uid") ?? "");
      if (!uids.has(uid) || component.hasProperty("recurrence-id")) continue;
      if (String(component.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED") continue;
      const exceptions = components.filter(c => c.hasProperty("recurrence-id") && c.getFirstPropertyValue("uid") === uid);
      const exceptionById = new Map(exceptions.map(c => {
        const exception = new ICAL.Event(c);
        return [identity(uid, exception.recurrenceId, c, "recurrence-id"), exception];
      }));
      const event = new ICAL.Event(component, { exceptions: exceptions.filter(c => String(c.getFirstPropertyValue("status")).toUpperCase() !== "CANCELLED") });
      if (!component.hasProperty("dtstart")) throw new Error("Evento recorrente sem data de início.");
      // Validate dates before ICAL.js normalizes them during iteration.
      for (const prop of unfold(component.toString()).map(parseProp)) {
        if (prop && ["DTSTART", "DTEND"].includes(prop.name)) {
          const { TZID: _tzid, ...params } = prop.params;
          if (!Number.isFinite(parseIcsDate(prop.value, params).date.getTime())) throw new Error("Data inválida no calendário.");
        }
      }
      const iterator = event.iterator();
      let occurrence;
      while ((occurrence = iterator.next())) {
        if (++steps > 100000 || Date.now() > deadline) throw new Error("Calendário com recorrências muito extensas. Os bloqueios anteriores foram preservados.");
        if (toDate(occurrence, component, "dtstart") >= until) break;
        const key = identity(uid, occurrence, component, "dtstart");
        const exception = exceptionById.get(key);
        if (exception) {
          if (String(exception.component.getFirstPropertyValue("status")).toUpperCase() !== "CANCELLED") {
            append(exception, exception.startDate, exception.endDate, key);
          }
          continue;
        }
        const details = event.getOccurrenceDetails(occurrence);
        append(details.item, details.startDate, details.endDate, key);
      }
    }
    // Detached exceptions can exist without their master event in exported feeds.
    // Also covers exceptions moved into the window from a later recurrence date.
    for (const component of components) {
      if (!component.hasProperty("recurrence-id")) continue;
      if (String(component.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED") continue;
      const master = components.find(c => !c.hasProperty("recurrence-id") && c.getFirstPropertyValue("uid") === component.getFirstPropertyValue("uid"));
      if (master && String(master.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED") continue;
      const event = new ICAL.Event(component);
      const uid = identity(event.uid, event.recurrenceId, component, "recurrence-id");
      if (!out.has(uid)) append(event, event.startDate, event.endDate, uid);
    }
  } catch (err) {
    throw new Error(`Não foi possível interpretar as recorrências: ${err instanceof Error ? err.message : "regra inválida"}`);
  }
  return [...out.values()];
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
