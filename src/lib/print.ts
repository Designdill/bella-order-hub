import { brl, formatDate } from "@/lib/format";

export type PrintItem = {
  nome_produto: string;
  tamanho: string;
  quantidade: number;
  preco_unitario?: number;
  subtotal?: number;
  observacao?: string | null;
};

type PrintOpts = {
  tipo: "cozinha" | "comanda";
  mesaNumero: number;
  itens: PrintItem[];
  total?: number;
  garcom?: string | null;
  restaurante?: string;
  observacao?: string | null;
  autoPrint?: boolean;
};

const styles = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #fff; color: #000;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 12px; line-height: 1.4;
  }
  .wrap { width: 80mm; padding: 4mm 3mm; }
  .title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 18px; font-weight: 900;
    text-align: center; letter-spacing: 1px;
    margin: 0 0 2px;
  }
  .sub { text-align: center; font-size: 11px; }
  .left { text-align: left; }
  .div { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .item { margin-bottom: 4px; }
  .name { font-weight: 700; text-transform: uppercase; }
  .obs { font-style: italic; font-size: 11px; padding-left: 8px; }
  .total { font-size: 16px; font-weight: 900; text-transform: uppercase; }
  .qty { font-size: 14px; font-weight: 700; }
  .footer { text-align: center; margin-top: 6px; }
`;

function buildHtml(opts: PrintOpts) {
  const {
    tipo, mesaNumero, itens, total, garcom,
    restaurante = "Cantina Bella Italia", observacao,
  } = opts;
  const isCozinha = tipo === "cozinha";

  const itemsHtml = itens.length === 0
    ? `<div class="sub">Nenhum item</div>`
    : itens.map((i) => {
        const tam = i.tamanho && i.tamanho !== "UNICO" ? ` (${i.tamanho})` : "";
        const right = !isCozinha && i.subtotal != null ? `<span>${brl(Number(i.subtotal))}</span>` : "";
        const unit = !isCozinha && i.preco_unitario != null && i.quantidade > 1
          ? `<div class="obs">${i.quantidade} × ${brl(Number(i.preco_unitario))}</div>` : "";
        const obs = i.observacao ? `<div class="obs">» ${escapeHtml(i.observacao)}</div>` : "";
        return `
          <div class="item">
            <div class="row">
              <span class="${isCozinha ? "qty" : "name"}">${i.quantidade}× ${escapeHtml(i.nome_produto)}${tam}</span>
              ${right}
            </div>
            ${unit}
            ${obs}
          </div>
        `;
      }).join("");

  const totalHtml = !isCozinha && total != null
    ? `<div class="row total"><span>TOTAL</span><span>${brl(Number(total))}</span></div><div class="div"></div>`
    : "";

  const obsHtml = observacao
    ? `<div class="sub left"><strong>OBS:</strong> ${escapeHtml(observacao)}</div><div class="div"></div>`
    : "";

  const garcomHtml = garcom ? `<span>Garçom: ${escapeHtml(garcom)}</span>` : "<span></span>";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${isCozinha ? "Pedido cozinha" : "Comanda"} — Mesa ${mesaNumero}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="wrap">
    <div class="title">${escapeHtml(restaurante)}</div>
    <div class="sub">${isCozinha ? "*** PEDIDO COZINHA ***" : "*** COMANDA / CONFERÊNCIA ***"}</div>
    <div class="sub">${formatDate(new Date().toISOString())}</div>
    <div class="div"></div>
    <div class="row"><strong>MESA ${mesaNumero}</strong>${garcomHtml}</div>
    <div class="div"></div>
    ${itemsHtml}
    <div class="div"></div>
    ${totalHtml}
    ${obsHtml}
    <div class="footer">${isCozinha ? "Bom preparo! 🍝" : "Obrigado pela preferência! 🇮🇹"}</div>
    <div style="height:8mm"></div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printTicket(opts: PrintOpts) {
  const html = buildHtml(opts);
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) {
    // Fallback: download como HTML
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${opts.tipo}-mesa-${opts.mesaNumero}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Aguarda renderização e dispara impressão
  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 200);
  };
}