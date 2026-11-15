"use client";

// ============================================================================
// PAGAMENTOS — camada dual-mode da Fase 7.
//
// Fluxo da reserva: pending → (fornecedor aceita) awaiting_payment →
// (cliente paga) confirmed. A comissão é calculada na aceitação; o pagamento
// é o gatilho da confirmação final.
//
// Três estratégias de cobrança:
//  · demo        — modo demonstração: pagamento simulado no navegador
//  · mercadopago — Checkout Pro (redirect). A preferência é criada no
//                  servidor (/api/payments/checkout) e a confirmação chega
//                  pelo webhook (/api/webhooks/mercadopago) via service_role
//  · manual      — Supabase conectado sem gateway: acerto direto com o
//                  fornecedor; o cliente confirma aqui (RPC record_payment)
// ============================================================================

import { DEMO_MODE } from "./config";
import {
  createPayment,
  getBooking,
  getPaymentByBooking,
  updateBookingStatus,
  updatePaymentStatus,
} from "./demo-store";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { PaymentStatus, PaymentView } from "./types";

export type CheckoutMode = "demo" | "mercadopago" | "manual";

export type CheckoutStart =
  | { mode: "demo" }
  | { mode: "mercadopago"; url: string }
  | { mode: "manual"; error?: string };

function mapPaymentRow(row: Record<string, unknown>): PaymentView {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    status: row.status as PaymentStatus,
    method: (row.method as string) ?? null,
    provider: (row.provider as string) ?? null,
    providerRef: (row.provider_ref as string) ?? null,
    amountCents: Number(row.amount_cents ?? 0),
    createdAt: String(row.created_at),
  };
}

export async function fetchPaymentForBooking(bookingId: string): Promise<PaymentView | null> {
  if (DEMO_MODE) {
    return getPaymentByBooking(bookingId) ?? null;
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  return row ? mapPaymentRow(row) : null;
}

/**
 * Decide como a cobrança acontece. No modo real pergunta ao servidor,
 * que responde com a URL do Checkout Pro ou sinaliza o modo manual
 * (gateway não configurado).
 */
export async function startCheckout(bookingId: string): Promise<CheckoutStart> {
  if (DEMO_MODE) {
    return { mode: "demo" };
  }
  try {
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      mode?: string;
      url?: string;
      error?: string;
    };
    if (res.ok && body.mode === "mercadopago" && body.url) {
      return { mode: "mercadopago", url: body.url };
    }
    if (res.ok && body.mode === "manual") {
      return { mode: "manual" };
    }
    return { mode: "manual", error: body.error ?? "Não foi possível iniciar o pagamento." };
  } catch {
    return { mode: "manual", error: "Falha de conexão ao iniciar o pagamento." };
  }
}

/**
 * Registra o resultado do pagamento.
 *  · demo: grava no demo-store e confirma a reserva localmente
 *  · real: chama a RPC record_payment (permitida ao dono da reserva;
 *    o webhook do gateway usa a mesma RPC via service_role)
 */
export async function confirmPayment(
  bookingId: string,
  status: Extract<PaymentStatus, "paid" | "failed">,
  method: string
): Promise<{ ok: boolean; error?: string }> {
  if (DEMO_MODE) {
    const existing = getPaymentByBooking(bookingId);
    if (!existing) {
      const booking = getBooking(bookingId);
      createPayment({
        id: `pay-${Date.now()}`,
        bookingId,
        status,
        method,
        provider: "demo",
        providerRef: null,
        amountCents: booking?.totalCents ?? 0,
        createdAt: new Date().toISOString(),
      });
    } else {
      updatePaymentStatus(bookingId, status, method);
    }
    if (status === "paid") {
      updateBookingStatus(bookingId, "confirmed");
    }
    return { ok: true };
  }

  const sb = getSupabaseBrowserClient();
  const { error } = await sb.rpc("record_payment", {
    p_booking_id: bookingId,
    p_status: status,
    p_method: method,
    p_provider: null,
    p_provider_ref: null,
    p_raw: null,
  });
  if (error) {
    const message = error.message.includes("INVALID_STATUS")
      ? "Esta reserva já foi processada."
      : error.message.includes("FORBIDDEN")
      ? "Você não tem permissão para registrar este pagamento."
      : "Não foi possível registrar o pagamento. Tente novamente.";
    return { ok: false, error: message };
  }
  return { ok: true };
}
