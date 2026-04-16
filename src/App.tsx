import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Index from "./pages/Index";
import Calculadora from "./pages/Calculadora";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSections from "./pages/admin/AdminSections";
import AdminVideos from "./pages/admin/AdminVideos";
import AdminCatalog from "./pages/admin/AdminCatalog";

import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminEvaluations from "./pages/admin/AdminEvaluations";
import AdminHeader from "./pages/admin/AdminHeader";
import { RequireAdmin } from "./components/admin/RequireAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/calculadora" element={<Calculadora />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="secoes" element={<AdminSections />} />
              <Route path="videos" element={<AdminVideos />} />
              <Route path="catalogo" element={<AdminCatalog />} />
              
              <Route path="clientes" element={<AdminCustomers />} />
              <Route path="avaliacoes" element={<AdminEvaluations />} />
              <Route path="header" element={<AdminHeader />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
