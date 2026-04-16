import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Smartphone,
  Mail,
  Phone,
  User,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

const STATUS_META: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  in_progress: {
    label: "Pendente",
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
  { value: "in_progress", label: "Pendente" },
  { value: "completed", label: "Concluído" },
  { value: "rejected", label: "Rejeitado" },
];

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

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

  const deviceMap = useMemo(
    () => new Map(devices.map((d) => [d.id, d])),
    [devices]
  );

  // Map latest final_value per email
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

      const created = new Date(l.created_at);
      if (dateFrom && created < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, brandFilter, dateFrom, dateTo, deviceMap]);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (brandFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setBrandFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const formatBRL = (n: number | null | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 px-1.5">{activeFiltersCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtros avançados</h4>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Marca do aparelho</Label>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger>
                      <SelectValue />
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
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">De</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : "—"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateTo ? format(dateTo, "dd/MM/yy") : "—"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Aparelho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor Final</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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

                return (
                  <TableRow
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">
                      {lead.customer_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-muted-foreground">
                          {lead.customer_email}
                        </span>
                        <span className="text-muted-foreground">
                          {lead.customer_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1 font-normal", meta.className)}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(finalValue)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
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
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function LeadDetail({
  lead,
  device,
  finalValue,
}: {
  lead: LeadRow;
  device: DeviceRow | null;
  finalValue?: number;
}) {
  const meta = STATUS_META[lead.status] ?? STATUS_META.in_progress;
  const Icon = meta.icon;
  const responses = (lead.assessment_responses ?? {}) as Record<string, any>;
  const responseEntries = Object.entries(responses);

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
              <Card className="p-3 border-red-200 bg-red-50">
                <p className="text-sm text-red-900">{lead.rejection_reason}</p>
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
          {responseEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {responseEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 text-sm py-2 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ").replace(/__/g, "")}
                  </span>
                  <span className="font-medium text-right">
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default AdminCustomers;
