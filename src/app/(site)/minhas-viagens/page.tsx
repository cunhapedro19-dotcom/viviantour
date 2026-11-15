"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookingCard } from "@/components/booking/BookingCard";
import { EmptyState } from "@/components/EmptyState";
import { DEMO_MODE } from "@/lib/config";
import { getDemoUser, listBookings } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Booking, PaymentStatus } from "@/lib/types";

export default function MinhasViagensPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  const load = useCallback(async () => {
    if (DEMO_MODE) {
      setBookings(listBookings());
      return;
    }
    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      window.location.href = "/entrar?next=/minhas-viagens";
      return;
    }
    const { data } = await sb
      .from("bookings")
      .select("*, property:properties(name,slug), service:services(name,slug), payments(status, method)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    setBookings(
      (data ?? []).map((b: Record<string, unknown>) => {
        const pay = ((b.payments as { status?: string; method?: string }[] | null) ?? [])[0];
        return {
          id: String(b.id),
          code: String(b.code),
          kind: b.kind as "stay" | "tour",
          itemId: String(b.property_id ?? b.service_id ?? ""),
          itemSlug: String((b.property as { slug?: string } | null)?.slug ?? (b.service as { slug?: string } | null)?.slug ?? ""),
          itemName: String((b.property as { name?: string } | null)?.name ?? (b.service as { name?: string } | null)?.name ?? "Reserva"),
          orgId: String(b.org_id),
          orgName: "",
          status: b.status as Booking["status"],
          checkIn: (b.check_in as string) ?? null,
          checkOut: (b.check_out as string) ?? null,
          nights: (b.nights as number) ?? null,
          startsAt: (b.starts_at as string) ?? null,
          endsAt: (b.ends_at as string) ?? null,
          adults: Number(b.adults),
          children: Number(b.children),
          guestsTotal: Number(b.guests_total),
          totalCents: Number(b.total_cents),
          commissionCents: Number(b.commission_cents),
          netCents: Number(b.net_cents),
          customerName: "",
          customerNote: (b.customer_note as string) ?? null,
          cancellationReason: (b.cancellation_reason as string) ?? null,
          paymentStatus: (pay?.status as PaymentStatus) ?? null,
          paymentMethod: pay?.method ?? null,
          createdAt: String(b.created_at),
        };
      })
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upcoming = (bookings ?? []).filter((b) => ["pending", "awaiting_payment", "confirmed"].includes(b.status));
  const past = (bookings ?? []).filter((b) => ["completed", "declined", "cancelled"].includes(b.status));

  return (
    <div className="container-x py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-tinta">Minhas viagens</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Acompanhe suas solicitações e reservas em Arraial do Cabo.
        </p>
      </header>

      {bookings === null ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="card h-40 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Nenhuma reserva por aqui (ainda)"
          description="Quando você solicitar uma hospedagem ou passeio, ele aparece aqui para acompanhamento."
          actionHref="/buscar"
          actionLabel="Explorar anúncios"
        />
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="section-title mb-4 text-xl">Em andamento ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-tinta-mute">Nada em andamento no momento.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} onChange={load} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="section-title mb-4 text-xl">Histórico ({past.length})</h2>
            {past.length === 0 ? (
              <p className="text-sm text-tinta-mute">Sem histórico ainda.</p>
            ) : (
              <div className="space-y-4">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} onChange={load} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {DEMO_MODE && !getDemoUser() && (
        <p className="mt-8 text-center text-sm text-tinta-mute">
          Você está explorando sem perfil de demonstração.{" "}
          <Link href="/entrar" className="font-semibold text-oceano-600 hover:underline">
            Escolha um perfil
          </Link>{" "}
          para simular o fluxo completo.
        </p>
      )}
    </div>
  );
}
