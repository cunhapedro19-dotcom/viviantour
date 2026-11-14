import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseICS } from "@/lib/ical";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * CRON — sincronização de calendários externos (iCal) + conclusão de reservas.
 *
 * Agende uma chamada periódica (ex.: de 15 em 15 minutos):
 *  · Vercel Cron (ver vercel.json / crons no dashboard) ou
 *  · Supabase pg_cron chamando esta URL, ou
 *  · qualquer agendador externo:
 *      GET /api/cron/sync-calendars
 *      Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase não configurado — defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }

  const summary = {
    calendarsChecked: 0,
    eventsUpserted: 0,
    eventsRemoved: 0,
    failures: [] as string[],
    bookingsCompleted: 0,
  };

  // 1. Calendários ativos com sync pendente (última sincronização > 10 min)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: calendars } = await admin
    .from("external_calendars")
    .select("id, property_id, source, ical_url, label, last_synced_at")
    .eq("active", true)
    .or(`last_synced_at.is.null,last_synced_at.lt.${tenMinAgo}`)
    .limit(50);

  for (const cal of calendars ?? []) {
    summary.calendarsChecked += 1;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(cal.ical_url, {
        signal: controller.signal,
        headers: { Accept: "text/calendar" },
        cache: "no-store",
      });
      clearTimeout(timer);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const events = parseICS(text);

      // substitui o conjunto de eventos do calendário
      const { data: existing } = await admin
        .from("calendar_events")
        .select("id, uid")
        .eq("external_calendar_id", cal.id);

      const existingUids = new Set((existing ?? []).map((e: { uid: string }) => e.uid));
      const incomingUids = new Set(events.map((e) => e.uid));

      if (events.length > 0) {
        const { error: upsertError } = await admin.from("calendar_events").upsert(
          events.map((e) => ({
            external_calendar_id: cal.id,
            uid: e.uid,
            summary: e.summary ?? null,
            starts_at: e.start.toISOString(),
            ends_at: e.end.toISOString(),
            all_day: e.allDay,
            status: e.status,
          })),
          { onConflict: "external_calendar_id,uid" }
        );
        if (upsertError) throw upsertError;
      }
      summary.eventsUpserted += events.length;

      const toRemove = (existing ?? [])
        .filter((e: { uid: string }) => !incomingUids.has(e.uid))
        .map((e: { id: string }) => e.id);
      if (toRemove.length > 0) {
        await admin.from("calendar_events").delete().in("id", toRemove);
        summary.eventsRemoved += toRemove.length;
      }

      await admin
        .from("external_calendars")
        .update({ last_synced_at: new Date().toISOString(), last_status: "ok", last_error: null })
        .eq("id", cal.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      summary.failures.push(`${cal.label ?? cal.id}: ${message}`);
      await admin
        .from("external_calendars")
        .update({ last_synced_at: new Date().toISOString(), last_status: "error", last_error: message })
        .eq("id", cal.id);
    }
  }

  // 2. Conclui reservas com datas passadas
  try {
    const { data } = await admin.rpc("complete_past_bookings");
    summary.bookingsCompleted = Number(data ?? 0);
  } catch {
    // função indiscreta em versões antigas — segue
  }

  return NextResponse.json({ ok: true, ...summary });
}
