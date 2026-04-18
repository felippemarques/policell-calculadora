import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Copy, Ban, Loader2, Check } from "lucide-react";

interface Evaluation {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  final_value: number;
  coupon_code: string | null;
  coupon_id: string | null;
  status: string;
  devices: { name: string } | null;
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  completed: { label: "Concluída", variant: "default" },
  revoked: { label: "Revogada", variant: "destructive" },
  coupon_error: { label: "Erro no cupom", variant: "outline" },
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

async function fetchRevokeUrl(): Promise<{ url: string; auth: string } | null> {
  const { data, error } = await supabase
    .from("lp_settings")
    .select("key,value")
    .in("key", ["coupon_n8n_revoke_url", "coupon_n8n_auth"]);
  if (error || !data) return null;
  const map: Record<string, string> = {};
  data.forEach((row: any) => { map[row.key] = row.value; });
  const url = map["coupon_n8n_revoke_url"];
  if (!url) return null;
  return { url, auth: map["coupon_n8n_auth"] ?? "" };
}

async function callN8nRevoke(couponId: string): Promise<void> {
  const config = await fetchRevokeUrl();
  if (!config) throw new Error("URL de revogação não configurada.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.auth) headers["Authorization"] = config.auth;

  const res = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ coupon_id: couponId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`n8n retornou erro ${res.status}: ${text}`);
  }
}

const AdminEvaluations = () => {
  const qc = useQueryClient();
  const [revokeTarget, setRevokeTarget] = useState<Evaluation | null>(null);

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["admin-evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, created_at, customer_name, customer_email, final_value, coupon_code, coupon_id, status, devices(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Evaluation[];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (ev: Evaluation) => {
      // 1. Chamar n8n para revogar na loja virtual
      if (ev.coupon_id) {
        await callN8nRevoke(ev.coupon_id);
      }

      // 2. Após sucesso do n8n, limpar cupom na tabela
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
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao revogar cupom.");
    },
  });

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
                    const st = statusLabel[ev.status] ?? { label: ev.status, variant: "outline" as const };
                    const canRevoke = ev.status !== "revoked" && ev.coupon_code;
                    return (
                      <tr key={ev.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{ev.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{ev.customer_email}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {ev.devices?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {ev.final_value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
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
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                          {new Date(ev.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
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
