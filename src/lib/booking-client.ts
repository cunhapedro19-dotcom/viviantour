"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

// Modo Supabase: chama a RPC create_booking_request (controle de
// concorrência feito no banco). Modo demo: tratado no componente.

const ERROR_MAP: Record<string, string> = {
  AUTH_REQUIRED: "Entre na sua conta para solicitar a reserva.",
  MISSING_FIELDS: "Preencha todas as informações da reserva.",
  INVALID_DATES: "As datas escolhidas não são válidas.",
  MIN_NIGHTS: "Este anúncio tem estadia mínima maior que o período selecionado.",
  CAPACITY_EXCEEDED: "Quantidade de hóspedes acima da capacidade.",
  NOT_AVAILABLE: "Ops! Essas datas acabaram de ficar ocupadas.",
  PROPERTY_NOT_FOUND: "Anúncio não disponível no momento.",
  DEPARTURE_NOT_FOUND: "Saída não encontrada.",
  DEPARTURE_UNAVAILABLE: "Essa saída não está mais disponível.",
  DEPARTURE_PAST: "Essa saída já aconteceu.",
  NO_SEATS: "Não há vagas suficientes nesta saída.",
  SERVICE_NOT_FOUND: "Passeio não disponível no momento.",
  INVALID_GUESTS: "Informe pelo menos um hóspede.",
};

export interface RealBookingInput {
  kind: "stay" | "tour";
  propertyId?: string;
  serviceId?: string;
  departureId?: string;
  adults: number;
  children: number;
  checkIn?: string;
  checkOut?: string;
  note?: string;
  phone?: string;
}

export type BookingRequestResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string; needsAuth?: boolean };

export async function createBookingRequest(input: RealBookingInput): Promise<BookingRequestResult> {
  const sb = getSupabaseBrowserClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { ok: false, error: ERROR_MAP.AUTH_REQUIRED, needsAuth: true };
  }

  const { data, error } = await sb.rpc("create_booking_request", {
    p_kind: input.kind,
    p_property_id: input.propertyId ?? null,
    p_service_id: input.serviceId ?? null,
    p_departure_id: input.departureId ?? null,
    p_adults: input.adults,
    p_children: input.children,
    p_check_in: input.checkIn ?? null,
    p_check_out: input.checkOut ?? null,
    p_customer_note: input.note ?? null,
    p_contact_phone: input.phone ?? null,
  });

  if (error) {
    const key = Object.keys(ERROR_MAP).find((k) => error.message.includes(k));
    return {
      ok: false,
      error: key ? ERROR_MAP[key] : "Não foi possível concluir a solicitação. Tente novamente.",
    };
  }

  return { ok: true, bookingId: String(data) };
}

/** Cancelamento do cliente (chama cancel_booking no banco). */
export async function cancelBookingRequest(bookingId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason || null,
  });
  if (error) {
    return { ok: false, error: "Não foi possível cancelar a reserva." };
  }
  return { ok: true };
}
