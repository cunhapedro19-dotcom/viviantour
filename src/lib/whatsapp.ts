import { DEFAULT_WHATSAPP_NUMBER } from "./config";

export function whatsappRequestUrl(phone: string | null | undefined, message: string): string | null {
  const digits = (phone || DEFAULT_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!digits) return null;
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
