import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncCalendar } from "@/lib/calendar-sync";

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
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const now = new Date().toISOString();
  const { data: calendars, error } = await admin.from("external_calendars")
    .select("id").eq("active", true).lte("next_sync_at", now)
    .order("next_sync_at").limit(50);
  if (error) return NextResponse.json({ error: "Falha ao consultar calendários." }, { status: 503 });
  const deadline = Date.now() + 40000;
  for (let i = 0; i < (calendars ?? []).length && Date.now() < deadline; i += 3) {
    await Promise.all((calendars ?? []).slice(i, i + 3).map(async cal => {
      summary.calendarsChecked++;
      try {
        const result = await syncCalendar(cal.id);
        if (result.ok) summary.eventsUpserted += result.count ?? 0;
        else if (!result.busy) summary.failures.push(`${cal.id}: ${result.error}`);
      } catch {
        summary.failures.push(`${cal.id}: serviço indisponível`);
      }
    }));
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
