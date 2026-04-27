import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { printTicket, type PrintItem } from "@/lib/print";
import { brl, formatDate } from "@/lib/format";

export type PreviewPayload = {
  tipo: "cozinha" | "comanda";
  mesaNumero: number;
  itens: PrintItem[];
  total?: number;
  garcom?: string | null;
  restaurante?: string;
  observacao?: string | null;
};

type Props = {
  open: boolean;
  payload: PreviewPayload | null;
  onClose: () => void;
  /** Se true, fecha o diálogo após disparar a impressão. */
  closeAfterPrint?: boolean;
};

export default function PrintPreviewDialog({ open, payload, onClose, closeAfterPrint = true }: Props) {
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (open) setNow(new Date().toISOString());
  }, [open, payload]);

  if (!payload) return null;

  const isCozinha = payload.tipo === "cozinha";
  const restaurante = payload.restaurante ?? "Cantina Bella Italia";

  const handlePrint = () => {
    printTicket(payload);
    if (closeAfterPrint) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Pré-visualização — {isCozinha ? "Pedido Cozinha" : "Comanda / Conta"}
          </DialogTitle>
          <DialogDescription>
            Confira o layout do cupom antes de imprimir. Tamanho real: 80mm.
          </DialogDescription>
        </DialogHeader>

        {/* Mock visual do cupom térmico */}
        <div className="flex justify-center bg-muted/40 p-4 rounded-md max-h-[60vh] overflow-y-auto">
          <div
            className="bg-white text-black shadow-card"
            style={{
              width: "302px", // ~80mm @ 96dpi
              padding: "14px 12px",
              fontFamily: "'Courier New', ui-monospace, monospace",
              fontSize: "12px",
              lineHeight: 1.4,
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "18px",
                fontWeight: 900,
                textAlign: "center",
                letterSpacing: "1px",
                margin: 0,
              }}
            >
              {restaurante}
            </div>
            <div style={{ textAlign: "center", fontSize: "11px" }}>
              {isCozinha ? "*** PEDIDO COZINHA ***" : "*** COMANDA / CONFERÊNCIA ***"}
            </div>
            <div style={{ textAlign: "center", fontSize: "11px" }}>{formatDate(now)}</div>

            <Divider />

            <Row>
              <strong>MESA {payload.mesaNumero}</strong>
              {payload.garcom ? <span>Garçom: {payload.garcom}</span> : <span />}
            </Row>

            <Divider />

            {payload.itens.length === 0 ? (
              <div style={{ textAlign: "center", fontSize: "11px" }}>Nenhum item</div>
            ) : (
              payload.itens.map((i, idx) => {
                const tam = i.tamanho && i.tamanho !== "UNICO" ? ` (${i.tamanho})` : "";
                return (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <Row>
                      <span
                        style={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontSize: isCozinha ? "14px" : "12px",
                        }}
                      >
                        {i.quantidade}× {i.nome_produto}
                        {tam}
                      </span>
                      {!isCozinha && i.subtotal != null && <span>{brl(Number(i.subtotal))}</span>}
                    </Row>
                    {!isCozinha && i.preco_unitario != null && i.quantidade > 1 && (
                      <div style={{ fontStyle: "italic", fontSize: "11px", paddingLeft: 8 }}>
                        {i.quantidade} × {brl(Number(i.preco_unitario))}
                      </div>
                    )}
                    {i.observacao && (
                      <div style={{ fontStyle: "italic", fontSize: "11px", paddingLeft: 8 }}>
                        » {i.observacao}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <Divider />

            {!isCozinha && payload.total != null && (
              <>
                <Row>
                  <span style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase" }}>TOTAL</span>
                  <span style={{ fontSize: "16px", fontWeight: 900 }}>{brl(Number(payload.total))}</span>
                </Row>
                <Divider />
              </>
            )}

            {payload.observacao && (
              <>
                <div style={{ fontSize: "11px" }}>
                  <strong>OBS:</strong> {payload.observacao}
                </div>
                <Divider />
              </>
            )}

            <div style={{ textAlign: "center", fontSize: "11px" }}>
              {isCozinha ? "Bom preparo! 🍝" : "Obrigado pela preferência! 🇮🇹"}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1 h-4 w-4" /> Cancelar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
      {children}
    </div>
  );
}