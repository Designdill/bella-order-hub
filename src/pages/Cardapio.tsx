import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Categoria = { id: string; nome: string; ordem: number; ativo: boolean };
type Produto = {
  id: string; categoria_id: string | null; nome: string; descricao: string | null;
  preco_m: number | null; preco_g: number | null; preco_unico: number | null;
  disponivel: boolean;
};

export default function Cardapio() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Cardápio — Cantina Bella Italia"; load(); }, []);

  const load = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("categorias").select("*").order("ordem"),
      supabase.from("produtos").select("*").order("nome"),
    ]);
    setCategorias((c ?? []) as Categoria[]);
    setProdutos((p ?? []) as Produto[]);
    setLoading(false);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Cardápio</h1>
        <p className="text-muted-foreground">Gerencie categorias e produtos.</p>
      </header>

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos" className="space-y-4">
          <ProdutosTab categorias={categorias} produtos={produtos} reload={load} />
        </TabsContent>
        <TabsContent value="categorias" className="space-y-4">
          <CategoriasTab categorias={categorias} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriasTab({ categorias, reload }: { categorias: Categoria[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);

  const openNew = () => { setEditing(null); setNome(""); setOrdem(categorias.length + 1); setAtivo(true); setOpen(true); };
  const openEdit = (c: Categoria) => { setEditing(c); setNome(c.nome); setOrdem(c.ordem); setAtivo(c.ativo); setOpen(true); };

  const save = async () => {
    if (!nome.trim()) return toast.error("Nome obrigatório");
    const payload = { nome: nome.trim(), ordem, ativo };
    const { error } = editing
      ? await supabase.from("categorias").update(payload).eq("id", editing.id)
      : await supabase.from("categorias").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false); reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover categoria?")) return;
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  return (
    <>
      <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova categoria</Button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categorias.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{c.nome}</div>
                <div className="text-xs text-muted-foreground">Ordem {c.ordem} {!c.ativo && "• inativa"}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Ordem</Label><Input type="number" value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} /></div>
            <div className="flex items-center justify-between"><Label>Ativa</Label><Switch checked={ativo} onCheckedChange={setAtivo} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProdutosTab({ categorias, produtos, reload }: {
  categorias: Categoria[]; produtos: Produto[]; reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState({
    nome: "", descricao: "", categoria_id: "", preco_unico: "", preco_m: "", preco_g: "", disponivel: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", descricao: "", categoria_id: categorias[0]?.id ?? "", preco_unico: "", preco_m: "", preco_g: "", disponivel: true });
    setOpen(true);
  };
  const openEdit = (p: Produto) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      categoria_id: p.categoria_id ?? "",
      preco_unico: p.preco_unico?.toString() ?? "",
      preco_m: p.preco_m?.toString() ?? "",
      preco_g: p.preco_g?.toString() ?? "",
      disponivel: p.disponivel,
    });
    setOpen(true);
  };

  const parsePreco = (v: string) => v.trim() === "" ? null : Number(v.replace(",", "."));

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      categoria_id: form.categoria_id || null,
      preco_unico: parsePreco(form.preco_unico),
      preco_m: parsePreco(form.preco_m),
      preco_g: parsePreco(form.preco_g),
      disponivel: form.disponivel,
    };
    if (payload.preco_unico == null && payload.preco_m == null && payload.preco_g == null) {
      return toast.error("Defina ao menos um preço (único, M ou G)");
    }
    const { error } = editing
      ? await supabase.from("produtos").update(payload).eq("id", editing.id)
      : await supabase.from("produtos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false); reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover produto?")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const toggle = async (p: Produto) => {
    await supabase.from("produtos").update({ disponivel: !p.disponivel }).eq("id", p.id);
    reload();
  };

  const nomeCat = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";

  return (
    <>
      <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo produto</Button>
      <div className="grid gap-3 md:grid-cols-2">
        {produtos.length === 0 && (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado. Comece criando categorias e depois produtos.
          </CardContent></Card>
        )}
        {produtos.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-display text-lg">{p.nome}</CardTitle>
                  <Badge variant="outline" className="mt-1">{nomeCat(p.categoria_id)}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
              <div className="flex flex-wrap gap-3 text-sm">
                {p.preco_unico != null && <span><strong>{brl(Number(p.preco_unico))}</strong></span>}
                {p.preco_m != null && <span>M: <strong>{brl(Number(p.preco_m))}</strong></span>}
                {p.preco_g != null && <span>G: <strong>{brl(Number(p.preco_g))}</strong></span>}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs text-muted-foreground">Disponível</span>
                <Switch checked={p.disponivel} onCheckedChange={() => toggle(p)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} produto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Preço único</Label><Input value={form.preco_unico} onChange={(e) => setForm({ ...form, preco_unico: e.target.value })} placeholder="0,00" /></div>
              <div><Label>Preço M</Label><Input value={form.preco_m} onChange={(e) => setForm({ ...form, preco_m: e.target.value })} placeholder="0,00" /></div>
              <div><Label>Preço G</Label><Input value={form.preco_g} onChange={(e) => setForm({ ...form, preco_g: e.target.value })} placeholder="0,00" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Use preço único para itens sem variação (ex: bebidas) ou M/G para pizzas/massas.</p>
            <div className="flex items-center justify-between"><Label>Disponível</Label><Switch checked={form.disponivel} onCheckedChange={(v) => setForm({ ...form, disponivel: v })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}