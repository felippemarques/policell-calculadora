import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Copy, Ban, Loader2, Check, RefreshCw, CheckCircle2, Clock, XCircle,
  AlertTriangle, Search, Archive, ArchiveRestore,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Evaluation {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  imei: string | null;
  archived_at: string | null;
  final_value: number;
  coupon_code: string | null;
  coupon_id: string | null;
  status: string;
  devices: { brand: string; model: string; storage: string } | null;
}

const STATUS_META: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200",
  },
  completed: {
    label: "Criado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  },
  revoked: {
    label: "Revogado",
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200",
  },
  coupon_error: {
    label: "Não criado",
    icon: XCircle,
    className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copiar cupom"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

async function fetchCouponSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("lp_settings")
    .select("key,value")
    .like("key", "coupon_%");
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((row: any) => { map[row.key] = row.value; });
  return map;
}

async function fetchRevokeConfig(): Promise<{ url: string; auth: string; store_url: string; store_id: string } | null> {
  const { data, error } = await supabase
    .from("lp_settings")
    .select("key,value")
    .in("key", ["coupon_n8n_revoke_url", "coupon_n8n_auth", "coupon_store_url", "coupon_store_id"]);
  if (error || !data) return null;
  const map: Record<string, string> = {};
  data.forEach((row: any) => { map[row.key] = row.value; });
  const url = map["coupon_n8n_revoke_url"];
  if (!url) return null;
  return {
    url,
    auth: map["coupon_n8n_auth"] ?? "",
    store_url: map["coupon_store_url"] ?? "",
    store_id: map["coupon_store_id"] ?? "",
  };
}

async function callN8nRevoke(couponId: string): Promise<void> {
  const config = await fetchRevokeConfig();
  if (!config) throw new Error("URL de revogação não configurada.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.auth) headers["Authorization"] = config.auth;

  const res = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      coupon_id: couponId,
      store_url: config.store_url,
      store_id: config.store_id,
    }),
  });

  const json = await res.json().catch(() => null);
  const success = json?.message === "Deleted" && json?.code === 200;
  if (!success) {
    const detail = json?.message ?? res.statusText;
    throw new Error(`Revogação não confirmada pela loja: ${detail}`);
  }
}

interface N8nCouponResult { coupon_code: string; coupon_id: string; }

async function callN8nCreate(ev: Evaluation, settings: Record<string, string>): Promise<N8nCouponResult | null> {
  const n8nUrl = settings["coupon_n8n_url"];
  if (!n8nUrl) return null;

  const payload = {
    evaluation_id: ev.id,
    customer_name: ev.customer_name,
    customer_email: ev.customer_email,
    customer_phone: ev.customer_phone,
    description: settings["coupon_description"] ?? "",
    type: settings["coupon_type"] ?? "real",
    value: ev.final_value,
    starts_at: Number(settings["coupon_starts_at_days"] ?? "0"),
    ends_at: Number(settings["coupon_ends_at"] ?? "0"),
    value_start: settings["coupon_value_start"] ? Number(settings["coupon_value_start"]) : null,
    value_end: settings["coupon_value_end"] ? Number(settings["coupon_value_end"]) : null,
    usage_sum_limit: settings["coupon_usage_sum_limit"] ? Number(settings["coupon_usage_sum_limit"]) : null,
    usage_counter_limit: Number(settings["coupon_usage_counter_limit"] ?? "1"),
    usage_counter_limit_customer: Number(settings["coupon_usage_counter_limit_customer"] ?? "1"),
    cumulative_discount: settings["coupon_cumulative_discount"] === "1",
    store_url: settings["coupon_store_url"] ?? "",
    store_id: settings["coupon_store_id"] ?? "",
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = settings["coupon_n8n_auth"];
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(n8nUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) return null;
    const json = await res.json();
    const coupon_code: string | null = json?.coupon_code ?? json?.code ?? (typeof json === "string" ? json : null);
    const coupon_id: string | null = json?.coupon_id ?? json?.id ?? null;
    if (!coupon_code || !coupon_id) return null;
    return { coupon_code, coupon_id };
  } catch {
    return null;
  }
}

