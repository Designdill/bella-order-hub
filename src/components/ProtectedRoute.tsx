import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRoles, AppRole } from "@/hooks/useRoles";
import { Loader2 } from "lucide-react";

type Props = {
  children: ReactNode;
  allow?: AppRole[];
};

export function ProtectedRoute({ children, allow }: Props) {
  const { user, loading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const location = useLocation();

  if (loading || (user && rolesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allow && allow.length > 0) {
    const ok = allow.some((r) => roles.includes(r));
    if (!ok) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}