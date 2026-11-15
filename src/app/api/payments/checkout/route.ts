import { NextResponse } from "next/server";
import { SITE } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ============================================================================
// POST /api/payments/checkout — inicia a cobrança de uma reserva.
//
// Entrada:  { bookingId }
// Saída:    { mode: "mercadopago", url }  → redireciona para o Checkout Pro
//           { mode: "manual" }            → gateway não configurado; o cliente
//                                           confirma o pagamento na página
//
// A preferência do Mercado Pago é criada no servidor com a chave secreta.
// O webhook /api/webhooks/mercadopago confirma o pagamento de verdade.
// ============================================================================

interface PreferenceResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export async function POST(request: Request) {
  let bookingId = "";
  try {
    const body = (await request.json()) as { bookingId?: string };
    bookingId = String(body.bookingId ?? "");
  } catch {
    // tratado abaixo
  }
  if (!bookingId) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, code, kind, status, total_cents, customer_id, property:properties(name), service:services(name)"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (booking.status !== "awaiting_payment") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    // Sem gateway: pagamento combinado com o fornecedor e confirmado
    // manualmente pelo cliente (RPC record_payment).
    return NextResponse.json({ mode: "manual" });
  }

  const itemName =
    (booking.property as { name?: string } | null)?.name ??
    (booking.service as { name?: string } | null)?.name ??
    String(booking.code);
  const base = SITE.url;
  const isHttps = base.startsWith("https://");

  const payload = {
    items: [
      {
        title: `${booking.kind === "stay" ? "Hospedagem" : "Passeio"} — ${itemName} (${booking.code})`,
        quantity: 1,
        unit_price: Number(booking.total_cents) / 100,
        currency_id: "BRL",
      },
    ],
    external_reference: String(booking.id),
    metadata: { booking_id: String(booking.id) },
    statement_descriptor: "VIVIANTOURR",
    back_urls: {
      success: `${base}/pagamento/${booking.id}?status=approved`,
      pending: `${base}/pagamento/${booking.id}?status=pending`,
      failure: `${base}/pagamento/${booking.id}?status=rejected`,
    },
    // auto_return exige https em produção; em localhost omitimos
    ...(isHttps ? { auto_return: "approved" } : {}),
    notification_url: `${base}/api/webhooks/mercadopago`,
  };

  let preference: PreferenceResponse;
  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return NextResponse.json({ mode: "manual", error: "GATEWAY_ERROR" });
    }
    preference = (await res.json()) as PreferenceResponse;
  } catch {
    return NextResponse.json({ mode: "manual", error: "GATEWAY_ERROR" });
  }

  const url = preference.init_point ?? preference.sandbox_init_point;
  if (!url) {
    return NextResponse.json({ mode: "manual", error: "GATEWAY_ERROR" });
  }

  await supabase.from("payments").insert({
    booking_id: booking.id,
    method: null,
    status: "pending",
    amount_cents: booking.total_cents,
    provider: "mercadopago",
    provider_ref: preference.id ?? null,
  });

  return NextResponse.json({ mode: "mercadopago", url });
}
