// Helpers for opening WhatsApp with pre-filled message
const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

/** Normalizes a phone to international format (defaults BR +55). */
export function normalizeWhatsappNumber(phone: string): string {
  const d = onlyDigits(phone);
  if (!d) return "";
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

const formatBRL = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

export interface ContextualMessageInput {
  kind: "lead" | "evaluation";
  customerName: string;
  deviceLabel: string;
  status?: string | null;
  couponCode?: string | null;
  finalValue?: number | null;
}

/** Builds a contextual WhatsApp message based on proposal state. */
export function buildContextualMessage(input: ContextualMessageInput): string {
  const firstName = (input.customerName || "").split(" ")[0] || "";
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const device = input.deviceLabel || "seu aparelho";

  if (input.status === "rejected") {
    return `${greeting} Sobre seu ${device} — temos outras opções pra você, posso te apresentar?`;
  }

  if (input.kind === "evaluation" && input.couponCode) {
    const val = formatBRL(input.finalValue);
    return `${greeting} Seu cupom *${input.couponCode}*${val ? ` de ${val}` : ""} para o ${device} está ativo. Posso te ajudar a usar agora mesmo?`;
  }

  if (input.kind === "lead") {
    return `${greeting} Vi que você começou a avaliar um ${device} aqui na Pollicell. Posso te ajudar a finalizar?`;
  }

  return `${greeting} Sobre sua avaliação do ${device}, posso te ajudar?`;
}
