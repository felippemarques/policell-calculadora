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
import { Save, Loader2, FileText, Percent, Eye, ArrowRightLeft, Banknote, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FLOW_SETTINGS_KEY } from "@/hooks/use-flow-settings";

const BUSINESS_KEYS = [
  "business_contract_terms", // legado — mantido para compat, não editado mais
  "business_contract_terms_trade",
  "business_contract_terms_sale",
  "business_upgrade_bonus_percent",
  "business_show_realtime_deductions",
  "business_show_reject_label",
  "business_show_no_deduction_label",
  // Flow choice screen settings
  "flow_trade_enabled",
  "flow_trade_title",
  "flow_trade_description",
  "flow_trade_cta_text",
  "flow_sale_enabled",
  "flow_sale_title",
  "flow_sale_description",
  "flow_sale_cta_text",
  "flow_sale_whatsapp",
  // LGPD / Termos de aceite
  "terms_title",
  "terms_text",
  "terms_version",
  "terms_policy_url",
] as const;

type BusinessKey = (typeof BUSINESS_KEYS)[number];
type FormState = Record<BusinessKey, string>;

const DEFAULT_TERMS_TEXT = `Ao prosseguir, você declara que:

1. As informações fornecidas (incluindo IMEI e estado do aparelho) são verdadeiras.
2. O valor estimado pela calculadora é uma proposta inicial e está sujeito a inspeção física do aparelho.
3. Autoriza o tratamento dos seus dados pessoais (nome, e-mail, telefone, IMEI) para fins de avaliação, contato comercial e cumprimento de obrigações legais, conforme a LGPD (Lei nº 13.709/2018).
4. O cupom gerado tem validade conforme as regras da loja e está vinculado a este IMEI.

Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato conosco.`;

