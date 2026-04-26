import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

type Profile = { id: string; user_id: string; display_name: string };
type Role = { user_id: string; role: "admin" | "garcom" | "cozinha" | "caixa" };

const ROLES: Role["role"][] = ["admin", "garcom", "cozinha", "caixa"];
const LABEL: Record<string, string> = { admin: "Admin", garcom: "Garçom", cozinha: "Cozinha", caixa: "Caixa" };

export default function Usuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Usuários — Cantina Bella Italia"; load(); }, []);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, display_name").order("display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setRoles((r ?? []) as Role[]);
    setLoading(false);
  };

  const has = (uid: string, role: Role["role"]) => roles.some((r) => r.user_id === uid && r.role === role);

  const toggle = async (uid: string, role: Role["role"], on: boolean) => {
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      if (error) return toast.error(error.message);
    }
    toast.success("Atualizado");
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Usuários</h1>
        <p className="text-muted-foreground">Defina os papéis de cada membro da equipe.</p>
      </header>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Equipe</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{p.display_name}</span>
                  <div className="flex gap-1">
                    {ROLES.filter((r) => has(p.user_id, r)).map((r) => <Badge key={r}>{LABEL[r]}</Badge>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted">
                      <Checkbox checked={has(p.user_id, r)} onCheckedChange={(v) => toggle(p.user_id, r, !!v)} />
                      <span className="text-sm">{LABEL[r]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Novos usuários se cadastram pela tela de login. Após cadastro, marque aqui os papéis correspondentes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}