const AdminEvaluations = () => {
  const qc = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<Evaluation | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<"active" | "archived" | "all">("active");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["admin-evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, created_at, customer_name, customer_email, customer_phone, imei, archived_at, final_value, coupon_code, coupon_id, status, devices(brand, model, storage)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Evaluation[];
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await (supabase.rpc as any)("archive_evaluation", {
        _evaluation_id: id,
        _archive: archive,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-evaluations"] });
      toast.success(vars.archive ? "Avaliação arquivada." : "Avaliação restaurada.");
    },
    onError: (e: any) => toast.error(`Falha ao arquivar: ${e.message}`),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return evaluations.filter((ev) => {
      if (archivedFilter === "active" && ev.archived_at) return false;
      if (archivedFilter === "archived" && !ev.archived_at) return false;
      if (term) {
        const hay = `${ev.customer_name} ${ev.customer_email} ${ev.customer_phone} ${ev.imei ?? ""} ${ev.coupon_code ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [evaluations, search, archivedFilter]);

  const revokeMutation = useMutation({
    mutationFn: async (ev: Evaluation) => {
      if (ev.coupon_id) await callN8nRevoke(ev.coupon_id);
      const { error } = await supabase
        .from("evaluations")
        .update({ status: "revoked", coupon_code: null, coupon_id: null })
        .eq("id", ev.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-evaluations"] });
      toast.success("Cupom revogado com sucesso.");
      setRevokeTarget(null);
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao revogar cupom."),
  });

  const handleRetry = async (ev: Evaluation) => {
    setRetryingId(ev.id);
    try {
      const settings = await fetchCouponSettings();
      const result = await callN8nCreate(ev, settings);

      if (!result) {
        await supabase
          .from("evaluations")
          .update({ status: "coupon_error" })
          .eq("id", ev.id);
        toast.error("n8n não retornou o cupom. Status atualizado para erro.");
      } else {
        await supabase
          .from("evaluations")
          .update({ coupon_code: result.coupon_code, coupon_id: result.coupon_id, status: "completed" })
          .eq("id", ev.id);
        toast.success("Cupom gerado com sucesso!");
      }
      qc.invalidateQueries({ queryKey: ["admin-evaluations"] });
    } catch {
      toast.error("Erro ao tentar gerar o cupom novamente.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Avaliações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de avaliações e cupons gerados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas as avaliações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma avaliação registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Aparelho</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cupom</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((ev) => {
                    const st = STATUS_META[ev.status] ?? { label: ev.status, icon: Clock, className: "bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200" };
                    const StatusIcon = st.icon;
                    const canRevoke = ev.status !== "revoked" && ev.coupon_code;
                    const canRetry = ev.status === "pending" || ev.status === "coupon_error";
                    const isRetrying = retryingId === ev.id;
                    return (
                      <tr key={ev.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{ev.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{ev.customer_email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {ev.devices ? `${ev.devices.brand} ${ev.devices.model} ${ev.devices.storage}` : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {ev.final_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="px-4 py-3">
                          {ev.coupon_code ? (
                            <span className="inline-flex items-center font-mono text-xs bg-muted px-2 py-0.5 rounded">
                              {ev.coupon_code}
                              <CopyButton text={ev.coupon_code} />
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("gap-1 font-normal", st.className)}>
                            <StatusIcon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                          {new Date(ev.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {canRetry && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleRetry(ev)}
                                disabled={isRetrying}
                              >
                                {isRetrying
                                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                                Tentar novamente
                              </Button>
                            )}
                            {canRevoke && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setRevokeTarget(ev)}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Revogar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o cupom{" "}
              <strong className="font-mono">{revokeTarget?.coupon_code}</strong> de{" "}
              <strong>{revokeTarget?.customer_name}</strong>? O sistema irá notificar a loja virtual via n8n e o cupom será invalidado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget)}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEvaluations;
