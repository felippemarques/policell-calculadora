// Generates a self-contained, printable HTML "proposal" page that opens in a new tab.
// The customer-facing browser can use "Save as PDF" — no PDF library required.

export interface ProposalData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deviceLabel: string; // ex: "Apple iPhone 14 — 128GB"
  basePrice: number;
  finalValue: number;
  conditions: { label: string; value: string; critical?: boolean }[];
  rejectionReason?: string | null;
  createdAt: string; // ISO
  storeName?: string;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildProposalHtml(data: ProposalData): string {
  const store = data.storeName ?? "Pollicell";
  const dateStr = new Date(data.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const conditionsRows = data.conditions
    .map(
      (c) => `
        <tr>
          <td class="cell label">${escapeHtml(c.label)}</td>
          <td class="cell value ${c.critical ? "critical" : ""}">${escapeHtml(c.value)}</td>
        </tr>`,
    )
    .join("");

  const rejectionBlock = data.rejectionReason
    ? `<div class="rejection">
         <strong>Motivo de impedimento:</strong> ${escapeHtml(data.rejectionReason)}
       </div>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Proposta ${escapeHtml(store)} — ${escapeHtml(data.customerName)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f5f5f7;color:#1d1d1f;line-height:1.45;padding:32px 16px;-webkit-font-smoothing:antialiased}
    .sheet{max-width:720px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,.06);overflow:hidden}
    .header{padding:40px 48px 32px;border-bottom:1px solid #e5e5e7;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap}
    .brand{display:flex;align-items:center;gap:12px}
    .brand-mark{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0071e3,#00a3ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;letter-spacing:-.5px}
    .brand-name{font-size:18px;font-weight:600;letter-spacing:-.3px}
    .doc-meta{text-align:right;font-size:12px;color:#86868b}
    .doc-meta strong{display:block;color:#1d1d1f;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
    .body{padding:40px 48px}
    h1{font-size:26px;font-weight:600;letter-spacing:-.5px;margin-bottom:8px}
    .subtitle{font-size:15px;color:#86868b;margin-bottom:32px}
    .section{margin-bottom:32px}
    .section h2{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#86868b;font-weight:600;margin-bottom:12px}
    .field{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f2;font-size:14px}
    .field:last-child{border-bottom:0}
    .field .k{color:#86868b}
    .field .v{font-weight:500;color:#1d1d1f}
    .device-card{background:linear-gradient(135deg,#f5f5f7,#fafafa);border:1px solid #e5e5e7;border-radius:16px;padding:20px;display:flex;justify-content:space-between;align-items:center;gap:16px}
    .device-card .device-name{font-size:16px;font-weight:600;letter-spacing:-.2px}
    .device-card .device-base{font-size:12px;color:#86868b;margin-top:4px}
    table{width:100%;border-collapse:collapse}
    .cell{padding:10px 0;font-size:14px;border-bottom:1px solid #f0f0f2}
    .cell.label{color:#86868b;width:55%}
    .cell.value{font-weight:500;text-align:right}
    .cell.value.critical{color:#d70015}
    .total{margin-top:32px;padding:24px;border-radius:20px;background:linear-gradient(135deg,#0071e3,#00a3ff);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px}
    .total .label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;opacity:.85;margin-bottom:4px}
    .total .amount{font-size:32px;font-weight:600;letter-spacing:-.6px}
    .rejection{margin-top:20px;padding:16px 20px;background:#fff4f4;border:1px solid #ffcdd2;color:#b71c1c;border-radius:12px;font-size:14px}
    .footer{padding:24px 48px;background:#fafafa;border-top:1px solid #e5e5e7;font-size:12px;color:#86868b;text-align:center}
    .actions{max-width:720px;margin:24px auto 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .btn{appearance:none;border:0;font:inherit;cursor:pointer;padding:12px 24px;border-radius:999px;font-weight:500;font-size:14px;transition:transform .15s ease}
    .btn:hover{transform:translateY(-1px)}
    .btn-primary{background:#1d1d1f;color:#fff}
    .btn-secondary{background:#fff;color:#1d1d1f;border:1px solid #d2d2d7}
    @media print{
      body{background:#fff;padding:0}
      .sheet{box-shadow:none;border-radius:0;max-width:none}
      .actions{display:none}
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <div class="brand">
        <div class="brand-mark">${escapeHtml(store.charAt(0))}</div>
        <div class="brand-name">${escapeHtml(store)}</div>
      </div>
      <div class="doc-meta">
        <strong>Proposta de Trade-in</strong>
        <div>${dateStr}</div>
      </div>
    </header>

    <main class="body">
      <h1>Olá, ${escapeHtml(firstName(data.customerName))}!</h1>
      <p class="subtitle">Aqui está a proposta para o seu aparelho com base nas informações fornecidas.</p>

      <div class="section">
        <h2>Cliente</h2>
        <div class="field"><span class="k">Nome</span><span class="v">${escapeHtml(data.customerName)}</span></div>
        <div class="field"><span class="k">E-mail</span><span class="v">${escapeHtml(data.customerEmail)}</span></div>
        <div class="field"><span class="k">Telefone</span><span class="v">${escapeHtml(data.customerPhone)}</span></div>
      </div>

      <div class="section">
        <h2>Aparelho avaliado</h2>
        <div class="device-card">
          <div>
            <div class="device-name">${escapeHtml(data.deviceLabel)}</div>
            <div class="device-base">Preço base de referência: ${formatBRL(data.basePrice)}</div>
          </div>
        </div>
      </div>

      ${
        data.conditions.length > 0
          ? `<div class="section">
               <h2>Condições identificadas</h2>
               <table><tbody>${conditionsRows}</tbody></table>
             </div>`
          : ""
      }

      ${rejectionBlock}

      <div class="total">
        <div>
          <div class="label">Valor da proposta</div>
          <div style="font-size:11px;opacity:.75">Válida por 7 dias</div>
        </div>
        <div class="amount">${formatBRL(data.finalValue)}</div>
      </div>
    </main>

    <footer class="footer">
      Esta proposta é uma estimativa baseada nas respostas fornecidas pelo cliente.
      O valor final pode ser ajustado após inspeção física do aparelho.
    </footer>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick="window.print()">Salvar como PDF / Imprimir</button>
    <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
  </div>
</body>
</html>`;
}

export function openProposalInNewTab(data: ProposalData): string {
  const html = buildProposalHtml(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // We return the URL so the caller could include it elsewhere (e.g., share),
  // though it's a session-only blob URL.
  return url;
}

export function buildWhatsAppLink(
  phone: string,
  customerName: string,
  deviceLabel: string,
  finalValue: number,
  storeName = "Pollicell",
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedValue = finalValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const message =
    `Olá ${firstName(customerName)}, aqui é da ${storeName}. ` +
    `Temos a proposta pronta para o seu ${deviceLabel} no valor de ${formattedValue}. ` +
    `Quando for um bom momento, podemos seguir com o detalhamento e os próximos passos. ` +
    `Aguardo seu retorno!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function firstName(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || full;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
