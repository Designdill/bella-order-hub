import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRoles, AppRole } from "@/hooks/useRoles";
import {
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  Pizza,
  ClipboardList,
  Wallet,
  Users,
  CalendarCheck,
  LogOut,
} from "lucide-react";

type Item = { title: string; url: string; icon: any; allow?: AppRole[] };

const items: Item[] = [
  { title: "Painel", url: "/", icon: LayoutDashboard, allow: ["admin", "caixa"] },
  { title: "Mesas", url: "/mesas", icon: UtensilsCrossed, allow: ["admin", "garcom", "caixa"] },
  { title: "Reservas", url: "/reservas", icon: CalendarCheck, allow: ["admin"] },
  { title: "Cozinha", url: "/cozinha", icon: ClipboardList, allow: ["admin", "cozinha"] },
  { title: "Caixa", url: "/caixa", icon: Wallet, allow: ["admin", "caixa"] },
  { title: "Cardápio", url: "/cardapio", icon: Pizza, allow: ["admin"] },
  { title: "Usuários", url: "/usuarios", icon: Users, allow: ["admin"] },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { roles, hasAny } = useRoles();
  const navigate = useNavigate();

  const visible = items.filter((i) => !i.allow || hasAny(i.allow));

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-warm shadow-warm">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-sidebar-foreground leading-tight">
                Bella Italia
              </span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                Sistema de gestão
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visible.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : ""
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex flex-col gap-2 p-2">
            <div className="px-2">
              <p className="truncate text-xs font-medium text-sidebar-foreground">
                {user?.email}
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {roles.length ? roles.join(" • ") : "sem papel"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="font-display text-lg">Cantina Bella Italia</div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}