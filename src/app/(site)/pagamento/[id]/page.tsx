"use client";

// ============================================================================
// PAGAMENTO DA RESERVA — /pagamento/<id>
//
//  · demo        : simulação no navegador (nenhum valor é cobrado)
//  · mercadopago : botão redireciona para o Checkout Pro; a confirmação
//                  chega pelo webhook e o status ?status= da volta mostra
//                  o andar da águia ("aprovado → confirme em instantes")
//  · manual      : Supabase conectado sem gateway — o cliente confirma
//                  após combinar com o fornecedor (RPC record_payment)
// ============================================================================

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { DEMO_MODE } from "@/lib/config";
import { createPayment, getBooking } from "@/lib/demo-store";
import { BOOKING_STATUS_LABEL, formatBRL, formatDateRange, formatDateTimeShort, formatTime } from "@/lib/format";
import { confirmPayment, fetchPaymentForBooking, startCheckout } from "@/lib/payments";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, PaymentStatus, PaymentView } from "@/lib/types";

type Phase = "loading" | "missing" | "paid" | "invalid" | "ready";

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "pendente",
  paid: "pago",
  failed: "recusado",
  refunded: "reembolsado",
};

export default function PagamentoPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [method, setMethod] = useState<"pix" | "cartao">("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnedStatus, setReturnedStatus] = useState<string | null>(null);

  const apply = useCallback((b: Booking, p: PaymentView | null) => {
    setBooking(b);
    setPayment(p);
    if (b.status === "awaiting_payment") setPhase("ready");
    else if (b.status === "confirmed" || b.status === "completed") setPhase("paid");
    else setPhase("invalid");
  }, []);

  const load = useCallback(async () => {
    setError(null);
    if (DEMO_MODE) {
      const b = getBooking(params.id);
      if (!b) {
        setPhase("missing");
        return;
      }
      let p = await fetchPaymentForBooking(params.id);
      if (!p && b.status === "awaiting_payment") {
        p = {
          id: `pay-${Date.now()}`,
          bookingId: params.id,
          status: "pending",
          method: null,
          provider: "demo",
          providerRef: null,
          amountCents: b.totalCents,
          createdAt: new Date().toISOString(),
        };
        createPayment(p);
      }
      apply(b, p ?? null);
      return;
    }

    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      window.location.href = `/entrar?next=/pagamento/${params.id}`;
      return;
    }
    const { data } = await sb
      .from("bookings")
      .select("*, property:properties(name,slug), service:services(name,slug), payments(*)")
      .eq("id", params.id)
      .maybeSingle();
    if (!data) {
      setPhase("missing");
      return;
    }
    const row = data as Record<string, unknown>;
    const payRow = ((row.payments as Record<string, unknown>[] | null) ?? [])[0];
    const mapped: Booking = {
      id: String(row.id),
      code: String(row.code),
      kind: row.kind as "stay" | "tour",
      itemId: String(row.property_id ?? row.service_id ?? ""),
      itemSlug: String(
        (row.property as { slug?: string } | null)?.slug ??
          (row.service as { slug?: string } | null)?.slug ??
          ""
      ),
      itemName: String(
        (row.property as { name?: string } | null)?.name ??
          (row.service as { name?: string } | null)?.name ??
          "Reserva"
      ),
      orgId: String(row.org_id),
      orgName: "",
      status: row.status as Booking["status"],
      checkIn: (row.check_in as string) ?? null,
      checkOut: (row.check_out as string) ?? null,
      nights: (row.nights as number) ?? null,
      startsAt: (row.starts_at as string) ?? null,
      endsAt: (row.ends_at as string) ?? null,
      adults: Number(row.adults),
      children: Number(row.children),
      guestsTotal: Number(row.guests_total),
      totalCents: Number(row.total_cents),
      commissionCents: Number(row.commission_cents),
      netCents: Number(row.net_cents),
      customerName: "",
      customerNote: null,
      cancellationReason: (row.cancellation_reason as string) ?? null,
      paymentStatus: payRow ? (payRow.status as PaymentStatus) : null,
      paymentMethod: payRow ? ((payRow.method as string) ?? null) : null,
      createdAt: String(row.created_at),
    };
    const mappedPayment: PaymentView | null = payRow
      ? {
          id: String(payRow.id),
          bookingId: String(payRow.booking_id),
          status: payRow.status as PaymentStatus,
          method: (payRow.method as string) ?? null,
          provider: (payRow.provider as string) ?? null,
          providerRef: (payRow.provider_ref as string) ?? null,
          amountCents: Number(payRow.amount_cents ?? 0),
          createdAt: String(payRow.created_at),
        }
      : null;
    apply(mapped, mappedPayment);
  }, [params.id, apply]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s) setReturnedStatus(s);
  }, []);

  async function pay(outcome: "paid" | "failed" = "paid") {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      if (!DEMO_MODE) {
        const start = await startCheckout(booking.id);
        if (start.mode === "mercadopago") {
          window.location.href = start.url;
          return;
        }
        if (start.mode === "manual" && start.error && outcome === "paid") {
          setError(start.error);
          return;
        }
        if (start.mode === "manual" && outcome === "paid") {
          const res = await confirmPayment(booking.id, "paid", "manual");
          if (!res.ok) {
            setError(res.error ?? "Não foi possível registrar o pagamento.");
            return;
          }
          await load();
          return;
        }
        return;
      }

      // modo demonstração
      const res = await confirmPayment(booking.id, outcome, method);
      if (!res.ok) {
        setError(res.error ?? "Não foi possível registrar o pagamento.");
        return;
      }
      await load();
      if (outcome === "failed") {
        setError("Pagamento recusado (simulação). Tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="container-x py-10">
        <div className="card mx-auto max-w-xl h-96 animate-pulse" />
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <div className="container-x py-10">
        <EmptyState
          title="Reserva não encontrada"
          description="Verifique o link ou acesse suas viagens para acompanhar as reservas."
          actionHref="/minhas-viagens"
          actionLabel="Minhas viagens"
        />
      </div>
    );
  }

  if (!booking) return null;

  const dateLine =
    booking.kind === "stay"
      ? `${formatDateRange(booking.checkIn, booking.checkOut)} · ${booking.nights ?? 0} noite(s)`
      : `${formatDateTimeShort(booking.startsAt ?? "")} · ${formatTime(booking.startsAt)}`;
  const listingHref = booking.kind === "stay" ? `/hospedagem/${booking.itemSlug}` : `/passeio/${booking.itemSlug}`;

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-tinta">Pagamento</h1>
          <p className="mt-1 text-sm text-tinta-mute">
            Reserva {booking.code} · {booking.guestsTotal}{" "}
            {booking.guestsTotal === 1 ? "hóspede" : "hóspedes"}
          </p>
        </header>

        {/* RESUMO */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href={listingHref} className="font-semibold text-tinta hover:text-oceano-700">
                {booking.itemName}
              </Link>
              <p className="mt-1 text-sm text-tinta-mute">{dateLine}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-tinta-mute">Total</p>
              <p className="font-display text-2xl font-bold text-tinta">{formatBRL(booking.totalCents)}</p>
            </div>
          </div>
        </div>

        {/* RETORNO DO MERCADO PAGO */}
        {returnedStatus === "approved" && phase === "ready" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Pagamento aprovado no Mercado Pago — a confirmação automática chega em
            instantes.{" "}
            <button type="button" onClick={() => load()} className="font-semibold underline">
              Verificar agora
            </button>
          </div>
        )}
        {returnedStatus === "pending" && phase === "ready" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Pagamento em processamento. Acompanhe em Minhas viagens — a reserva
            é confirmada automaticamente quando o pagamento cair.
          </div>
        )}
        {returnedStatus === "rejected" && phase === "ready" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            O Mercado Pago não aprovou o pagamento. Você pode tentar outro meio
            de pagamento abaixo.
          </div>
        )}

        {error && phase !== "paid" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* SUCESSO */}
        {phase === "paid" && (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-tinta">
              Pagamento aprovado — reserva confirmada!
            </h2>
            <p className="mt-2 text-sm text-tinta-mute">
              {booking.itemName} · {dateLine}
            </p>
            {payment && (
              <p className="mt-1 text-xs text-tinta-mute">
                Pagamento {PAYMENT_STATUS_LABEL[payment.status]}
                {payment.method ? ` · ${payment.method}` : ""}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/minhas-viagens" className="btn-turquesa">
                Ver minhas viagens
              </Link>
              <Link href={listingHref} className="btn-outline">
                Ver anúncio
              </Link>
            </div>
          </div>
        )}

        {/* AGUARDANDO PAGAMENTO */}
        {phase === "ready" && (
          <div className="card space-y-5 p-5">
            {DEMO_MODE ? (
              <>
                <div className="rounded-xl bg-areia-100 p-3 text-xs text-tinta-soft">
                  <strong>Modo demonstração</strong> — nenhuma cobrança é feita. Escolha
                  o meio e simule o resultado.
                </div>
                <div>
                  <p className="label mb-2">Meio de pagamento</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["pix", "cartao"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          method === m
                            ? "border-oceano-500 bg-oceano-50 text-oceano-700"
                            : "border-areia-200 bg-white text-tinta-soft hover:bg-areia-50"
                        }`}
                      >
                        {m === "pix" ? "PIX" : "Cartão de crédito"}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => pay("paid")} className="btn-turquesa w-full">
                  {busy ? "Processando…" : `Pagar ${formatBRL(booking.totalCents)} (simulado)`}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pay("failed")}
                  className="w-full text-xs text-tinta-mute underline hover:text-tinta-soft"
                >
                  Simular recusa do pagamento
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-tinta-mute">
                  Conclua o pagamento para confirmar a reserva com{" "}
                  <strong className="text-tinta-soft">{booking.orgName || "o fornecedor"}</strong>. As
                  datas já estão bloqueadas para você.
                </p>
                <button type="button" disabled={busy} onClick={() => pay("paid")} className="btn-turquesa w-full">
                  {busy ? "Iniciando…" : `Pagar ${formatBRL(booking.totalCents)}`}
                </button>
                <p className="text-center text-xs text-tinta-mute">
                  Pagamento processado com segurança. Sem gateway configurado, confirme
                  após combinar diretamente com o fornecedor.
                </p>
              </>
            )}
          </div>
        )}

        {/* OUTROS STATUS */}
        {phase === "invalid" && (
          <div className="card p-6 text-center">
            <p className="text-sm text-tinta-mute">
              Esta reserva não está aguardando pagamento — status atual:{" "}
              <strong className="text-tinta-soft">{BOOKING_STATUS_LABEL[booking.status]}</strong>.
            </p>
            <Link href="/minhas-viagens" className="btn-outline btn-sm mt-4 inline-flex">
              Minhas viagens
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
