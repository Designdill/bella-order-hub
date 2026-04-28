import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarPlus, Loader2, Phone, Users, X, Check, Clock, AlertTriangle, CheckCircle2, Timer, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

type Mesa = { id: string; numero: number; capacidade: number };
type Reserva = {
  id: string;
  mesa_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  pessoas: number;
  data_hora: string;
  duracao_minutos: number;
  observacao: string | null;
  status: "confirmada" | "cancelada" | "concluida" | "no_show";
  mesas?: { numero: number };
};

const STATUS_LABEL: Record<Reserva["status"], { label: string; cls: string }> = {
  confirmada: { label: "Confirmada", cls: "bg-success text-success-foreground" },
  concluida: { label: "Concluída", cls: "bg-primary text-primary-foreground" },
  cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
  no_show: { label: "Não compareceu", cls: "bg-destructive text-destructive-foreground" },
};

function toLocalDateTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DURACAO_OPCOES: { value: number; label: string }[] = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2 horas" },
  { value: 150, label: "2h 30min" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

function formatHoraFim(inicio: Date | null, duracaoMin: number) {
  if (!inicio) return null;
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const mesmaDia = fim.toDateString() === inicio.toDateString();
  const hora = `${pad(fim.getHours())}:${pad(fim.getMinutes())}`;
  if (mesmaDia) return hora;
  return `${hora} (${pad(fim.getDate())}/${pad(fim.getMonth() + 1)})`;
}

export default function Reservas() {
  const { user } = useAuth();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"hoje" | "futuras" | "todas">("hoje");
  const [openNew, setOpenNew] = useState(false);

  // form
  const [mesaId, setMesaId] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pessoas, setPessoas] = useState(2);
  const [dataHora, setDataHora] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalDateTimeInput(d);
  });
  const [duracao, setDuracao] = useState(90);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Validação de conflito em tempo real
  const [conflito, setConflito] = useState<Reserva | null>(null);
  const [verificando, setVerificando] = useState(false);

  const dataHoraDate = useMemo(() => {
    if (!dataHora) return null;
    const d = new Date(dataHora);
    return isNaN(d.getTime()) ? null : d;
  }, [dataHora]);

  const dataPassada = useMemo(() => {
    if (!dataHoraDate) return false;
    return dataHoraDate.getTime() < Date.now();
  }, [dataHoraDate]);

  const dataVazia = !dataHora || !dataHoraDate;

  const [sugerindo, setSugerindo] = useState(false);

  // Arredonda Date para o próximo múltiplo de `step` minutos (ex.: 15)
  const roundUpToStep = (d: Date, step = 15) => {
    const r = new Date(d);
    r.setSeconds(0, 0);
    const mins = r.getMinutes();
    const add = (step - (mins % step)) % step;
    r.setMinutes(mins + (add === 0 ? step : add));
    return r;
  };

  const sugerirProximoHorario = async () => {
    if (!mesaId) {
      toast.error("Selecione uma mesa antes de sugerir um horário");
      return;
    }
    setSugerindo(true);
    try {
      // Busca todas as reservas confirmadas futuras da mesa
      const agora = new Date();
      const { data, error } = await supabase
        .from("reservas")
        .select("data_hora, duracao_minutos")
        .eq("mesa_id", mesaId)
        .eq("status", "confirmada")
        .gte("data_hora", new Date(agora.getTime() - 8 * 60 * 60_000).toISOString())
        .order("data_hora", { ascending: true });

      if (error) throw error;

      // Limites: tenta começar em "agora" (arredondado para próximos 15min, mínimo +15min)
      // e busca slot livre nas próximas 14 dias
      let candidato = roundUpToStep(new Date(agora.getTime() + 5 * 60_000), 15);
      const limite = new Date(agora.getTime() + 14 * 24 * 60 * 60_000);
      const duracaoMs = duracao * 60_000;

      // Filtra ocupações relevantes
      const ocupacoes = (data ?? []).map((r: any) => {
        const ini = new Date(r.data_hora);
        const fim = new Date(ini.getTime() + (r.duracao_minutos ?? 0) * 60_000);
        return { ini, fim };
      });

      while (candidato < limite) {
        const fim = new Date(candidato.getTime() + duracaoMs);
        const conflito = ocupacoes.find((o) => o.ini < fim && o.fim > candidato);
        if (!conflito) {
          setDataHora(toLocalDateTimeInput(candidato));
          toast.success("Horário sugerido", {
            description: `${formatDate(candidato.toISOString())} (${duracao} min)`,
          });
          return;
        }
        // Pula para o fim do conflito (arredondado para o próximo step)
        candidato = roundUpToStep(conflito.fim, 15);
      }

      toast.error("Nenhum horário livre encontrado nos próximos 14 dias");
    } catch (e: any) {
      toast.error("Erro ao sugerir horário", { description: e.message });
    } finally {
      setSugerindo(false);
    }
  };

  // Verifica conflito (debounce 350ms) sempre que mesa/data/duração mudarem
  useEffect(() => {
    if (!openNew) return;
    if (!mesaId || !dataHoraDate || !duracao) {
      setConflito(null);
      return;
    }

    let cancelado = false;
    setVerificando(true);
    const timer = setTimeout(async () => {
      const inicio = dataHoraDate;
      const fim = new Date(inicio.getTime() + duracao * 60_000);

      // Busca reservas confirmadas da mesma mesa que possam se sobrepor
      // janela de busca: -8h antes do início para cobrir reservas longas
      const janelaInicio = new Date(inicio.getTime() - 8 * 60 * 60_000);
      const { data, error } = await supabase
        .from("reservas")
        .select("*, mesas(numero)")
        .eq("mesa_id", mesaId)
        .eq("status", "confirmada")
        .gte("data_hora", janelaInicio.toISOString())
        .lte("data_hora", fim.toISOString());

      if (cancelado) return;
      if (error) {
        setVerificando(false);
        return;
      }

      // Detecta sobreposição [inicio, fim) com [r.inicio, r.fim)
      const conflitante = (data ?? []).find((r: any) => {
        const rInicio = new Date(r.data_hora).getTime();
        const rFim = rInicio + (r.duracao_minutos ?? 0) * 60_000;
        return rInicio < fim.getTime() && rFim > inicio.getTime();
      }) as Reserva | undefined;

      setConflito(conflitante ?? null);
      setVerificando(false);
    }, 350);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [openNew, mesaId, dataHoraDate, duracao]);

  useEffect(() => {
    document.title = "Reservas — Cantina Bella Italia";
    load();
    const ch = supabase.channel("reservas")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const load = async () => {
    const [{ data: ms }, { data: rs }] = await Promise.all([
      supabase.from("mesas").select("id, numero, capacidade").order("numero"),
      supabase.from("reservas").select("*, mesas(numero)").order("data_hora", { ascending: true }),
    ]);
    setMesas((ms ?? []) as Mesa[]);
    setReservas((rs ?? []) as any);
    setLoading(false);
  };

  const reservasFiltradas = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
    return reservas.filter((r) => {
      const d = new Date(r.data_hora);
      if (filtro === "hoje") return d >= inicioHoje && d <= fimHoje;
      if (filtro === "futuras") return d >= agora && r.status === "confirmada";
      return true;
    });
  }, [reservas, filtro]);

  const reset = () => {
    setMesaId(""); setNome(""); setTelefone(""); setPessoas(2);
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    setDataHora(toLocalDateTimeInput(d));
    setDuracao(90); setObs("");
    setConflito(null);
  };

  const criar = async () => {
    if (!mesaId) return toast.error("Selecione uma mesa");
    if (!nome.trim()) return toast.error("Informe o nome do cliente");
    if (dataVazia) return toast.error("Informe data e hora válidas");
    if (conflito) return toast.error("Existe conflito de horário com outra reserva");
    if (dataPassada) return toast.error("A data e hora já passaram");

    const mesa = mesas.find((m) => m.id === mesaId);
    if (mesa && pessoas > mesa.capacidade) {
      const ok = confirm(`A mesa ${mesa.numero} comporta ${mesa.capacidade} pessoas. Deseja continuar mesmo assim?`);
      if (!ok) return;
    }

    setSalvando(true);
    const { error } = await supabase.from("reservas").insert({
      mesa_id: mesaId,
      cliente_nome: nome.trim(),
      cliente_telefone: telefone.trim() || null,
      pessoas,
      data_hora: new Date(dataHora).toISOString(),
      duracao_minutos: duracao,
      observacao: obs.trim() || null,
      criado_por: user?.id,
    });
    setSalvando(false);
    if (error) {
      toast.error("Erro ao criar reserva", { description: error.message });
      return;
    }
    toast.success("Reserva criada");
    setOpenNew(false); reset();
  };

  const atualizarStatus = async (id: string, status: Reserva["status"]) => {
    const { error } = await supabase.from("reservas").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Reserva atualizada");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Reservas</h1>
          <p className="text-muted-foreground">Gerencie as reservas de mesa do salão.</p>
        </div>

        <Dialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-1 h-4 w-4" /> Nova reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Nova reserva</DialogTitle>
              <DialogDescription>Preencha os dados do cliente e da mesa.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Mesa</Label>
                <Select value={mesaId} onValueChange={setMesaId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {mesas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        Mesa {m.numero} — {m.capacidade} lugares
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cliente</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 9..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pessoas</Label>
                  <Input type="number" min={1} value={pessoas}
                    onChange={(e) => setPessoas(Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <Label>Duração (min)</Label>
                  <Select value={String(duracao)} onValueChange={(v) => setDuracao(Number(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Duração" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURACAO_OPCOES.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Data e hora</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={sugerirProximoHorario}
                    disabled={sugerindo || !mesaId}
                  >
                    {sugerindo ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Sugerir horário livre
                  </Button>
                </div>
                <Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
                {dataHoraDate && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    Termina às <strong className="text-foreground">{formatHoraFim(dataHoraDate, duracao)}</strong>
                  </p>
                )}
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)}
                  placeholder="Aniversário, mesa próxima à janela…" />
              </div>

              {/* Status da validação em tempo real */}
              {dataVazia ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Data e hora obrigatórias</AlertTitle>
                  <AlertDescription>Selecione uma data e hora válidas para a reserva.</AlertDescription>
                </Alert>
              ) : dataPassada ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Data inválida</AlertTitle>
                  <AlertDescription>A data e hora selecionadas já passaram. Escolha um horário futuro.</AlertDescription>
                </Alert>
              ) : mesaId && dataHoraDate && (
                <>
                  {verificando ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade…
                    </div>
                  ) : conflito ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Conflito de horário</AlertTitle>
                      <AlertDescription className="space-y-1">
                        <p>
                          Esta mesa já tem reserva para{" "}
                          <strong>{conflito.cliente_nome}</strong> em{" "}
                          <strong>{formatDate(conflito.data_hora)}</strong>{" "}
                          ({conflito.duracao_minutos} min).
                        </p>
                        <p className="text-xs">
                          Escolha outra mesa, outro horário ou ajuste a duração.
                        </p>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> Horário disponível para esta mesa
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button onClick={criar} disabled={salvando || verificando || !!conflito || dataPassada || dataVazia}>
                {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Criar reserva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as any)}>
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="futuras">Próximas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {reservasFiltradas.length} reserva(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {reservasFiltradas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma reserva neste filtro.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pessoas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservasFiltradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{formatDate(r.data_hora)}</div>
                      <div className="text-xs text-muted-foreground">{r.duracao_minutos} min</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Mesa {r.mesas?.numero ?? "?"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.cliente_nome}</div>
                      {r.cliente_telefone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {r.cliente_telefone}
                        </div>
                      )}
                      {r.observacao && (
                        <div className="text-xs italic text-muted-foreground">“{r.observacao}”</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" /> {r.pessoas}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_LABEL[r.status].cls}>
                        {STATUS_LABEL[r.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "confirmada" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => atualizarStatus(r.id, "concluida")}>
                            <Check className="mr-1 h-4 w-4" /> Compareceu
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => atualizarStatus(r.id, "no_show")}>
                            No-show
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => atualizarStatus(r.id, "cancelada")}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}