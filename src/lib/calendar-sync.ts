import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "./supabase/admin";
import { fetchCalendar } from "./calendar-fetch";
import { parseICS } from "./ical";

function nextSyncTime() {
  const next = new Date();
  next.setUTCHours(9, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export async function syncCalendar(id: string) {
  const admin = createSupabaseAdminClient();
  const token = randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc("claim_calendar_sync", { p_id: id, p_token: token });
  if (claimError) throw new Error("Não foi possível iniciar a sincronização. Verifique a migração do banco.");
  if (!claimed) return { ok: false, busy: true, error: "Calendário já está sincronizando ou está inativo." };
  try {
    const { data: cal, error } = await admin.from("external_calendars").select("ical_url").eq("id", id).single();
    if (error || !cal) throw new Error("Calendário não encontrado.");
    const raw = await fetchCalendar(cal.ical_url);
    const events = [...new Map(parseICS(raw).map(e => [e.uid, e])).values()];
    const { data: count, error: saveError } = await admin.rpc("finish_calendar_sync", {
      p_id: id, p_token: token,
      p_events: events.map(e => ({ uid: e.uid, summary: e.summary ?? null, starts_at: e.start.toISOString(),
        ends_at: e.end.toISOString(), all_day: e.allDay, status: e.status })),
    });
    if (saveError) throw new Error("Não foi possível salvar os períodos. Os bloqueios anteriores foram preservados.");
    return { ok: true, count: Number(count) };
  } catch (err) {
    const original = err instanceof Error ? err.message : "";
    const message = /abort|timeout/i.test(original) ? "O calendário demorou demais para responder. Tente novamente mais tarde."
      : /ENOTFOUND|ECONN|EAI_|certificate|TLS/i.test(original) ? "Não foi possível acessar a URL. Confira o endereço e se o calendário está disponível sem login."
      : original || "Não foi possível sincronizar o calendário.";
    const { error } = await admin.from("external_calendars").update({ last_status: "error", last_error: message,
      next_sync_at: nextSyncTime(), sync_started_at: null, sync_token: null,
    }).eq("id", id).eq("sync_token", token);
    if (error) throw new Error("Falha ao registrar o resultado da sincronização.");
    return { ok: false, error: message };
  }
}
