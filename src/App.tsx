import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Mesas from "./pages/Mesas";
import Comanda from "./pages/Comanda";
import Cardapio from "./pages/Cardapio";
import Cozinha from "./pages/Cozinha";
import Caixa from "./pages/Caixa";
import Usuarios from "./pages/Usuarios";
import Reservas from "./pages/Reservas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/mesas" element={<Mesas />} />
              <Route path="/mesas/:mesaId" element={<Comanda />} />
              <Route
                path="/cardapio"
                element={<ProtectedRoute allow={["admin"]}><Cardapio /></ProtectedRoute>}
              />
              <Route
                path="/cozinha"
                element={<ProtectedRoute allow={["admin", "cozinha"]}><Cozinha /></ProtectedRoute>}
              />
              <Route
                path="/caixa"
                element={<ProtectedRoute allow={["admin", "caixa"]}><Caixa /></ProtectedRoute>}
              />
              <Route
                path="/usuarios"
                element={<ProtectedRoute allow={["admin"]}><Usuarios /></ProtectedRoute>}
              />
              <Route
                path="/reservas"
                element={<ProtectedRoute allow={["admin"]}><Reservas /></ProtectedRoute>}
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
