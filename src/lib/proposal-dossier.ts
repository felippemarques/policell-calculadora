// Builds a plain-text "dossier" of a proposal for sales team to copy/paste.
import { formatImei } from "@/lib/imei";

const formatBRL = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

export interface DossierInput {
  kind: "lead" | "evaluation";
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deviceLabel: string;
  imei?: string | null;
  flowType?: string | null;
  status?: string | null;
  finalValue?: number | null;
  couponCode?: string | null;
  address?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  pendingItems?: string[];
  rejectionReason?: string | null;
}

export function buildDossierText(d: DossierInput): string {
  const lines: string[] = [];
  const flow = d.flowType === "sale" ? "Venda" : "Troca";
  const statusLabel =
    d.status === "completed"
      ? "Concluído"
      : d.status === "rejected"
        ? "Rejeitado"
        : "Em andamento";

  lines.push(`Cliente: ${d.customerName} — ${d.customerPhone}`);
  if (d.customerEmail) lines.push(`Email: ${d.customerEmail}`);
  lines.push(`Aparelho: ${d.deviceLabel}`);
  if (d.imei) lines.push(`IMEI: ${formatImei(d.imei)}`);
  lines.push(`Modalidade: ${flow} · ${statusLabel}`);

  if (typeof d.finalValue === "number") {
    const cup = d.couponCode ? ` (cupom: ${d.couponCode})` : "";
    lines.push(`Valor estimado: ${formatBRL(d.finalValue)}${cup}`);
  }

  if (d.address) {
    const a = d.address;
    const parts = [
      a.street,
      a.number,
      a.complement,
      a.neighborhood,
      a.city && `${a.city}/${a.state ?? ""}`,
      a.zip,
    ].filter(Boolean);
    if (parts.length) lines.push(`Endereço: ${parts.join(", ")}`);
  }

  if (d.rejectionReason) lines.push(`Motivo rejeição: ${d.rejectionReason}`);
  if (d.pendingItems && d.pendingItems.length) {
    lines.push(`Pendente: ${d.pendingItems.join(", ")}`);
  }

  return lines.join("\n");
}

export function buildAddressText(a: DossierInput["address"]): string {
  if (!a) return "";
  return [
    a.street,
    a.number,
    a.complement,
    a.neighborhood,
    a.city && `${a.city}/${a.state ?? ""}`,
    a.zip,
  ]
    .filter(Boolean)
    .join(", ");
}
