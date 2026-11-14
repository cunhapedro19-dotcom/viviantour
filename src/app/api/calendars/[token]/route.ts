import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAvailabilityICS } from "@/lib/ical";

export const dynamic = "force-dynamic";

/**
 * FEED DE DISPONIBILIDADE (exportação) — ICS por imóvel.
 * URL segura com token: /api/calendars/<feed_token>
 * O anfitrião pode importar esta URL no Airbnb/Booking para espelhar
 * as reservas do Viviantourr lá dentro.
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return new Response("Supabase não configurado.", { status: 503 });
  }

  const { data: property } = await admin
    .from("properties")
    .select("id, name, feed_token")
    .eq("feed_token", params.token)
    .maybeSingle();

  if (!property) {
    return new Response("Feed não encontrado.", { status: 404 });
  }

  // reservas confirmadas/aguardando pagamento
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, check_in, check_out")
    .eq("property_id", property.id)
    .in("status", ["confirmed", "awaiting_payment"])
    .gte("check_out", new Date().toISOString().slice(0, 10));

  // bloqueios manuais
  const { data: blocks } = await admin
    .from("property_blocks")
    .select("id, start_date, end_date")
    .eq("property_id", property.id)
    .gte("end_date", new Date().toISOString().slice(0, 10));

  const ranges = [
    ...(bookings ?? []).map((b: { id: string; check_in: string; check_out: string }) => ({
      uid: `booking-${b.id}@viviantourr`,
      start: b.check_in,
      end: b.check_out,
      summary: "Reservado (Viviantourr)",
    })),
    ...(blocks ?? []).map((b: { id: string; start_date: string; end_date: string }) => ({
      uid: `block-${b.id}@viviantourr`,
      start: b.start_date,
      end: b.end_date,
      summary: "Bloqueado",
    })),
  ];

  const ics = buildAvailabilityICS(ranges, `Viviantourr — ${property.name}`);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="viviantourr-${property.feed_token}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
