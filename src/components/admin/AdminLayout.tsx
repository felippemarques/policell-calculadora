import { useState } from "react";
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
  Briefcase,
  Menu,
  Plug,
} from "lucide-react";
import { AdminTour } from "@/components/admin/AdminTour";
import { useAdminOnboarding } from "@/hooks/use-admin-onboarding";

type NavItem = {
  to?: string;
  href?: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
  external?: boolean;
};

const AdminLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { restart } = useAdminOnboarding();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const items: NavItem[] = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/header", icon: PanelTop, label: "Header" },
    { to: "/admin/secoes", icon: Layers, label: "Seções LP" },
    { to: "/admin/calculadora-visual", icon: Layers, label: "Visual da Calculadora" },
    { to: "/admin/catalogo", icon: Smartphone, label: "Produtos e Parâmetros" },
    { to: "/admin/visao-cliente", icon: Users, label: "Visão por Cliente" },
    { to: "/admin/clientes", icon: ClipboardList, label: "Propostas" },
    { to: "/admin/avaliacoes", icon: Ticket, label: "Cupons Criados" },
    { to: "/admin/cupom", icon: Ticket, label: "Configurações de Cupom" },
    { to: "/admin/negocio", icon: Briefcase, label: "Configurações de Negócio" },
    { to: "/admin/administradores", icon: ShieldCheck, label: "Administradores" },
    { to: "/admin/integracoes", icon: Plug, label: "Integrações" },
    { href: "/", icon: ExternalLink, label: "Ver Landing Page", variant: "primary", external: true },
    { to: "/", icon: ChevronLeft, label: "Voltar ao Site" },
    { onClick: () => restart(), icon: HelpCircle, label: "Refazer tour" },
    { onClick: handleSignOut, icon: LogOut, label: "Sair", variant: "danger" },
  ];

  const baseRow =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors";
  const variantClass = (v: NavItem["variant"], isActive = false) => {
    if (isActive) return "bg-primary text-primary-foreground";
    if (v === "primary") return "text-primary hover:bg-primary/10";
    if (v === "danger") return "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";
    return "text-muted-foreground hover:bg-accent/10 hover:text-foreground";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminTour />
      {/* Sidebar — fixa em rolagem, expansível */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} bg-card border-r border-border flex-shrink-0 transition-[width] duration-200 sticky top-0 h-screen self-start overflow-y-auto`}
      >
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-primary leading-tight truncate">Policell</h1>
              <p className="text-xs text-muted-foreground truncate">Painel Administrativo</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {user && !collapsed && (
          <p className="px-4 pt-3 pb-1 text-[11px] text-muted-foreground truncate">{user.email}</p>
        )}

        <nav className="p-3 space-y-1">
          {items.map((item, idx) => {
            const content = (
              <>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            );
            const title = collapsed ? item.label : undefined;

            if (item.to) {
              return (
                <NavLink
                  key={item.to + idx}
                  to={item.to}
                  end={item.end}
                  title={title}
                  className={({ isActive }) =>
                    `${baseRow} ${variantClass(item.variant, isActive)} ${collapsed ? "justify-center" : ""}`
                  }
                >
                  {content}
                </NavLink>
              );
            }
            if (item.href) {
              return (
                <a
                  key={item.href + idx}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  title={title}
                  className={`${baseRow} ${variantClass(item.variant)} ${collapsed ? "justify-center" : ""}`}
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={item.label + idx}
                onClick={item.onClick}
                title={title}
                className={`${baseRow} w-full ${variantClass(item.variant)} ${collapsed ? "justify-center" : ""}`}
              >
                {content}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
