import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  MessageCircle,
  FileText,
  ExternalLink,
  Loader2,
  Sparkles,
  Archive,
  ArchiveRestore,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildWhatsAppLink, openProposalInNewTab } from "@/lib/proposal";
import { CommercialAdjustmentSection } from "@/components/admin/CommercialAdjustmentSection";
import { ContractDownloadButtons } from "@/components/admin/ContractDownloadButtons";
import { useAuth } from "@/hooks/use-auth";
import { parseProposalOverride } from "@/lib/proposal-override";
import { ArrowLeftRight, ShoppingBag, Palette, HardDrive } from "lucide-react";


type LeadRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_id: string | null;
  status: string;
  rejection_reason: string | null;
  assessment_responses: any;
  imei: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  [k: string]: any;
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
  [k: string]: any;
};

type ConditionRow = {
  id: string;
  condition_name: string;
  discount_percentage: number;
  is_rejected: boolean;
};

type DamageOption = {
  id: string;
  damage_category_id: string;
  option_name: string;
  deduction_value: number;
  is_rejected: boolean;
};

type DamageCategory = {
  id: string;
  name: string;
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
  conversa_iniciada: {
    label: "Conversa iniciada",
    icon: MessageCircle,
    className:
      "bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  },
};

// Funnel stages.
// "lead_only"   = in_progress  AND device_id IS NULL  (só preencheu contato)
// "incomplete"  = in_progress  AND device_id IS NOT NULL (escolheu device, abandonou)
// "completed"/"conversa_iniciada"/"rejected" map directly to leads.status.
const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "lead_only", label: "Lead (só contato)" },
  { value: "incomplete", label: "Proposta incompleta" },
  { value: "completed", label: "Concluído" },
  { value: "conversa_iniciada", label: "Conversa iniciada" },
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
  const qc = useQueryClient();
  const { user } = useAuth();
  const adminEmail = user?.email ?? null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived" | "all">("active");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

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
        .select("*")
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

  const { data: damageCategories = [] } = useQuery({
    queryKey: ["admin-leads-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("id, name")
        .order("display_order");
      if (error) throw error;
      return data as DamageCategory[];
    },
  });

  const { data: damageOptions = [] } = useQuery({
    queryKey: ["admin-leads-damage-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_deductions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as DamageOption[];
    },
  });

  const { data: colors = [] } = useQuery({
    queryKey: ["admin-leads-colors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colors").select("id, name, hex_code");
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; hex_code: string | null }>;
    },
  });

  const colorMap = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (e: any) => toast.error(`Falha ao atualizar status: ${e.message}`),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await (supabase.rpc as any)("archive_lead", {
        _lead_id: id,
        _archive: archive,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success(vars.archive ? "Proposta arquivada." : "Proposta restaurada.");
    },
    onError: (e: any) => toast.error(`Falha ao arquivar: ${e.message}`),
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

  const evaluationByEmail = useMemo(() => {
    const m = new Map<string, EvaluationRow>();
    for (const e of evaluations) {
      if (!m.has(e.customer_email)) m.set(e.customer_email, e);
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
      if (archivedFilter === "active" && l.archived_at) return false;
      if (archivedFilter === "archived" && !l.archived_at) return false;

      if (statusFilter !== "all") {
        if (statusFilter === "lead_only") {
          if (!(l.status === "in_progress" && !l.device_id)) return false;
        } else if (statusFilter === "incomplete") {
          if (!(l.status === "in_progress" && l.device_id)) return false;
        } else if (l.status !== statusFilter) {
          return false;
        }
      }

      if (term) {
        const hay = `${l.customer_name} ${l.customer_email} ${l.customer_phone} ${l.imei ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }

      const dev = l.device_id ? deviceMap.get(l.device_id) : null;
      if (brandFilter !== "all") {
        if (!dev || dev.brand !== brandFilter) return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, brandFilter, archivedFilter, deviceMap]);

  const formatBRL = (n: number | null | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const visibleCols = COLUMNS.filter((c) => visible[c.key]);

  // ── Proposal / WhatsApp flow ──
  const selectedDevice = selectedLead?.device_id
    ? deviceMap.get(selectedLead.device_id) ?? null
    : null;
  const selectedEvaluation = selectedLead
    ? evaluationByEmail.get(selectedLead.customer_email) ?? null
    : null;
  const selectedFinalValue = selectedEvaluation?.final_value;
  const selectedDeviceLabel = selectedDevice
    ? `${selectedDevice.brand} ${selectedDevice.model} ${selectedDevice.storage}`.trim()
    : "Aparelho não informado";
  const selectedParsed = useMemo(() => {
    if (!selectedLead) return [];
    return parseResponses(
      (selectedLead.assessment_responses ?? {}) as Record<string, any>,
      conditions,
      damageOptions,
      damageCategories,
    );
  }, [selectedLead, conditions, damageOptions, damageCategories]);

  const handleSendProposal = async () => {
    if (!selectedLead) return;

    const finalValue = selectedFinalValue ?? 0;
    const basePrice = selectedDevice?.base_price ?? 0;

    // 1) Open the proposal HTML in a new tab
    openProposalInNewTab({
      customerName: selectedLead.customer_name,
      customerEmail: selectedLead.customer_email,
      customerPhone: selectedLead.customer_phone,
      deviceLabel: selectedDeviceLabel,
      basePrice,
      finalValue,
      conditions: selectedParsed.map((p) => ({
        label: p.question,
        value: p.answer,
        critical: p.isCritical,
      })),
      rejectionReason: selectedLead.rejection_reason,
      createdAt: selectedLead.created_at,
    });

    // 2) Open WhatsApp
    const waUrl = buildWhatsAppLink(
      selectedLead.customer_phone,
      selectedLead.customer_name,
      selectedDeviceLabel,
      finalValue,
    );
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // 3) Update lead status
    await updateStatusMutation.mutateAsync({
      id: selectedLead.id,
      status: "conversa_iniciada",
    });

    toast.success("Proposta gerada e WhatsApp aberto. Status atualizado.");
    setProposalDialogOpen(false);
  };

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
              placeholder="Buscar por nome, email, telefone ou IMEI..."
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

          <Select value={archivedFilter} onValueChange={(v) => setArchivedFilter(v as any)}>
            <SelectTrigger className="lg:w-40">
              <SelectValue placeholder="Visibilidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="archived">Arquivadas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
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
                  <TableRow
                    key={lead.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    {visibleCols.map((c) => cell(c.key))}
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          className="gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={lead.archived_at ? "Restaurar" : "Arquivar/Excluir"}
                          onClick={() =>
                            archiveMutation.mutate({ id: lead.id, archive: !lead.archived_at })
                          }
                          className={cn(
                            "gap-1.5",
                            lead.archived_at
                              ? "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              : "text-destructive hover:text-destructive hover:bg-destructive/10",
                          )}
                        >
                          {lead.archived_at ? (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          ) : (
                            <Archive className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail — Full screen modal */}
      <Dialog
        open={!!selectedLead}
        onOpenChange={(o) => !o && setSelectedLead(null)}
      >
        <DialogContent
          className="p-0 gap-0 max-w-none w-[96vw] h-[94vh] sm:rounded-xl flex flex-col overflow-hidden"
        >
          {selectedLead && (
            <LeadDetail
              lead={selectedLead}
              device={selectedDevice}
              finalValue={selectedFinalValue}
              parsed={selectedParsed}
              evaluation={selectedEvaluation}
              adminEmail={adminEmail}
              colorMap={colorMap}
              onSendProposal={() => setProposalDialogOpen(true)}
              onClose={() => setSelectedLead(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Confirmation Dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="z-[70] w-[calc(100vw-2rem)] max-w-md min-w-0 overflow-hidden">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-2">
              <MessageCircle className="h-6 w-6 text-emerald-700" />
            </div>
            <DialogTitle className="text-center">
              Confirmar envio da proposta
            </DialogTitle>
            <DialogDescription className="text-center">
              Revise o resumo abaixo. Ao confirmar, abriremos a proposta em nova
              aba e o WhatsApp do cliente.
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="min-w-0 space-y-4 py-2">
              <Card className="min-w-0 overflow-hidden p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pollicell
                  </span>
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="min-w-0 truncate text-right font-medium">
                      {selectedLead.customer_name}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="text-muted-foreground">Telefone</span>
                    <span className="min-w-0 truncate text-right font-medium">
                      {selectedLead.customer_phone}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="text-muted-foreground">Aparelho</span>
                    <span className="min-w-0 truncate text-right font-medium">
                      {selectedDeviceLabel}
                    </span>
                  </div>
                </div>

                {selectedParsed.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Condições identificadas
                      </p>
                      <ul className="text-xs space-y-1.5">
                        {selectedParsed.slice(0, 4).map((p, i) => (
                          <li
                            key={i}
                            className={cn(
                              "flex justify-between gap-3 min-w-0",
                              p.isCritical && "text-destructive",
                            )}
                          >
                            <span className="text-muted-foreground truncate flex-1 min-w-0">
                              {p.question}
                            </span>
                            <span className="font-medium text-right truncate flex-1 min-w-0">
                              {p.answer}
                            </span>
                          </li>
                        ))}
                        {selectedParsed.length > 4 && (
                          <li className="text-muted-foreground italic">
                            +{selectedParsed.length - 4} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor final
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatBRL(selectedFinalValue)}
                  </span>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter className="min-w-0 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setProposalDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendProposal}
              disabled={updateStatusMutation.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Confirmar e enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Parser for the new JSONB schema (conditionId, damageOptionByCategory, rejectionId)
// with a fallback for the legacy index-based shape.
// ─────────────────────────────────────────────────────────────

type ParsedAnswer = {
  question: string;
  answer: string;
  isCritical: boolean;
};

function parseResponses(
  responses: Record<string, any>,
  conditions: ConditionRow[],
  damageOptions: DamageOption[],
  damageCategories: DamageCategory[],
): ParsedAnswer[] {
  const result: ParsedAnswer[] = [];

  // ─── New schema ───
  // conditionId / damageOptionByCategory / rejectionId
  if (
    responses &&
    ("conditionId" in responses ||
      "damageOptionByCategory" in responses ||
      "rejectionId" in responses)
  ) {
    if (responses.conditionId) {
      const cond = conditions.find((c) => c.id === responses.conditionId);
      if (cond) {
        result.push({
          question: "Condição Geral do Aparelho",
          answer: cond.condition_name,
          isCritical: cond.is_rejected,
        });
      }
    }

    const dmg = (responses.damageOptionByCategory ?? {}) as Record<string, string | null>;
    for (const [catId, optId] of Object.entries(dmg)) {
      if (!optId) continue;
      const opt = damageOptions.find((o) => o.id === optId);
      const cat = damageCategories.find((c) => c.id === catId);
      if (opt && cat) {
        result.push({
          question: cat.name,
          answer: opt.option_name,
          isCritical: opt.is_rejected,
        });
      }
    }

    if (responses.rejectionId) {
      const rej = conditions.find((c) => c.id === responses.rejectionId);
      if (rej) {
        result.push({
          question: "Impedimento de compra",
          answer: rej.condition_name,
          isCritical: true,
        });
      }
    }

    return result;
  }

  // ─── Legacy schema fallback (index-based) ───
  for (const [key, value] of Object.entries(responses ?? {})) {
    if (value === null || value === undefined) continue;
    result.push({
      question: key.replace(/_/g, " "),
      answer:
        typeof value === "object" ? JSON.stringify(value) : String(value),
      isCritical: false,
    });
  }
  return result;
}

function LeadDetail({
  lead,
  device,
  finalValue,
  parsed,
  evaluation,
  adminEmail,
  colorMap,
  onSendProposal,
  onClose,
}: {
  lead: LeadRow;
  device: DeviceRow | null;
  finalValue?: number;
  parsed: ParsedAnswer[];
  evaluation: EvaluationRow | null;
  adminEmail: string | null;
  colorMap: Map<string, { id: string; name: string; hex_code: string | null }>;
  onSendProposal: () => void;
  onClose: () => void;
}) {
  const meta = STATUS_META[lead.status] ?? STATUS_META.in_progress;
  const Icon = meta.icon;

  // Flow type — vem de assessment_responses.flow_type (ou evaluations.flow_type)
  const flowType: "trade" | "sale" =
    (evaluation?.flow_type as any) ||
    ((lead.assessment_responses as any)?.flow_type as any) ||
    "trade";
  const isTrade = flowType === "trade";
  const flowLabel = isTrade ? "Troca" : "Venda direta";
  const FlowIcon = isTrade ? ArrowLeftRight : ShoppingBag;

  // Cor escolhida (id em assessment_responses.selectedColorId, nome em colorMap)
  const colorId = (lead.assessment_responses as any)?.selectedColorId as string | null | undefined;
  const chosenColor = colorId ? colorMap.get(colorId) : null;

  // Override comercial (se houver) — para destacar bônus extra no resumo
  const override = parseProposalOverride(evaluation?.internal_notes ?? null);
  const extraBonus = override?.extraBonus ?? 0;

  const canSendProposal =
    lead.status !== "rejected" &&
    !!device &&
    typeof finalValue === "number" &&
    finalValue > 0;

  const deviceLabel = device
    ? `${device.brand} ${device.model} ${device.storage}`.trim()
    : "Aparelho não informado";

  return (
    <>
      {/* Sticky header */}
      <DialogHeader className="px-6 py-4 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl font-bold truncate">
              {lead.customer_name}
            </DialogTitle>
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              <span>
                Cadastrado em{" "}
                {format(new Date(lead.created_at), "dd 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
              <Badge
                variant="outline"
                className={cn("gap-1 font-normal", meta.className)}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 font-normal",
                  isTrade
                    ? "bg-violet-100 text-violet-800 border-violet-200"
                    : "bg-blue-100 text-blue-800 border-blue-200",
                )}
              >
                <FlowIcon className="h-3 w-3" />
                {flowLabel}
              </Badge>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* Two-column body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">
            {/* Sales action card */}
            {canSendProposal && (
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-sky-50 border-emerald-200/60">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-emerald-900">Pronto para fechar?</p>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      Envie a proposta formatada via WhatsApp em um clique.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onSendProposal}
                  className="w-full mt-3 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar Proposta via WhatsApp
                </Button>
              </Card>
            )}

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
                  <a href={`mailto:${lead.customer_email}`} className="text-primary hover:underline truncate">
                    {lead.customer_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.customer_phone}`} className="text-primary hover:underline">
                    {lead.customer_phone}
                  </a>
                </div>
              </div>
            </section>

            <Separator />

            {/* Aparelho selecionado */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aparelho selecionado
              </h4>
              {device ? (
                <Card className="p-4 bg-muted/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 mt-0.5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {device.brand} {device.model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isTrade
                          ? "Aparelho que o cliente vai entregar na troca"
                          : "Aparelho que o cliente quer vender"}
                      </p>
                    </div>
                  </div>

                  {/* Specs grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Armazenamento
                        </p>
                        <p className="font-medium truncate">{device.storage || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Cor escolhida
                        </p>
                        {chosenColor ? (
                          <div className="flex items-center gap-1.5">
                            {chosenColor.hex_code && (
                              <span
                                className="inline-block h-3 w-3 rounded-full border border-border"
                                style={{ backgroundColor: chosenColor.hex_code }}
                              />
                            )}
                            <p className="font-medium truncate">{chosenColor.name}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Não informada</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {isTrade ? "Crédito base na troca" : "Preço base de compra"}
                    </span>
                    <span className="font-bold text-primary tabular-nums">
                      {device.base_price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum aparelho selecionado.</p>
              )}
            </section>

            {/* Endereço */}
            {(lead.address_zip || lead.address_city) && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Endereço
                  </h4>
                  <div className="text-sm text-foreground leading-relaxed rounded-md border border-border p-3 bg-muted/10">
                    {[
                      [lead.address_street, lead.address_number].filter(Boolean).join(", "),
                      lead.address_complement,
                      lead.address_neighborhood,
                      [lead.address_city, lead.address_state].filter(Boolean).join(" - "),
                      lead.address_zip ? `CEP ${lead.address_zip}` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
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
                      <p className="text-sm text-destructive">{lead.rejection_reason}</p>
                    </div>
                  </Card>
                </section>
              </>
            )}

            {/* Quick action: WhatsApp + visualizar proposta */}
            <Separator />
            <section className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a
                  href={buildWhatsAppLink(
                    lead.customer_phone,
                    lead.customer_name,
                    deviceLabel,
                    finalValue ?? 0,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </Button>
              {canSendProposal && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    openProposalInNewTab({
                      customerName: lead.customer_name,
                      customerEmail: lead.customer_email,
                      customerPhone: lead.customer_phone,
                      deviceLabel,
                      basePrice: device?.base_price ?? 0,
                      finalValue: finalValue ?? 0,
                      conditions: parsed.map((p) => ({
                        label: p.question,
                        value: p.answer,
                        critical: p.isCritical,
                      })),
                      rejectionReason: lead.rejection_reason,
                      createdAt: lead.created_at,
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5" />
                  Visualizar proposta
                </Button>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">
            {/* Raio-X */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Raio-X do aparelho
                </h4>
                {parsed.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {parsed.length} respostas
                  </span>
                )}
              </div>
              {parsed.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma resposta registrada.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parsed.map((entry, i) => (
                    <Card
                      key={i}
                      className={cn(
                        "p-3 flex items-start gap-3",
                        entry.isCritical
                          ? "border-destructive/30 bg-destructive/5"
                          : "bg-muted/20",
                      )}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          entry.isCritical
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {entry.isCritical ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{entry.question}</p>
                        <p
                          className={cn(
                            "text-sm font-medium",
                            entry.isCritical && "text-destructive",
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

            {/* Resumo financeiro */}
            {evaluation && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Resumo financeiro
                  </h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      isTrade
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-blue-50 text-blue-700 border-blue-200",
                    )}
                  >
                    <FlowIcon className="h-3 w-3" />
                    {flowLabel}
                  </Badge>
                </div>

                <div className="rounded-md border border-border divide-y divide-border text-sm bg-background">
                  {(() => {
                    const basePrice = Number(override?.original.basePrice ?? evaluation.base_price) || 0;
                    // IMPORTANTE: `condition_discount` é gravado como % (percentDiscount somado),
                    // e `total_deductions` é o R$ fixo de defeitos. A fórmula final é:
                    //   subtotal = base − (base × condPct/100) − fixedDeductions
                    //   final    = subtotal × (1 + bônusFluxo%)
                    const condPct = Number(evaluation.condition_discount) || 0;
                    const fixedDeductions = Number(evaluation.total_deductions) || 0;
                    const condDiscMoney = Math.round(basePrice * (condPct / 100) * 100) / 100;
                    const originalFinal = Number(override?.original.finalValue ?? evaluation.final_value) || 0;
                    const subtotalAfterDamages =
                      Math.round((basePrice - condDiscMoney - fixedDeductions) * 100) / 100;
                    // Bônus do fluxo (troca/venda) embutido no final original = original − subtotal
                    const flowBonus = Math.round((originalFinal - subtotalAfterDamages) * 100) / 100;
                    const flowBonusPct =
                      subtotalAfterDamages > 0
                        ? Math.round((flowBonus / subtotalAfterDamages) * 1000) / 10
                        : 0;
                    return (
                      <>
                        <FinanceRow
                          label={isTrade ? "Crédito base do aparelho" : "Preço base de compra"}
                          value={formatBRLNum(basePrice)}
                        />
                        {condPct > 0 && (
                          <FinanceRow
                            label={`Desconto por condição (${condPct}%)`}
                            value={`− ${formatBRLNum(condDiscMoney)}`}
                          />
                        )}
                        {fixedDeductions > 0 && (
                          <FinanceRow
                            label="Deduções por defeitos"
                            value={`− ${formatBRLNum(fixedDeductions)}`}
                          />
                        )}
                        <FinanceRow
                          label="Subtotal após defeitos e condição"
                          value={formatBRLNum(subtotalAfterDamages)}
                        />
                        {flowBonus !== 0 && (
                          <FinanceRow
                            label={
                              isTrade
                                ? `Bônus de troca (fluxo${flowBonusPct ? ` +${flowBonusPct}%` : ""})`
                                : `Bônus de venda (fluxo${flowBonusPct ? ` +${flowBonusPct}%` : ""})`
                            }
                            value={`${flowBonus >= 0 ? "+" : "−"} ${formatBRLNum(Math.abs(flowBonus))}`}
                            accent={flowBonus >= 0 ? "success" : "destructive"}
                          />
                        )}
                        <FinanceRow
                          label={
                            override
                              ? "Valor final original do cliente"
                              : isTrade
                                ? "Crédito final ao cliente"
                                : "Valor final ao cliente"
                          }
                          value={formatBRLNum(originalFinal)}
                          bold={!override}
                        />
                        {override && extraBonus !== 0 && (
                          <FinanceRow
                            label="Bônus extra do comercial"
                            value={`${extraBonus >= 0 ? "+" : "−"} ${formatBRLNum(Math.abs(extraBonus))}`}
                            accent={extraBonus >= 0 ? "success" : "destructive"}
                          />
                        )}
                        {override && (
                          <FinanceRow
                            label={isTrade ? "Crédito total negociado (cupom)" : "Valor total negociado (cupom)"}
                            value={formatBRLNum(evaluation.final_value)}
                            bold
                          />
                        )}
                      </>
                    );
                  })()}
                </div>

                {evaluation.coupon_code && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    {isTrade
                      ? "O cliente usa o cupom como crédito ao adquirir um novo aparelho."
                      : "O cliente recebe o valor após a entrega e validação do aparelho."}
                  </p>
                )}
              </section>
            )}

            {/* Ajuste comercial + Contrato */}
            {evaluation ? (
              <>
                <CommercialAdjustmentSection evaluation={evaluation} adminEmail={adminEmail} />
                <ContractDownloadButtons evaluation={evaluation} />
              </>
            ) : (
              <Card className="p-4 bg-muted/20 border-dashed text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p>
                  O ajuste comercial e o download do contrato ficam disponíveis quando o cliente
                  conclui a proposta (cupom emitido).
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FinanceRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: "success" | "destructive";
}) {
  const accentText =
    accent === "success"
      ? "text-success"
      : accent === "destructive"
        ? "text-destructive"
        : null;
  const accentBg =
    accent === "success"
      ? "bg-success/5"
      : accent === "destructive"
        ? "bg-destructive/5"
        : null;
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2",
        bold && "bg-muted/40",
        accentBg,
      )}
    >
      <span
        className={cn(
          "text-muted-foreground",
          bold && "text-foreground font-semibold",
          accentText && `${accentText} font-medium`,
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold text-primary" : "text-foreground",
          accentText && `${accentText} font-semibold`,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatBRLNum(n: number | null | undefined) {
  return typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
}

export default AdminCustomers;
