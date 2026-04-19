import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, FileText, Percent, Eye } from "lucide-react";

const BUSINESS_KEYS = [
  "business_contract_terms",
  "business_upgrade_bonus_percent",
  "business_show_realtime_deductions",
] as const;

type BusinessKey = (typeof BUSINESS_KEYS)[number];
type FormState = Record<BusinessKey, string>;

const DEFAULTS: FormState = {
  business_contract_terms: "",
  business_upgrade_bonus_percent: "0",
  business_show_realtime_deductions: "true",
};

async function upsertSettings(entries: { key: string; value: string }[]) {
  for (const entry of entries) {
    const { error } = await supabase
      .from("lp_settings")
      .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
    if (error) throw error;
  }
}

const AdminBusinessSettings = () => {
  const qc = useQueryClient();

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ["business-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", BUSINESS_KEYS as unknown as string[]);
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  const [form, setForm] = useState<FormState>(DEFAULTS);

  useEffect(() => {
    if (!rawSettings) return;
    const merged: FormState = { ...DEFAULTS };
    rawSettings.forEach((row) => {
      if ((BUSINESS_KEYS as readonly string[]).includes(row.key)) {
        (merged as any)[row.key] = row.value;
      }
    });
    setForm(merged);
  }, [rawSettings]);

  const mutation = useMutation({
    mutationFn: async () => {
      const bonus = Number(form.business_upgrade_bonus_percent);
      if (Number.isNaN(bonus) || bonus < 0 || bonus > 100) {
        throw new Error("Bônus de upgrade deve estar entre 0 e 100.");
      }
      const entries = BUSINESS_KEYS.map((k) => ({ key: k, value: form[k] }));
      await upsertSettings(entries);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-settings"] });
      toast.success("Configurações de negócio salvas.");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar."),
  });

  const set = (key: BusinessKey, value: string) =>
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
        <h2 className="text-2xl font-bold text-foreground">Configurações de Negócio</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros gerais que controlam contrato, bônus de upgrade e transparência da calculadora.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Contrato de Compra e Venda</CardTitle>
          </div>
          <CardDescription>
            Texto exibido para o cliente no momento do aceite. Suporta texto longo (Markdown simples).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="contract">Termos de Aceite</Label>
          <Textarea
            id="contract"
            value={form.business_contract_terms}
            onChange={(e) => set("business_contract_terms", e.target.value)}
            rows={12}
            className="mt-2 font-mono text-sm"
            placeholder={"Ex: Pelo presente contrato, o vendedor declara..."}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {form.business_contract_terms.length.toLocaleString("pt-BR")} caracteres
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Bônus em caso de Troca / Upgrade</CardTitle>
          </div>
          <CardDescription>
            Percentual extra somado ao valor da avaliação quando o cliente opta por trocar por um novo aparelho
            ao invés de receber o valor em dinheiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="bonus">% de Bônus</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="bonus"
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={form.business_upgrade_bonus_percent}
              onChange={(e) => set("business_upgrade_bonus_percent", e.target.value)}
              className="max-w-[140px]"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Transparência na Calculadora</CardTitle>
          </div>
          <CardDescription>
            Quando ativo, o cliente vê em tempo real cada dedução aplicada (defeitos, condição) durante a
            avaliação. Desativado, ele só vê o valor final.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-sm font-medium">Exibir deduções em tempo real</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {form.business_show_realtime_deductions === "true"
                  ? "Ativado — cliente vê cada dedução ao escolher uma opção."
                  : "Desativado — apenas o valor final aparece no resultado."}
              </p>
            </div>
            <Switch
              checked={form.business_show_realtime_deductions === "true"}
              onCheckedChange={(checked) =>
                set("business_show_realtime_deductions", checked ? "true" : "false")
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-background/80 backdrop-blur-sm py-3 -mx-6 px-6 border-t">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
};

export default AdminBusinessSettings;
