import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { DollarSign, ListOrdered, UtensilsCrossed, Users } from "lucide-react";

type Stats = {
  vendasHoje: number;
  pedidosAbertos: number;
  mesasOcupadas: number;
  ticketMedio: number;
};

export default function Index() {
  const [stats, setStats] = useState<Stats>({
    vendasHoje: 0,
    pedidosAbertos: 0,
    mesasOcupadas: 0,
    ticketMedio: 0,
  });

  useEffect(() => {
    document.title = "Painel — Cantina Bella Italia";
    loadStats();
  }, []);

  const loadStats = async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [{ data: pagamentos }, { data: pedidos }, { data: mesas }] = await Promise.all([
      supabase.from("pagamentos").select("valor").gte("created_at", start.toISOString()),
      supabase.from("pedidos").select("id, status, total"),
      supabase.from("mesas").select("id, status"),
    ]);

    const vendasHoje = (pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
    const fechadosHoje = (pedidos ?? []).filter((p) => p.status === "fechado");
    const pedidosAbertos = (pedidos ?? []).filter((p) => p.status === "aberto").length;
    const mesasOcupadas = (mesas ?? []).filter((m) => m.status !== "livre").length;
    const ticketMedio = fechadosHoje.length
      ? fechadosHoje.reduce((s, p) => s + Number(p.total), 0) / fechadosHoje.length
      : 0;

    setStats({ vendasHoje, pedidosAbertos, mesasOcupadas, ticketMedio });
  };

  const cards = [
    { label: "Vendas hoje", value: brl(stats.vendasHoje), icon: DollarSign, accent: "text-success" },
    { label: "Pedidos abertos", value: stats.pedidosAbertos, icon: ListOrdered, accent: "text-primary" },
    { label: "Mesas ocupadas", value: stats.mesasOcupadas, icon: UtensilsCrossed, accent: "text-accent" },
    { label: "Ticket médio", value: brl(stats.ticketMedio), icon: Users, accent: "text-secondary" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Buongiorno!</h1>
        <p className="text-muted-foreground">Resumo do dia no salão.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className={`h-5 w-5 ${c.accent}`} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Bem-vindo ao sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Vá em <strong>Mesas</strong> para abrir comandas e lançar pedidos.</p>
          <p>• <strong>Cozinha</strong> mostra os itens em preparo em tempo real.</p>
          <p>• <strong>Caixa</strong> fecha contas e registra pagamentos.</p>
          <p>• <strong>Cardápio</strong> e <strong>Usuários</strong> são exclusivos do administrador.</p>
        </CardContent>
      </Card>
    </div>
  );
}
