import { brl, formatDate } from "@/lib/format";

export type TicketItem = {
  nome_produto: string;
  tamanho: string;
  quantidade: number;
  preco_unitario?: number;
  subtotal?: number;
  observacao?: string | null;
};

type Props = {
  tipo: "cozinha" | "comanda";
  mesaNumero: number;
  itens: TicketItem[];
  total?: number;
  garcom?: string | null;
  restaurante?: string;
  observacao?: string | null;
};

export default function PrintTicket({
  tipo,
  mesaNumero,
  itens,
  total,
  garcom,
  restaurante = "Cantina Bella Italia",
  observacao,
}: Props) {
  const isCozinha = tipo === "cozinha";
  return (
    <div className="print-area" aria-hidden>
      <div className="ticket-title">{restaurante}</div>
      <div className="ticket-sub">
        {isCozinha ? "*** PEDIDO COZINHA ***" : "*** COMANDA / CONFERÊNCIA ***"}
      </div>
      <div className="ticket-sub">{formatDate(new Date().toISOString())}</div>

      <div className="ticket-divider" />

      <div className="ticket-row">
        <strong>MESA {mesaNumero}</strong>
        {garcom && <span>Garçom: {garcom}</span>}
      </div>

      <div className="ticket-divider" />

      {itens.length === 0 ? (
        <div className="ticket-sub">Nenhum item</div>
      ) : (
        itens.map((i, idx) => (
          <div key={idx} className="ticket-item">
            <div className="ticket-row">
              <span className="ticket-item-name">
                {i.quantidade}× {i.nome_produto}
                {i.tamanho && i.tamanho !== "UNICO" ? ` (${i.tamanho})` : ""}
              </span>
              {!isCozinha && i.subtotal != null && <span>{brl(Number(i.subtotal))}</span>}
            </div>
            {!isCozinha && i.preco_unitario != null && i.quantidade > 1 && (
              <div className="ticket-obs">
                {i.quantidade} × {brl(Number(i.preco_unitario))}
              </div>
            )}
            {i.observacao && <div className="ticket-obs">» {i.observacao}</div>}
          </div>
        ))
      )}

      <div className="ticket-divider" />

      {!isCozinha && total != null && (
        <>
          <div className="ticket-row ticket-total">
            <span>TOTAL</span>
            <span>{brl(Number(total))}</span>
          </div>
          <div className="ticket-divider" />
        </>
      )}

      {observacao && (
        <>
          <div className="ticket-sub" style={{ textAlign: "left" }}>
            <strong>OBS:</strong> {observacao}
          </div>
          <div className="ticket-divider" />
        </>
      )}

      <div className="ticket-sub">
        {isCozinha ? "Bom preparo! 🍝" : "Obrigado pela preferência! 🇮🇹"}
      </div>
      <div style={{ height: "8mm" }} />
    </div>
  );
}