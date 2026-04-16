import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Smartphone,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Columns3,
  Ban,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { checklistItems } from "@/data/checklist";

type LeadRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_id: string | null;
  status: string;
  rejection_reason: string | null;
  assessment_responses: any;
  created_at: string;
  updated_at: string;
};

type DeviceRow = {
  id: string;
  brand: string;
  model: string;
  storage: string;
  base_price: number;
};

type EvaluationRow = {
  id: string;
  customer_email: string;
  device_id: string;
  final_value: number;
  created_at: string;
};

type ConditionRow = {
  id: string;
  condition_name: string;
  discount_percentage: number;
  is_rejected: boolean;
};

const STATUS_META: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  in_progress: {
    label: "Aberto",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  },
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "in_progress", label: "Aberto" },
  { value: "completed", label: "Concluído" },
  { value: "rejected", label: "Rejeitado" },
];

type ColumnKey =
  | "name"
  | "email"
  | "phone"
  | "device"
  | "status"
  | "date"
  | "value";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "device", label: "Aparelho" },
  { key: "status", label: "Status" },
  { key: "date", label: "Data" },
  { key: "value", label: "Valor Final" },
];

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  name: true,
  email: true,
  phone: false,
  device: true,
  status: true,
  date: true,
  value: true,
};

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadRow[];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-leads-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, brand, model, storage, base_price");
      if (error) throw error;
      return data as DeviceRow[];
    },
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["admin-leads-evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, customer_email, device_id, final_value, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EvaluationRow[];
    },
  });

  const { data: conditions = [] } = useQuery({
    queryKey: ["admin-leads-conditions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("id, condition_name, discount_percentage, is_rejected")
        .order("display_order");
      if (error) throw error;
      return data as ConditionRow[];
    },
  });

  const deviceMap = useMemo(
    () => new Map(devices.map((d) => [d.id, d])),
    [devices]
  );

  const finalValueMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of evaluations) {
      if (!m.has(e.customer_email)) m.set(e.customer_email, e.final_value);
    }
    return m;
  }, [evaluations]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => d.brand && set.add(d.brand));
    return Array.from(set).sort();
  }, [devices]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;

      if (term) {
        const hay = `${l.customer_name} ${l.customer_email} ${l.customer_phone}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }

      const dev = l.device_id ? deviceMap.get(l.device_id) : null;
      if (brandFilter !== "all") {
        if (!dev || dev.brand !== brandFilter) return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, brandFilter, deviceMap]);

  const formatBRL = (n: number | null | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const visibleCols = COLUMNS.filter((c) => visible[c.key]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie todos os leads e avaliações capturados pela calculadora.
        </p>
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="lg:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="lg:w-44">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Columns3 className="h-4 w-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Mostrar colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={visible[c.key]}
                  onCheckedChange={(v) =>
                    setVisible((prev) => ({ ...prev, [c.key]: !!v }))
                  }
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          {isLoading
            ? "Carregando..."
            : `${filtered.length} de ${leads.length} registro(s)`}
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {visibleCols.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(c.key === "value" && "text-right")}
                  >
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={visibleCols.length + 1}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((lead) => {
                const dev = lead.device_id
                  ? deviceMap.get(lead.device_id)
                  : null;
                const meta = STATUS_META[lead.status] ?? STATUS_META.in_progress;
                const Icon = meta.icon;
                const finalValue = finalValueMap.get(lead.customer_email);

                const cell = (key: ColumnKey) => {
                  switch (key) {
                    case "name":
                      return (
                        <TableCell key={key} className="font-medium">
                          {lead.customer_name}
                        </TableCell>
                      );
                    case "email":
                      return (
                        <TableCell key={key} className="text-sm text-muted-foreground">
                          {lead.customer_email}
                        </TableCell>
                      );
                    case "phone":
                      return (
                        <TableCell key={key} className="text-sm text-muted-foreground">
                          {lead.customer_phone}
                        </TableCell>
                      );
                    case "device":
                      return (
                        <TableCell key={key}>
                          {dev ? (
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">
                                {dev.brand} {dev.model}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    case "status":
                      return (
                        <TableCell key={key}>
                          <Badge
                            variant="outline"
                            className={cn("gap-1 font-normal", meta.className)}
                          >
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                      );
                    case "date":
                      return (
                        <TableCell key={key} className="text-sm text-muted-foreground">
                          {format(new Date(lead.created_at), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      );
                    case "value":
                      return (
                        <TableCell key={key} className="text-right font-medium">
                          {formatBRL(finalValue)}
                        </TableCell>
                      );
                  }
                };

                return (
                  <TableRow key={lead.id} className="hover:bg-muted/40">
                    {visibleCols.map((c) => cell(c.key))}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLead(lead)}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedLead}
        onOpenChange={(o) => !o && setSelectedLead(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <LeadDetail
              lead={selectedLead}
              device={
                selectedLead.device_id
                  ? deviceMap.get(selectedLead.device_id) ?? null
                  : null
              }
              finalValue={finalValueMap.get(selectedLead.customer_email)}
              conditions={conditions}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const CONDITION_ITEM_ID = "__condition__";

type ParsedAnswer = {
  question: string;
  answer: string;
  isCritical: boolean;
};

function parseResponses(
  responses: Record<string, any>,
  conditions: ConditionRow[]
): ParsedAnswer[] {
  const result: ParsedAnswer[] = [];

  for (const [key, value] of Object.entries(responses)) {
    if (value === null || value === undefined) continue;

    if (key === CONDITION_ITEM_ID) {
      const idx = typeof value === "number" ? value : Number(value);
      const cond = conditions[idx];
      if (cond) {
        result.push({
          question: "Condição Geral do Aparelho",
          answer: cond.condition_name,
          isCritical: cond.is_rejected,
        });
      } else {
        result.push({
          question: "Condição Geral do Aparelho",
          answer: String(value),
          isCritical: false,
        });
      }
      continue;
    }

    const item = checklistItems.find((i) => i.id === key);
    if (item) {
      const idx = typeof value === "number" ? value : Number(value);
      const opt = item.options[idx];
      result.push({
        question: item.title,
        answer: opt?.label ?? String(value),
        isCritical: !!opt?.isCritical,
      });
    } else {
      result.push({
        question: key.replace(/_/g, " "),
        answer:
          typeof value === "object" ? JSON.stringify(value) : String(value),
        isCritical: false,
      });
    }
  }

  return result;
}

function LeadDetail({
  lead,
  device,
  finalValue,
  conditions,
}: {
  lead: LeadRow;
  device: DeviceRow | null;
  finalValue?: number;
  conditions: ConditionRow[];
}) {
  const meta = STATUS_META[lead.status] ?? STATUS_META.in_progress;
  const Icon = meta.icon;
  const responses = (lead.assessment_responses ?? {}) as Record<string, any>;
  const parsed = useMemo(
    () => parseResponses(responses, conditions),
    [responses, conditions]
  );

  return (
    <>
      <SheetHeader>
        <SheetTitle>{lead.customer_name}</SheetTitle>
        <SheetDescription>
          Cadastrado em{" "}
          {format(new Date(lead.created_at), "dd 'de' MMMM 'às' HH:mm", {
            locale: ptBR,
          })}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        <div>
          <Badge
            variant="outline"
            className={cn("gap-1 font-normal", meta.className)}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </div>

        {/* Contato */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contato
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{lead.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${lead.customer_email}`}
                className="text-primary hover:underline"
              >
                {lead.customer_email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${lead.customer_phone}`}
                className="text-primary hover:underline"
              >
                {lead.customer_phone}
              </a>
            </div>
          </div>
        </section>

        <Separator />

        {/* Aparelho */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aparelho selecionado
          </h4>
          {device ? (
            <Card className="p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <p className="font-semibold">
                    {device.brand} {device.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Armazenamento: {device.storage}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Preço base:{" "}
                    {device.base_price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum aparelho selecionado.
            </p>
          )}
        </section>

        {/* Valor */}
        {typeof finalValue === "number" && (
          <>
            <Separator />
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Valor final ofertado
              </h4>
              <p className="text-2xl font-bold text-primary">
                {finalValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </section>
          </>
        )}

        {/* Rejection */}
        {lead.rejection_reason && (
          <>
            <Separator />
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Motivo da rejeição
              </h4>
              <Card className="p-3 border-destructive/30 bg-destructive/10">
                <div className="flex items-start gap-2">
                  <Ban className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    {lead.rejection_reason}
                  </p>
                </div>
              </Card>
            </section>
          </>
        )}

        <Separator />

        {/* Checklist responses */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Respostas do checklist
          </h4>
          {parsed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {parsed.map((entry, i) => (
                <Card
                  key={i}
                  className={cn(
                    "p-3 flex items-start gap-3",
                    entry.isCritical
                      ? "border-destructive/30 bg-destructive/5"
                      : "bg-muted/20"
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      entry.isCritical
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {entry.isCritical ? (
                      <Ban className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {entry.question}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        entry.isCritical && "text-destructive"
                      )}
                    >
                      {entry.answer}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default AdminCustomers;