const DEFAULTS: FormState = {
  business_contract_terms: "",
  business_contract_terms_trade: "",
  business_contract_terms_sale: "",
  business_upgrade_bonus_percent: "0",
  business_show_realtime_deductions: "true",
  business_show_reject_label: "true",
  business_show_no_deduction_label: "true",
  flow_trade_enabled: "true",
  flow_trade_title: "Trocar por outro aparelho",
  flow_trade_description:
    "Use o valor do seu aparelho como crédito para comprar um novo na nossa loja.",
  flow_trade_cta_text: "Quero trocar",
  flow_sale_enabled: "true",
  flow_sale_title: "Vender por dinheiro",
  flow_sale_description:
    "Receba o valor do seu aparelho em dinheiro via PIX ou transferência.",
  flow_sale_cta_text: "Quero vender",
  flow_sale_whatsapp: "",
  terms_title: "Termos e Política de Privacidade",
  terms_text: DEFAULT_TERMS_TEXT,
  terms_version: "v1",
  terms_policy_url: "",
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
      qc.invalidateQueries({ queryKey: FLOW_SETTINGS_KEY });
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
          Parâmetros gerais que controlam contrato, bônus de upgrade, fluxos e transparência da calculadora.
        </p>
      </div>

      {/* ── Fluxos da Calculadora ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Fluxos da Calculadora</CardTitle>
          </div>
          <CardDescription>
            Escolha quais opções o cliente vê no início da avaliação. Se apenas um fluxo estiver ativo,
            a tela de escolha é pulada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade flow */}
          <div className="rounded-lg border p-4 space-y-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" /> Fluxo: Trocar por outro aparelho
              </Label>
              <Switch
                checked={form.flow_trade_enabled === "true"}
                onCheckedChange={(c) => set("flow_trade_enabled", c ? "true" : "false")}
              />
            </div>
            {form.flow_trade_enabled === "true" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={form.flow_trade_title}
                    onChange={(e) => set("flow_trade_title", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição curta</Label>
                  <Textarea
                    value={form.flow_trade_description}
                    onChange={(e) => set("flow_trade_description", e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Texto do botão (CTA)</Label>
                  <Input
                    value={form.flow_trade_cta_text}
                    onChange={(e) => set("flow_trade_cta_text", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sale flow */}
          <div className="rounded-lg border p-4 space-y-3 bg-accent/10">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Banknote className="h-4 w-4 text-accent-foreground" /> Fluxo: Vender por dinheiro
              </Label>
              <Switch
                checked={form.flow_sale_enabled === "true"}
                onCheckedChange={(c) => set("flow_sale_enabled", c ? "true" : "false")}
              />
            </div>
            {form.flow_sale_enabled === "true" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={form.flow_sale_title}
                    onChange={(e) => set("flow_sale_title", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descrição curta</Label>
                  <Textarea
                    value={form.flow_sale_description}
                    onChange={(e) => set("flow_sale_description", e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Texto do botão (CTA)</Label>
                  <Input
                    value={form.flow_sale_cta_text}
                    onChange={(e) => set("flow_sale_cta_text", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp para venda</Label>
                  <Input
                    value={form.flow_sale_whatsapp}
                    onChange={(e) => set("flow_sale_whatsapp", e.target.value)}
                    placeholder="Ex.: 11999999999 ou https://wa.me/55..."
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Pode ser apenas o número (com DDD) ou um link wa.me completo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Termos de Aceite (LGPD) na calculadora ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Termos de Aceite (LGPD)</CardTitle>
          </div>
          <CardDescription>
            Texto exibido na calculadora entre a confirmação do IMEI e a geração do cupom. O aceite e a versão são salvos no lead com data/hora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="terms_title">Título da tela</Label>
            <Input
              id="terms_title"
              value={form.terms_title}
              onChange={(e) => set("terms_title", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="terms_text">Texto dos termos</Label>
            <Textarea
              id="terms_text"
              value={form.terms_text}
              onChange={(e) => set("terms_text", e.target.value)}
              rows={10}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.terms_text.length.toLocaleString("pt-BR")} caracteres. Suporta quebras de linha.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="terms_version">Versão</Label>
              <Input
                id="terms_version"
                value={form.terms_version}
                onChange={(e) => set("terms_version", e.target.value)}
                placeholder="v1"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Atualize sempre que mudar o texto, para auditoria.
              </p>
            </div>
            <div>
              <Label htmlFor="terms_policy_url">Link da política completa (opcional)</Label>
              <Input
                id="terms_policy_url"
                value={form.terms_policy_url}
                onChange={(e) => set("terms_policy_url", e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Contratos de Aceite</CardTitle>
          </div>
          <CardDescription>
            Dois textos independentes — um para o fluxo de <strong>Troca/Upgrade</strong> e outro para
            <strong> Venda em dinheiro</strong>. O sistema escolhe automaticamente qual exibir conforme
            a opção do cliente. Suporta texto longo e tokens dinâmicos como{" "}
            <code className="text-[11px]">{"{{customer_name}}"}</code>,{" "}
            <code className="text-[11px]">{"{{device_label}}"}</code>,{" "}
            <code className="text-[11px]">{"{{imei}}"}</code>,{" "}
            <code className="text-[11px]">{"{{final_value}}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trade" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trade" className="gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Troca / Upgrade
              </TabsTrigger>
              <TabsTrigger value="sale" className="gap-2">
                <Banknote className="h-3.5 w-3.5" /> Venda em dinheiro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trade" className="mt-4 space-y-2">
              <Label htmlFor="contract_trade">Contrato exibido no fluxo de TROCA</Label>
              <Textarea
                id="contract_trade"
                value={form.business_contract_terms_trade}
                onChange={(e) => set("business_contract_terms_trade", e.target.value)}
                rows={14}
                className="mt-2 font-mono text-sm"
                placeholder={"Ex: INSTRUMENTO PARTICULAR DE PROPOSTA DE TROCA DE APARELHO USADO..."}
              />
              <p className="text-xs text-muted-foreground">
                {form.business_contract_terms_trade.length.toLocaleString("pt-BR")} caracteres
              </p>
            </TabsContent>

            <TabsContent value="sale" className="mt-4 space-y-2">
              <Label htmlFor="contract_sale">Contrato exibido no fluxo de VENDA</Label>
              <Textarea
                id="contract_sale"
                value={form.business_contract_terms_sale}
                onChange={(e) => set("business_contract_terms_sale", e.target.value)}
                rows={14}
                className="mt-2 font-mono text-sm"
                placeholder={"Ex: INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE APARELHO USADO..."}
              />
              <p className="text-xs text-muted-foreground">
                {form.business_contract_terms_sale.length.toLocaleString("pt-BR")} caracteres
              </p>
            </TabsContent>
          </Tabs>
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
