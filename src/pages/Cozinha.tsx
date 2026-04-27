import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChefHat, CheckCircle2, Loader2, Printer, UtensilsCrossed } from "lucide-react";
import { printTicket } from "@/lib/print";

type Item = {
  id: string; nome_produto: string; tamanho: string; quantidade: number;
  observacao: string | null; status: string; pedido_id: string;
  created_at: string;
  pedidos: { id: string; mesa_id: string; mesas: { numero: number } } | null;
};

export default function Cozinha() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Cozinha — Cantina Bella Italia";
    load();
    const ch = supabase.channel("cozinha")
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("itens_pedido")
      .select("id, nome_produto, tamanho, quantidade, observacao, status, pedido_id, created_at, pedidos(id, mesa_id, mesas(numero))")
      .in("status", ["preparando", "pronto"])
      .order("created_at");
    setItens((data ?? []) as any);
    setLoading(false);
  };

  const marcar = async (id: string, status: "pronto" | "entregue") => {
    const { error } = await supabase.from("itens_pedido").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
  };

  const reimprimirMesa = (mesaNumero: number, listaItens: Item[]) => {
    printTicket({
      tipo: "cozinha",
      mesaNumero,
      itens: listaItens.map((i) => ({
        nome_produto: i.nome_produto,
        tamanho: i.tamanho,
        quantidade: i.quantidade,
        observacao: i.observacao,
      })),
    });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const preparando = itens.filter((i) => i.status === "preparando");
  const prontos = itens.filter((i) => i.status === "pronto");

  // Agrupa por mesa para botão de reimpressão
  const porMesa = new Map<number, Item[]>();
  preparando.forEach((i) => {
    const n = i.pedidos?.mesas?.numero ?? 0;
    if (!porMesa.has(n)) porMesa.set(n, []);
    porMesa.get(n)!.push(i);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Cozinha</h1>
        <p className="text-muted-foreground">Itens em preparo e prontos para entrega.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Coluna titulo="Em preparo" icone={ChefHat} cor="text-warning" itens={preparando} acao={(i) => marcar(i.id, "pronto")} acaoLabel="Marcar pronto" />
        <Coluna titulo="Prontos" icone={CheckCircle2} cor="text-success" itens={prontos} acao={(i) => marcar(i.id, "entregue")} acaoLabel="Entregue" />
      </div>

      {porMesa.size > 0 && (
        <div className="rounded-md border bg-card p-4">
          <h3 className="mb-2 font-display text-lg font-semibold">Reimprimir pedido por mesa</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(porMesa.entries()).map(([numero, lista]) => (
              <Button key={numero} variant="outline" size="sm" onClick={() => reimprimirMesa(numero, lista)}>
                <Printer className="mr-1 h-4 w-4" /> Mesa {numero} ({lista.length})
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Coluna({ titulo, icone: Icon, cor, itens, acao, acaoLabel }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${cor}`} />
        <h2 className="font-display text-xl font-semibold">{titulo}</h2>
        <Badge variant="outline">{itens.length}</Badge>
      </div>
      {itens.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum item</CardContent></Card>
      ) : itens.map((i: Item) => (
        <Card key={i.id} className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="font-display text-lg">
                  {i.quantidade}× {i.nome_produto} {i.tamanho !== "UNICO" && <Badge variant="outline" className="ml-1">{i.tamanho}</Badge>}
                </CardTitle>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <UtensilsCrossed className="h-3 w-3" /> Mesa {i.pedidos?.mesas?.numero ?? "?"}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </CardHeader>
          <CardContent>
            {i.observacao && <p className="mb-2 rounded bg-muted p-2 text-sm">📝 {i.observacao}</p>}
            <Button onClick={() => acao(i)} className="w-full">{acaoLabel}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}