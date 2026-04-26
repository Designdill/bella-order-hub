import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "garcom" | "cozinha" | "caixa";

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        setRoles(((data ?? []).map((r) => r.role as AppRole)));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAny = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  return { roles, loading, hasRole, hasAny, isAdmin: hasRole("admin") };
}