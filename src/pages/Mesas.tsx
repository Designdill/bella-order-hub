import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Mesa = {
  id: string;
  numero: number;
  capacidade: number;
  status: "livre" | "ocupada" | "aguardando_pagamento";
};

type Pedido = { id: string; mesa_id: string; total: number };

export default function Mesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<Record<string, Pedido>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Mesas — Cantina Bella Italia";
    load();
    const ch = supabase
      .channel("mesas-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const load = async () => {
    const [{ data: ms }, { data: ps }] = await Promise.all([
      supabase.from("mesas").select("*").order("numero"),
      supabase.from("pedidos").select("id, mesa_id, total").eq("status", "aberto"),
    ]);
    setMesas((ms ?? []) as Mesa[]);
    const map: Record<string, Pedido> = {};
    (ps ?? []).forEach((p) => (map[p.mesa_id] = p as Pedido));
    setPedidos(map);
    setLoading(false);
  };

  const abrirMesa = async (mesa: Mesa) => {
    if (pedidos[mesa.id]) {
      navigate(`/mesas/${mesa.id}`);
      return;
    }
    const { data, error } = await supabase
      .from("pedidos")
      .insert({ mesa_id: mesa.id, garcom_id: user?.id })
      .select("id")
      .single();
    if (error) {
      toast.error("Erro ao abrir mesa", { description: error.message });
      return;
    }
    await supabase.from("mesas").update({ status: "ocupada" }).eq("id", mesa.id);
    navigate(`/mesas/${mesa.id}`);
    toast.success(`Mesa ${mesa.numero} aberta`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const corStatus = (s: Mesa["status"]) =>
    s === "livre" ? "bg-success text-success-foreground"
    : s === "ocupada" ? "bg-primary text-primary-foreground"
    : "bg-warning text-warning-foreground";

  const labelStatus = (s: Mesa["status"]) =>
    s === "livre" ? "Livre" : s === "ocupada" ? "Ocupada" : "Aguardando pgto";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Mesas do salão</h1>
          <p className="text-muted-foreground">Toque em uma mesa para abrir ou ver a comanda.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {mesas.map((m) => {
          const p = pedidos[m.id];
          return (
            <Card
              key={m.id}
              onClick={() => abrirMesa(m)}
              className="cursor-pointer overflow-hidden border-2 transition-all hover:shadow-warm hover:scale-[1.02]"
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                    <UtensilsCrossed className="h-6 w-6 text-primary" />
                  </div>
                  <Badge className={corStatus(m.status)}>{labelStatus(m.status)}</Badge>
                </div>
                <div>
                  <div className="font-display text-2xl font-bold">Mesa {m.numero}</div>
                  <div className="text-xs text-muted-foreground">{m.capacidade} lugares</div>
                </div>
                {p && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">Comanda</span>
                    <span className="font-bold text-primary">{brl(Number(p.total))}</span>
                  </div>
                )}
                <Button variant={p ? "default" : "outline"} className="w-full" size="sm">
                  {p ? "Ver comanda" : "Abrir mesa"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}