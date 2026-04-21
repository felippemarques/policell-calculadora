// Helpers for opening WhatsApp with pre-filled message
const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

/** Normalizes a phone to international format (defaults BR +55). */
export function normalizeWhatsappNumber(phone: string): string {
  const d = onlyDigits(phone);
  if (!d) return "";
  // already has country code (12+ digits)
  if (d.length >= 12) return d;
  return `55${d}`;
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const num = normalizeWhatsappNumber(phone);
  const text = encodeURIComponent(message);
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openWhatsapp(phone: string, message: string) {
  const url = buildWhatsappUrl(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}
