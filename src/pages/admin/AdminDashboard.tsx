import { useState, useMemo } from "react";
import {
  Users,
  ClipboardList,
  XCircle,
  CheckCircle2,
  TrendingUp,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import {
  DashboardFilters,
  type DashboardFiltersValue,
} from "@/components/admin/dashboard/DashboardFilters";
import { downloadCsv } from "@/lib/export-csv";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const AdminDashboard = () => {
  const [filters, setFilters] = useState<DashboardFiltersValue>({});

  const apiFilters = useMemo(
    () => ({
      from: filters.from ? filters.from.toISOString() : undefined,
      to: filters.to ? filters.to.toISOString() : undefined,
      brandId: filters.brandId,
    }),
    [filters],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboardMetrics(apiFilters);

  const totals = data?.totals;
  const topDevices = data?.top_devices ?? [];

  const cards = [
    {
      key: "leads",
      label: "Leads (só contato)",
      help: "Cliente preencheu nome/email/telefone mas não escolheu aparelho",
      value: totals?.leads ?? 0,
      icon: Users,
      tone: "text-primary",
    },
    {
      key: "incomplete",
      label: "Propostas incompletas",
      help: "Escolheu o aparelho mas abandonou antes do cupom",
      value: totals?.incomplete ?? 0,
      icon: ClipboardList,
      tone: "text-warning",
    },
    {
      key: "rejected",
      label: "Rejeitados",
      help: "Aparelho com defeito crítico (sem proposta)",
      value: totals?.rejected ?? 0,
      icon: XCircle,
      tone: "text-destructive",
    },
    {
      key: "completed",
      label: "Clientes completos",
      help: "Avaliação concluída + cupom emitido",
      value: totals?.completed ?? 0,
      icon: CheckCircle2,
      tone: "text-success",
    },
  ];

  const handleExport = () => {
    if (!data) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const rows = [
      {
        "Métrica": "Leads (só contato)",
        "Valor": data.totals.leads,
      },
      {
        "Métrica": "Propostas incompletas",
        "Valor": data.totals.incomplete,
      },
      {
        "Métrica": "Rejeitados",
        "Valor": data.totals.rejected,
      },
      {
        "Métrica": "Clientes completos",
        "Valor": data.totals.completed,
      },
      {
        "Métrica": "Total no período",
        "Valor": data.totals.total,
      },
      {
        "Métrica": "Taxa de abandono",
        "Valor": formatPct(data.totals.abandonment_rate),
      },
      {
        "Métrica": "Valor total gerado (R$)",
        "Valor": data.totals.total_value_brl.toFixed(2),
      },
      ...data.top_devices.map((d, i) => ({
        "Métrica": `Top ${i + 1}: ${d.brand} ${d.model}`,
        "Valor": `${d.count} avaliações / ${formatBRL(d.total_value)}`,
      })),
    ];
    downloadCsv(`dashboard-trade-in-${stamp}.csv`, rows);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Funil de Trade-in: do contato ao cupom emitido
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!data || isLoading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <DashboardFilters value={filters} onChange={setFilters} />
      </Card>

      {/* Loading / error */}
      {isError && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive">
            Erro ao carregar métricas: {(error as Error)?.message ?? "desconhecido"}
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <MetricCard
            key={c.key}
            label={c.label}
            help={c.help}
            value={c.value}
            Icon={c.icon}
            tone={c.tone}
            loading={isLoading}
          />
        ))}
      </div>

      {/* Secondary cards: abandonment + total value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de abandono</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {totals ? formatPct(totals.abandonment_rate) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Leads + Incompletos sobre o total
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-warning opacity-50" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor total gerado</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {totals ? formatBRL(totals.total_value_brl) : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Soma dos cupons emitidos no período
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-success opacity-50" />
          </div>
        </Card>
      </div>

      {/* Top devices */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Top 5 modelos avaliados
            </h3>
            <p className="text-xs text-muted-foreground">
              Por número de avaliações concluídas
            </p>
          </div>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {topDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {isLoading ? "Carregando..." : "Nenhuma avaliação no período."}
          </p>
        ) : (
          <ol className="space-y-2">
            {topDevices.map((d, i) => {
              const max = topDevices[0]?.count ?? 1;
              const pct = (d.count / max) * 100;
              return (
                <li
                  key={d.device_id}
                  className="relative overflow-hidden rounded-md border border-border bg-card px-3 py-2"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                  <div className="relative flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground w-5">
                        {i + 1}.
                      </span>
                      <span className="font-medium text-foreground truncate">
                        {d.brand} {d.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <span className="text-muted-foreground">
                        {d.count} {d.count === 1 ? "avaliação" : "avaliações"}
                      </span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatBRL(d.total_value)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  help: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  loading: boolean;
}

function MetricCard({ label, help, value, Icon, tone, loading }: MetricCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
              {loading ? "—" : value.toLocaleString("pt-BR")}
            </p>
          </div>
          <Icon className={cn("h-8 w-8 opacity-60 shrink-0", tone)} />
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 -ml-2 h-7 px-2 text-xs text-muted-foreground gap-1"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
            {open ? "Menos detalhes" : "Mais detalhes"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{help}</p>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default AdminDashboard;
