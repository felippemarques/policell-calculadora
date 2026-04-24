import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

const COUPON_KEYS = [
  "coupon_description",
  "coupon_starts_at_days",
  "coupon_ends_at",
  "coupon_type",
  "coupon_value_start",
  "coupon_value_end",
  "coupon_usage_sum_limit",
  "coupon_usage_counter_limit",
  "coupon_usage_counter_limit_customer",
  "coupon_cumulative_discount",
  "coupon_store_url",
  "coupon_store_id",
  "coupon_n8n_url",
  "coupon_n8n_auth",
  "coupon_n8n_revoke_url",
] as const;

type CouponKey = (typeof COUPON_KEYS)[number];

type FormState = Record<CouponKey, string>;

const DEFAULTS: FormState = {
  coupon_description: "",
  coupon_starts_at_days: "0",
  coupon_ends_at: "0",
  coupon_type: "real",
  coupon_value_start: "",
  coupon_value_end: "",
  coupon_usage_sum_limit: "",
  coupon_usage_counter_limit: "1",
  coupon_usage_counter_limit_customer: "1",
  coupon_cumulative_discount: "0",
  coupon_store_url: "",
  coupon_store_id: "",
  coupon_n8n_url: "",
  coupon_n8n_auth: "",
  coupon_n8n_revoke_url: "",
};

async function upsertSettings(entries: { key: string; value: string }[]) {
  for (const entry of entries) {
    const { error } = await supabase
      .from("lp_settings")
      .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
    if (error) throw error;
  }
}

const AdminCouponSettings = () => {
  const qc = useQueryClient();

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ["coupon-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .like("key", "coupon_%");
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  const [form, setForm] = useState<FormState>(DEFAULTS);

  useEffect(() => {
    if (!rawSettings) return;
    const merged: FormState = { ...DEFAULTS };
    rawSettings.forEach((row) => {
      if (row.key in merged) (merged as any)[row.key] = row.value;
    });
    setForm(merged);
  }, [rawSettings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const entries = COUPON_KEYS.map((k) => ({ key: k, value: form[k] }));
      await upsertSettings(entries);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupon-settings"] });
      toast.success("Configurações salvas com sucesso.");
    },
    onError: () => toast.error("Erro ao salvar configurações."),
  });

  const set = (key: CouponKey, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações de Cupom</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina o comportamento dos cupons gerados ao final de cada avaliação.
        </p>
      </div>

      {/* ── Cupom ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Cupom</CardTitle>
          <CardDescription>Parâmetros enviados para a loja virtual ao criar o cupom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Ex: Desconto trade-in — aparelho usado avaliado em loja"
              value={form.coupon_description}
              onChange={(e) => set("coupon_description", e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Visível para o cliente no checkout da loja virtual.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select
                value={form.coupon_type}
                onValueChange={(v) => set("coupon_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Reais (R$)</SelectItem>
                  <SelectItem value="percent">Porcentagem (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Início da validade */}
          <div className="space-y-2">
            <Label htmlFor="starts_at_days">Início da validade (dias)</Label>
            <Input
              id="starts_at_days"
              type="number"
              min={0}
              value={form.coupon_starts_at_days}
              onChange={(e) => set("coupon_starts_at_days", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <strong>0</strong> = inicia imediatamente; qualquer número = dias até o início da validade.
            </p>
          </div>

          {/* Expiração */}
          <div className="space-y-2">
            <Label htmlFor="ends_at">Validade do cupom (dias)</Label>
            <Input
              id="ends_at"
              type="number"
              min={0}
              value={form.coupon_ends_at}
              onChange={(e) => set("coupon_ends_at", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <strong>0</strong> = nunca expira; qualquer número = dias até a expiração.
            </p>
          </div>

          <Separator />

          {/* Faixa de produto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value_start">Valor mínimo do produto (R$)</Label>
              <Input
                id="value_start"
                type="number"
                min={0}
                placeholder="Sem mínimo"
                value={form.coupon_value_start}
                onChange={(e) => set("coupon_value_start", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value_end">Valor máximo do produto (R$)</Label>
              <Input
                id="value_end"
                type="number"
                min={0}
                placeholder="Sem limite"
                value={form.coupon_value_end}
                onChange={(e) => set("coupon_value_end", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Limites de uso */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage_counter_limit">Usos totais permitidos</Label>
              <Input
                id="usage_counter_limit"
                type="number"
                min={1}
                value={form.coupon_usage_counter_limit}
                onChange={(e) => set("coupon_usage_counter_limit", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Padrão 1 — uso pessoal único.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage_counter_limit_customer">Usos por cliente</Label>
              <Input
                id="usage_counter_limit_customer"
                type="number"
                min={1}
                value={form.coupon_usage_counter_limit_customer}
                onChange={(e) => set("coupon_usage_counter_limit_customer", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Padrão 1 — um uso por CPF/e-mail.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_sum_limit">Limite de valor acumulado (R$)</Label>
            <Input
              id="usage_sum_limit"
              type="number"
              min={0}
              placeholder="Sem limite"
              value={form.coupon_usage_sum_limit}
              onChange={(e) => set("coupon_usage_sum_limit", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Limite máximo em R$ que o cupom pode descontar no total (soma de todos os usos).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="cumulative"
              checked={form.coupon_cumulative_discount === "1"}
              onCheckedChange={(v) => set("coupon_cumulative_discount", v ? "1" : "0")}
            />
            <div>
              <Label htmlFor="cumulative">Desconto acumulativo</Label>
              <p className="text-xs text-muted-foreground">
                Permite acumular com outros cupons ou promoções da loja.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Integração ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Integração</CardTitle>
          <CardDescription>Configurações de conexão com a loja virtual e o fluxo n8n.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store_url">URL da loja (Tray)</Label>
              <Input
                id="store_url"
                type="url"
                placeholder="https://suaLoja.com.br"
                value={form.coupon_store_url}
                onChange={(e) => set("coupon_store_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store_id">ID da loja (Tray)</Label>
              <Input
                id="store_id"
                placeholder="123456"
                value={form.coupon_store_id}
                onChange={(e) => set("coupon_store_id", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="n8n_url">URL do endpoint n8n</Label>
            <Input
              id="n8n_url"
              type="url"
              placeholder="https://n8n.seudominio.com/webhook/..."
              value={form.coupon_n8n_url}
              onChange={(e) => set("coupon_n8n_url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receberá um POST com os dados do cupom ao final de cada avaliação aprovada.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="n8n_auth">Segredo de autenticação (n8n)</Label>
            <Input
              id="n8n_auth"
              type="password"
              placeholder="••••••••••••••••"
              value={form.coupon_n8n_auth}
              onChange={(e) => set("coupon_n8n_auth", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enviado no header <code className="font-mono text-xs">Authorization</code> de cada requisição para validar a origem.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="n8n_revoke_url">URL de revogação (n8n)</Label>
            <Input
              id="n8n_revoke_url"
              type="url"
              placeholder="https://n8n.seudominio.com/webhook/revoke/..."
              value={form.coupon_n8n_revoke_url}
              onChange={(e) => set("coupon_n8n_revoke_url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receberá um POST com <code className="font-mono text-xs">coupon_id</code>, <code className="font-mono text-xs">store_id</code> e <code className="font-mono text-xs">store_url</code> ao revogar um cupom pelo painel. O mesmo segredo de autenticação será enviado no header.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
};

export default AdminCouponSettings;
