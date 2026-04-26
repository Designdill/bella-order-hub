import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

type Mesa = { id: string; numero: number; status: string };
type Pedido = { id: string; mesa_id: string; total: number; observacao: string | null };
type Categoria = { id: string; nome: string };
type Produto = {
  id: string; nome: string; descricao: string | null;
  preco_m: number | null; preco_g: number | null; preco_unico: number | null;
  categoria_id: string | null; disponivel: boolean;
};
type Item = {
  id: string; nome_produto: string; tamanho: "M" | "G" | "UNICO";
  quantidade: number; preco_unitario: number; subtotal: number;
  observacao: string | null; status: string;
};

export default function Comanda() {
  const { mesaId } = useParams();
  const navigate = useNavigate();
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);

  // Form do modal de adicionar
  const [catSel, setCatSel] = useState<string>("");
  const [prodSel, setProdSel] = useState<string>("");
  const [tamSel, setTamSel] = useState<"M" | "G" | "UNICO">("UNICO");
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");

  useEffect(() => {
    document.title = "Comanda — Cantina Bella Italia";
    if (!mesaId) return;
    load();
    const ch = supabase
      .channel(`comanda-${mesaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mesaId]);

  const load = async () => {
    if (!mesaId) return;
    const [{ data: m }, { data: p }, { data: c }, { data: pr }] = await Promise.all([
      supabase.from("mesas").select("*").eq("id", mesaId).single(),
      supabase.from("pedidos").select("*").eq("mesa_id", mesaId).eq("status", "aberto").maybeSingle(),
      supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem"),
      supabase.from("produtos").select("*").eq("disponivel", true).order("nome"),
    ]);
    setMesa(m as Mesa);
    setPedido(p as Pedido | null);
    setCategorias((c ?? []) as Categoria[]);
    setProdutos((pr ?? []) as Produto[]);
    if (p) {
      const { data: its } = await supabase
        .from("itens_pedido").select("*").eq("pedido_id", p.id).order("created_at");
      setItens((its ?? []) as Item[]);
    } else {
      setItens([]);
    }
    setLoading(false);
  };

  const produtoAtual = produtos.find((p) => p.id === prodSel);
  const precoCalculado = produtoAtual
    ? tamSel === "M" ? Number(produtoAtual.preco_m ?? 0)
    : tamSel === "G" ? Number(produtoAtual.preco_g ?? 0)
    : Number(produtoAtual.preco_unico ?? 0)
    : 0;

  const tamanhosDisponiveis = (p?: Produto): ("M" | "G" | "UNICO")[] => {
    if (!p) return [];
    const t: ("M" | "G" | "UNICO")[] = [];
    if (p.preco_unico != null) t.push("UNICO");
    if (p.preco_m != null) t.push("M");
    if (p.preco_g != null) t.push("G");
    return t;
  };

  const resetForm = () => {
    setCatSel(""); setProdSel(""); setTamSel("UNICO"); setQtd(1); setObs("");
  };

  const adicionar = async () => {
    if (!pedido || !produtoAtual) return;
    if (precoCalculado <= 0) {
      toast.error("Selecione um tamanho com preço definido");
      return;
    }
    const subtotal = precoCalculado * qtd;
    const { error } = await supabase.from("itens_pedido").insert({
      pedido_id: pedido.id,
      produto_id: produtoAtual.id,
      nome_produto: produtoAtual.nome,
      tamanho: tamSel,
      quantidade: qtd,
      preco_unitario: precoCalculado,
      subtotal,
      observacao: obs || null,
    });
    if (error) { toast.error("Erro ao adicionar", { description: error.message }); return; }
    toast.success("Item adicionado");
    setOpenAdd(false);
    resetForm();
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("itens_pedido").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const enviarParaCozinha = async () => {
    const pendentes = itens.filter((i) => i.status === "pendente");
    if (!pendentes.length) { toast.info("Nada pendente"); return; }
    const { error } = await supabase
      .from("itens_pedido").update({ status: "preparando" })
      .in("id", pendentes.map((i) => i.id));
    if (error) toast.error(error.message);
    else toast.success(`${pendentes.length} item(ns) enviado(s) à cozinha`);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!mesa) return <div>Mesa não encontrada</div>;

  const produtosFiltrados = catSel ? produtos.filter((p) => p.categoria_id === catSel) : produtos;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/mesas")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Mesa {mesa.numero}</h1>
          <p className="text-muted-foreground">Comanda em andamento</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="font-display text-3xl font-bold text-primary">{brl(Number(pedido?.total ?? 0))}</div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Dialog open={openAdd} onOpenChange={(v) => { setOpenAdd(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> Adicionar item</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo item</DialogTitle>
              <DialogDescription>Selecione um item do cardápio</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Categoria</Label>
                <Select value={catSel} onValueChange={(v) => { setCatSel(v); setProdSel(""); }}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto</Label>
                <Select value={prodSel} onValueChange={(v) => {
                  setProdSel(v);
                  const p = produtos.find((x) => x.id === v);
                  const ts = tamanhosDisponiveis(p);
                  setTamSel(ts[0] ?? "UNICO");
                }}>
                  <SelectTrigger><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {produtosFiltrados.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {produtoAtual && (
                <div>
                  <Label>Tamanho</Label>
                  <Select value={tamSel} onValueChange={(v) => setTamSel(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tamanhosDisponiveis(produtoAtual).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "UNICO" ? "Único" : t} — {brl(t === "M" ? Number(produtoAtual.preco_m) : t === "G" ? Number(produtoAtual.preco_g) : Number(produtoAtual.preco_unico))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(Math.max(1, Number(e.target.value)))} />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Sem cebola, etc." />
              </div>
              {produtoAtual && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  Subtotal: <strong className="text-primary">{brl(precoCalculado * qtd)}</strong>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
              <Button onClick={adicionar} disabled={!produtoAtual}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="secondary" onClick={enviarParaCozinha}>Enviar à cozinha</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item ainda. Adicione o primeiro!</p>
          ) : (
            <ul className="divide-y">
              {itens.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{i.quantidade}× {i.nome_produto}</span>
                      {i.tamanho !== "UNICO" && <Badge variant="outline">{i.tamanho}</Badge>}
                      <StatusBadge status={i.status} />
                    </div>
                    {i.observacao && <p className="text-xs text-muted-foreground">{i.observacao}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{brl(Number(i.subtotal))}</div>
                  </div>
                  {i.status === "pendente" && (
                    <Button variant="ghost" size="icon" onClick={() => remover(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
    preparando: { label: "Preparando", cls: "bg-warning text-warning-foreground" },
    pronto: { label: "Pronto", cls: "bg-success text-success-foreground" },
    entregue: { label: "Entregue", cls: "bg-primary text-primary-foreground" },
    cancelado: { label: "Cancelado", cls: "bg-destructive text-destructive-foreground" },
  };
  const s = map[status] ?? map.pendente;
  return <Badge className={s.cls}>{s.label}</Badge>;
}