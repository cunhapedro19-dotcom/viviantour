import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncCalendar } from "@/lib/calendar-sync";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const { data: cal } = await sb.from("external_calendars").select("property_id").eq("id", params.token).maybeSingle();
  if (!cal) return NextResponse.json({ error: "Calendário não encontrado ou sem permissão." }, { status: 404 });
  const { data: allowed, error } = await sb.rpc("can_manage_property_calendar", { p_property: cal.property_id });
  if (error || !allowed) return NextResponse.json({ error: "Sem permissão para este calendário." }, { status: 403 });
  try {
    const result = await syncCalendar(params.token);
    return NextResponse.json(result, { status: result.ok ? 200 : result.busy ? 409 : 422 });
  } catch {
    return NextResponse.json({ error: "Serviço indisponível. Confira a configuração do Supabase e as migrações." }, { status: 503 });
  }
}
