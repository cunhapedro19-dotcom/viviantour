import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ============================================================================
// POST /api/webhooks/mercadopago — notificações do Mercado Pago.
//
// O corpo do webhook NUNCA é confiável: buscamos o pagamento direto na API
// do Mercado Pago com a chave secreta e só então gravamos o resultado via
// service_role, chamando a RPC record_payment (idempotente).
//
// Configure no painel do Mercado Pago (Suas integrações → Webhooks):
//   URL: https://SEU-DOMINIO/api/webhooks/mercadopago
//   Evento: Pagamentos
// ============================================================================

const STATUS_MAP: Record<string, "paid" | "failed" | "refunded" | "pending"> = {
  approved: "paid",
  authorized: "pending",
  in_process: "pending",
  pending: "pending",
  rejected: "failed",
  cancelled: "failed",
  refunded: "refunded",
  charged_back: "refunded",
};

interface WebhookBody {
  type?: string;
  topic?: string;
  action?: string;
  id?: string | number;
  data?: { id?: string | number };
}

export async function POST(request: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    // gateway não configurado — nada a fazer, responde 200 para parar retries
    return NextResponse.json({ received: true });
  }

  let paymentId = "";
  let topic = "";
  try {
    const body = (await request.json()) as WebhookBody;
    paymentId = String(body?.data?.id ?? body?.id ?? "");
    topic = body?.type ?? body?.topic ?? "";
  } catch {
    // payload inválido — segue para a checagem da query string
  }

  const url = new URL(request.url);
  paymentId =
    paymentId ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    "";
  topic =
    topic ||
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    "";

  if (!paymentId || (topic && topic !== "payment")) {
    return NextResponse.json({ received: true });
  }

  let mpStatus = "";
  let bookingId = "";
  let method: string | null = null;
  let raw: unknown = null;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      // pagamento inexistente/erro de API — 200 evita loop de retries
      return NextResponse.json({ received: true });
    }
    const payment = (await res.json()) as {
      status?: string;
      external_reference?: string;
      payment_method_id?: string;
    };
    mpStatus = payment.status ?? "";
    bookingId = payment.external_reference ?? "";
    method = payment.payment_method_id ?? null;
    raw = payment;
  } catch {
    return NextResponse.json({ received: true });
  }

  const mapped = STATUS_MAP[mpStatus];
  if (!bookingId || !mapped) {
    return NextResponse.json({ received: true });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.rpc("record_payment", {
      p_booking_id: bookingId,
      p_status: mapped,
      p_method: method,
      p_provider: "mercadopago",
      p_provider_ref: paymentId,
      p_raw: raw,
    });
    if (error) {
      // falha de gravação — 500 faz o Mercado Pago reenviar a notificação
      return NextResponse.json({ received: false }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
