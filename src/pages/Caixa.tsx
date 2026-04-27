import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { brl, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Printer, Receipt, Wallet } from "lucide-react";
import PrintPreviewDialog from "@/components/PrintPreviewDialog";
import { usePrintPreview } from "@/hooks/usePrintPreview";

type Pedido = {
  id: string; mesa_id: string; total: number; aberto_em: string;
  mesas: { numero: number };
};

type Pagamento = { id: string; forma: string; valor: number; created_at: string };

export default function Caixa() {
  const { user } = useAuth();
  const [abertos, setAbertos] = useState<Pedido[]>([]);
  const [pagamentosHoje, setPagamentosHoje] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const [forma, setForma] = useState<string>("dinheiro");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const preview = usePrintPreview();

  useEffect(() => {
    document.title = "Caixa — Cantina Bella Italia";
    load();
    const ch = supabase.channel("caixa")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [{ data: ps }, { data: pgs }] = await Promise.all([
      supabase.from("pedidos").select("id, mesa_id, total, aberto_em, mesas(numero)").eq("status", "aberto").order("aberto_em"),
      supabase.from("pagamentos").select("id, forma, valor, created_at").gte("created_at", start.toISOString()).order("created_at", { ascending: false }),
    ]);
    setAbertos((ps ?? []) as any);
    setPagamentosHoje((pgs ?? []) as Pagamento[]);
    setLoading(false);
  };

  const abrirFechamento = (p: Pedido) => {
    setSelecionado(p); setForma("dinheiro"); setValor(String(p.total)); setObs("");
  };

  const imprimirConta = async (p: Pedido) => {
    const { data: its } = await supabase
      .from("itens_pedido")
      .select("nome_produto, tamanho, quantidade, preco_unitario, subtotal, observacao")
      .eq("pedido_id", p.id)
      .order("created_at");
    preview.open({
      tipo: "comanda",
      mesaNumero: p.mesas.numero,
      itens: (its ?? []).map((i: any) => ({
        nome_produto: i.nome_produto,
        tamanho: i.tamanho,
        quantidade: i.quantidade,
        preco_unitario: Number(i.preco_unitario),
        subtotal: Number(i.subtotal),
        observacao: i.observacao,
      })),
      total: Number(p.total),
    });
  };

  const fechar = async () => {
    if (!selecionado) return;
    const v = Number(valor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Valor inválido");

    const { error: e1 } = await supabase.from("pagamentos").insert({
      pedido_id: selecionado.id,
      forma: forma as any,
      valor: v,
      registrado_por: user?.id,
      observacao: obs || null,
    });
    if (e1) return toast.error(e1.message);

    const { error: e2 } = await supabase
      .from("pedidos")
      .update({ status: "fechado", fechado_em: new Date().toISOString() })
      .eq("id", selecionado.id);
    if (e2) return toast.error(e2.message);

    await supabase.from("mesas").update({ status: "livre" }).eq("id", selecionado.mesa_id);

    toast.success(`Mesa ${selecionado.mesas.numero} fechada`);
    setSelecionado(null);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalDia = pagamentosHoje.reduce((s, p) => s + Number(p.valor), 0);
  const porForma = pagamentosHoje.reduce<Record<string, number>>((acc, p) => {
    acc[p.forma] = (acc[p.forma] ?? 0) + Number(p.valor); return acc;
  }, {});

  const labelForma: Record<string, string> = {
    dinheiro: "Dinheiro", pix: "PIX", cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito", outro: "Outro",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Caixa</h1>
        <p className="text-muted-foreground">Fechamento de comandas e movimento do dia.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-card">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Comandas abertas</CardTitle></CardHeader>
          <CardContent>
            {abertos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma comanda aberta.</p>
            ) : (
              <ul className="divide-y">
                {abertos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">Mesa {p.mesas.numero}</div>
                      <div className="text-xs text-muted-foreground">Aberta em {formatDate(p.aberto_em)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold text-primary">{brl(Number(p.total))}</span>
                      <Button size="sm" variant="outline" onClick={() => imprimirConta(p)}>
                        <Printer className="mr-1 h-4 w-4" /> Conta
                      </Button>
                      <Button size="sm" onClick={() => abrirFechamento(p)}>Fechar conta</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Wallet className="h-5 w-5 text-success" /> Movimento do dia</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-gradient-warm p-4 text-primary-foreground">
              <div className="text-xs uppercase tracking-wider opacity-90">Total recebido</div>
              <div className="font-display text-3xl font-bold">{brl(totalDia)}</div>
            </div>
            <div className="space-y-1 text-sm">
              {Object.keys(labelForma).map((k) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{labelForma[k]}</span>
                  <span className="font-medium">{brl(porForma[k] ?? 0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              {pagamentosHoje.length} pagamento(s) registrado(s) hoje
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar Mesa {selecionado?.mesas.numero}</DialogTitle>
          </DialogHeader>
          {selecionado && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground">Total da comanda</div>
                <div className="font-display text-2xl font-bold text-primary">{brl(Number(selecionado.total))}</div>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(labelForma).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor recebido</Label>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelecionado(null)}>Cancelar</Button>
            <Button onClick={fechar}>Confirmar pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog open={preview.isOpen} payload={preview.payload} onClose={preview.close} />
    </div>
  );
}