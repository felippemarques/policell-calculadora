import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Smartphone,
  Layers,
  Users,
  LogOut,
  ChevronLeft,
  PanelTop,
  ShieldCheck,
  HelpCircle,
  ExternalLink,
  Ticket,
  ClipboardList,
} from "lucide-react";
import { AdminTour } from "@/components/admin/AdminTour";
import { useAdminOnboarding } from "@/hooks/use-admin-onboarding";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/header", icon: PanelTop, label: "Header" },
  { to: "/admin/secoes", icon: Layers, label: "Seções LP" },
  { to: "/admin/catalogo", icon: Smartphone, label: "Produtos e Parâmetros" },
  { to: "/admin/clientes", icon: Users, label: "Clientes" },
  { to: "/admin/avaliacoes", icon: ClipboardList, label: "Avaliações" },
  { to: "/admin/cupom", icon: Ticket, label: "Configuração de Cupom" },
  { to: "/admin/administradores", icon: ShieldCheck, label: "Administradores" },
];

const AdminLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { restart } = useAdminOnboarding();

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminTour />
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-primary">Pollicell</h1>
          <p className="text-xs text-muted-foreground">Painel Administrativo</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {user && (
            <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</p>
          )}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Landing Page
          </a>
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Site
          </NavLink>
          <button
            onClick={() => restart()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Refazer tour
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
