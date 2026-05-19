import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useWm10Settings, type Wm10Settings } from "@/hooks/use-wm10-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, CheckCircle2, XCircle } from "lucide-react";

const schema = z.object({
  store_url: z.string().min(1, "URL da loja é obrigatória"),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos (só números)"),
  token: z.string().min(1, "Token é obrigatório"),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function Wm10SettingsCard() {
  const { settings, isLoading, save, isSaving } = useWm10Settings();
  const { toast } = useToast();
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: settings ?? { store_url: "", cnpj: "", token: "", enabled: false },
  });

  async function onSubmit(values: FormValues) {
    try {
      await save(values);
      toast({ title: "Configurações WM10 salvas." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
    }
  }

  async function handleTest() {
    setTestStatus("testing");
    setTestMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("wm10-proxy", {
        body: { action: "test" },
      });
      if (error || data?.error) {
        setTestStatus("error");
        setTestMessage(data?.error ?? error?.message ?? "Erro desconhecido");
      } else {
        setTestStatus("ok");
        setTestMessage("Conexão bem-sucedida!");
      }
    } catch (e: unknown) {
      setTestStatus("error");
      setTestMessage(e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" /> Configuração da API WM10
            </CardTitle>
            <CardDescription>
              Credenciais para conectar ao sistema ERP WM10.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="wm10-enabled" className="text-sm">Ativo</Label>
            <Switch
              id="wm10-enabled"
              checked={form.watch("enabled")}
              onCheckedChange={(v) => form.setValue("enabled", v)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="store_url">URL da Loja</Label>
              <Input
                id="store_url"
                placeholder="minha-loja"
                {...form.register("store_url")}
              />
              <p className="text-xs text-muted-foreground">
                Parte da URL: app.wm10.com.br/<strong>minha-loja</strong>/sistema/api
              </p>
              {form.formState.errors.store_url && (
                <p className="text-xs text-destructive">{form.formState.errors.store_url.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ (só números)</Label>
              <Input
                id="cnpj"
                placeholder="12345678000199"
                maxLength={14}
                {...form.register("cnpj")}
              />
              {form.formState.errors.cnpj && (
                <p className="text-xs text-destructive">{form.formState.errors.cnpj.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="Token gerado pelo WM10"
                {...form.register("token")}
              />
              {form.formState.errors.token && (
                <p className="text-xs text-destructive">{form.formState.errors.token.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={testStatus === "testing"}>
              {testStatus === "testing" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Testar Conexão
            </Button>
            {testStatus === "ok" && (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {testMessage}
              </Badge>
            )}
            {testStatus === "error" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> {testMessage}
              </Badge>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
