import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Users,
  Phone,
  Mail,
  Smartphone,
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ProposalDetailSheet, type ProposalKind } from "@/components/admin/ProposalDetailSheet";
import { openWhatsapp } from "@/lib/whatsapp";

type LeadRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_id: string | null;
  status: string;
  flow_type: string;
  imei: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type EvaluationRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_id: string | null;
  flow_type: string;
  status: string;
  final_value: number;
  coupon_code: string | null;
  imei: string | null;
  created_at: string;
  archived_at: string | null;
};

type DeviceRow = { id: string; brand: string; model: string; storage: string };

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

const STATUS_LABEL: Record<string, { label: string; cls: string; Icon: any }> = {
  in_progress: { label: "Em andamento", cls: "bg-amber-100 text-amber-800 border-amber-200", Icon: Clock },
  completed: { label: "Concluído", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  conversa_iniciada: { label: "Conversa iniciada", cls: "bg-sky-100 text-sky-800 border-sky-200", Icon: MessageCircle },
  rejected: { label: "Rejeitado", cls: "bg-red-100 text-red-800 border-red-200", Icon: XCircle },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-800 border-amber-200", Icon: Clock },
  approved: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
};

const formatBRL = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

interface CustomerGroup {
  phoneKey: string;
  name: string;
  email: string;
  phone: string;
  leads: LeadRow[];
  evaluations: EvaluationRow[];
  lastActivity: string;
}

const AdminCustomerView = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ kind: ProposalKind; id: string } | null>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ["admin-customer-view-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadRow[];
    },
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ["admin-customer-view-evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EvaluationRow[];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["admin-customer-view-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, brand, model, storage");
      if (error) throw error;
      return (data || []) as DeviceRow[];
    },
  });

  const deviceMap = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);

  const groups: CustomerGroup[] = useMemo(() => {
    const map = new Map<string, CustomerGroup>();

    const upsert = (phoneKey: string, name: string, email: string, phone: string, when: string) => {
      const cur = map.get(phoneKey);
      if (cur) {
        if (when > cur.lastActivity) cur.lastActivity = when;
        if (!cur.name && name) cur.name = name;
        if (!cur.email && email) cur.email = email;
        return cur;
      }
      const fresh: CustomerGroup = {
        phoneKey,
        name,
        email,
        phone,
        leads: [],
        evaluations: [],
        lastActivity: when,
      };
      map.set(phoneKey, fresh);
      return fresh;
    };

    for (const l of leads) {
      const key = onlyDigits(l.customer_phone);
      if (!key) continue;
      const g = upsert(key, l.customer_name, l.customer_email, l.customer_phone, l.created_at);
      g.leads.push(l);
    }
    for (const e of evaluations) {
      const key = onlyDigits(e.customer_phone);
      if (!key) continue;
      const g = upsert(key, e.customer_name, e.customer_email, e.customer_phone, e.created_at);
      g.evaluations.push(e);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
  }, [leads, evaluations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const hay = `${g.name} ${g.email} ${g.phone} ${g.phoneKey}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, search]);

  const current = useMemo(
    () => (selected ? filtered.find((g) => g.phoneKey === selected) ?? null : null),
    [filtered, selected],
  );

  const deviceLabel = (id: string | null) => {
    if (!id) return "Aparelho não informado";
    const d = deviceMap.get(id);
    return d ? `${d.brand} ${d.model} ${d.storage}`.trim() : "Aparelho removido do catálogo";
  };

  if (current) {
    const couponEvals = current.evaluations.filter((e) => !!e.coupon_code);
    const openLeads = current.leads.filter((l) => l.status === "in_progress");
    const closedLeads = current.leads.filter((l) => l.status !== "in_progress");

    const greetCustomer = () => {
      const first = current.name?.split(" ")[0] ?? "";
      openWhatsapp(
        current.phone,
        `Olá${first ? `, ${first}` : ""}! Tudo bem? Sou da Pollicell e estou retornando sobre sua avaliação.`,
      );
    };

    return (
      <div className="p-6 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à lista
        </Button>

        <Card className="p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">
                {current.name || "Cliente sem nome"}
              </h2>
              <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {current.phone}
                </span>
                {current.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {current.email}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={greetCustomer}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chamar no WhatsApp</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="gap-1">
              <Ticket className="h-3 w-3" /> {couponEvals.length} cupom(ns)
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> {openLeads.length} em andamento
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> {closedLeads.length} finalizadas
            </Badge>
          </div>
        </Card>

        {/* Cupons / Avaliações concluídas */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cupons emitidos
          </h3>
          {couponEvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cupom emitido para este cliente.</p>
          ) : (
            <div className="space-y-2">
              {couponEvals.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setDetail({ kind: "evaluation", id: e.id })}
                  className="w-full text-left"
                >
                  <Card className="p-4 hover:border-primary/40 hover:shadow-sm transition cursor-pointer">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Smartphone className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{deviceLabel(e.device_id)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(e.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            {" · "}
                            {e.flow_type === "sale" ? "Venda" : "Troca"}
                            {e.imei && (
                              <>
                                {" · "}
                                <span className="font-mono">IMEI {e.imei}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{formatBRL(e.final_value)}</p>
                        {e.coupon_code && (
                          <code className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-foreground">
                            {e.coupon_code}
                          </code>
                        )}
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* Propostas em andamento */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Propostas em andamento
          </h3>
          {openLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma proposta aberta no momento.</p>
          ) : (
            <div className="space-y-2">
              {openLeads.map((l) => {
                const meta = STATUS_LABEL[l.status] ?? STATUS_LABEL.in_progress;
                const Icon = meta.Icon;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setDetail({ kind: "lead", id: l.id })}
                    className="w-full text-left"
                  >
                    <Card className="p-4 hover:border-primary/40 hover:shadow-sm transition cursor-pointer">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Smartphone className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{deviceLabel(l.device_id)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                              {" · "}
                              {l.flow_type === "sale" ? "Venda" : "Troca"}
                              {l.imei && (
                                <>
                                  {" · "}
                                  <span className="font-mono">IMEI {l.imei}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("gap-1", meta.cls)}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Histórico (rejeitadas / outras) */}
        {closedLeads.length > 0 && (
          <>
            <Separator />
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Histórico
              </h3>
              <div className="space-y-2">
                {closedLeads.map((l) => {
                  const meta = STATUS_LABEL[l.status] ?? STATUS_LABEL.in_progress;
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setDetail({ kind: "lead", id: l.id })}
                      className="w-full text-left"
                    >
                      <Card className="p-4 hover:border-primary/40 hover:shadow-sm transition cursor-pointer">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{deviceLabel(l.device_id)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(l.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                              {l.rejection_reason ? ` · ${l.rejection_reason}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("gap-1", meta.cls)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <Card className="p-4 bg-muted/20 flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p>
            Cada IMEI só pode gerar um cupom por tipo de negociação (troca ou venda). Se este
            cliente quiser uma nova proposta, ela precisa ser para um aparelho diferente.
          </p>
        </Card>

        <ProposalDetailSheet
          kind={detail?.kind ?? null}
          id={detail?.id ?? null}
          customerName={current.name}
          customerPhone={current.phone}
          deviceLabel={
            detail
              ? deviceLabel(
                  (detail.kind === "lead"
                    ? current.leads.find((l) => l.id === detail.id)?.device_id
                    : current.evaluations.find((e) => e.id === detail.id)?.device_id) ?? null,
                )
              : ""
          }
          onClose={() => setDetail(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visão por Cliente</h2>
        <p className="text-sm text-muted-foreground">
          Clientes agrupados por telefone — cada um pode ter várias propostas e cupons de aparelhos
          diferentes.
        </p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {filtered.length} cliente(s) encontrado(s)
        </p>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </Card>
        )}
        {filtered.map((g) => {
          const couponCount = g.evaluations.filter((e) => !!e.coupon_code).length;
          const openCount = g.leads.filter((l) => l.status === "in_progress").length;
          return (
            <div key={g.phoneKey} className="relative group">
              <button
                type="button"
                onClick={() => setSelected(g.phoneKey)}
                className="w-full text-left"
              >
                <Card className="p-4 hover:border-primary/40 hover:shadow-sm transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.name || "Cliente sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {g.phone} {g.email ? `· ${g.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="gap-1">
                        <Ticket className="h-3 w-3" /> {couponCount}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" /> {openCount}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const first = g.name?.split(" ")[0] ?? "";
                        openWhatsapp(
                          g.phone,
                          `Olá${first ? `, ${first}` : ""}! Tudo bem? Sou da Pollicell.`,
                        );
                      }}
                      className="text-success hover:text-success hover:bg-success/10"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        <Link to="/admin/clientes" className="hover:underline">
          Ver lista plana de propostas →
        </Link>
      </div>
    </div>
  );
};

export default AdminCustomerView;
