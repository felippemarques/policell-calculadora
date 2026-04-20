import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, ShoppingCart, Clock, MessageCircle, RotateCcw, AlertTriangle, Banknote, Sparkles, Gift } from "lucide-react";
import { toast } from "sonner";
import { useFlowSettings } from "@/hooks/use-flow-settings";
import type { SanityResult } from "@/lib/trade-in-sanity";
import type { FlowType } from "./StepChooseFlow";

interface Props {
  result: { finalValue: number; couponCode: string | null } | null;
  onReset: () => void;
  sanity?: SanityResult;
  flowType?: FlowType | null;
  customerName?: string;
  deviceLabel?: string;
}

/**
 * Normalize a stored phone/whatsapp setting into a usable wa.me URL.
 */
function buildWhatsAppUrl(raw: string | undefined, message: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      url.searchParams.set("text", message);
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function StepResult({ result, onReset, sanity, flowType, customerName, deviceLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const { data: flowSettings } = useFlowSettings();

  const inconsistent = (sanity && !sanity.ok) || !result;

  const { data: settingsRaw } = useQuery({
    queryKey: ["lp-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lp_settings").select("key,value");
      if (error) throw error;
      return data;
    },
  });

  const settings: Record<string, string> = {};
  settingsRaw?.forEach((s: any) => {
    settings[s.key] = s.value;
  });

  const bonusPercent = Number(settings["business_upgrade_bonus_percent"] ?? "0") || 0;
  const isSale = flowType === "sale";
  const showBonus = !inconsistent && !isSale && bonusPercent > 0 && !!result;

  const [bonusVisible, setBonusVisible] = useState(false);
  useEffect(() => {
    if (!showBonus) return;
    const t = setTimeout(() => setBonusVisible(true), 450);
    return () => clearTimeout(t);
  }, [showBonus]);

  const copyToClipboard = async () => {
    if (!result?.couponCode) return;
    await navigator.clipboard.writeText(result.couponCode);
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const storeUrl = settings["coupon_store_url"] || "https://pollicell.com.br";

  const handleSpecialist = () => {
    if (!result) return;
    const couponPart = result.couponCode ? ` Meu cupom: ${result.couponCode}.` : "";
    const message = `Olá! Acabei de fazer minha avaliação e gostaria de falar com um especialista.${couponPart} Valor estimado: R$ ${result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`;
    const url = buildWhatsAppUrl(settings.whatsapp || settings.phone, message);
    if (!url) {
      toast.error("Canal de atendimento ainda não foi configurado.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSaleWhatsApp = () => {
    if (!result) return;
    const wa = flowSettings?.sale.whatsapp || settings.whatsapp || settings.phone;
    const namePart = customerName ? `${customerName}, ` : "";
    const devicePart = deviceLabel ? ` (${deviceLabel})` : "";
    const message = `Olá! Sou ${namePart}quero VENDER meu aparelho${devicePart}. Valor proposto pela calculadora: R$ ${result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Como prosseguimos?`;
    const url = buildWhatsAppUrl(wa, message);
    if (!url) {
      toast.error("WhatsApp do fluxo de venda ainda não foi configurado pelo administrador.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── Inconsistency screen ──
  if (inconsistent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/15 mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Detectamos uma mudança na sua seleção
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {sanity?.reason ??
                  "Por favor, reinicie a avaliação para garantir o preço correto."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar Avaliação
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mx-auto">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isSale
                ? "Valor proposto em dinheiro pelo seu aparelho:"
                : "Valor estimado em crédito para troca:"}
            </p>
            <p className="text-4xl font-bold text-foreground mt-1">
              R$ {result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {isSale ? (
            <div className="bg-card rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground">
                Para concluir a venda, fale agora com nossa equipe pelo WhatsApp.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-4 border">
              <p className="text-xs text-muted-foreground mb-1">Seu cupom de desconto:</p>
              {result.couponCode ? (
                <div className="flex items-center justify-center gap-2">
                  <code className="text-lg font-mono font-bold text-primary tracking-wider">
                    {result.couponCode}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-1">
                  Seu cupom está sendo processado. Em breve você receberá o código.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isSale ? (
          <>
            <Button className="w-full" onClick={handleSaleWhatsApp}>
              <Banknote className="mr-2 h-4 w-4" /> Receber em dinheiro — Falar no WhatsApp
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSpecialist}>
              <MessageCircle className="mr-2 h-4 w-4" /> Falar com Especialista
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full"
              onClick={() => {
                copyToClipboard();
                window.open(storeUrl, "_blank");
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Comprar Agora com o cupom
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast.success("Solicitação enviada! Entraremos em contato em breve.");
              }}
            >
              <Clock className="mr-2 h-4 w-4" /> Aguardar Contato
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSpecialist}>
              <MessageCircle className="mr-2 h-4 w-4" /> Falar com Especialista
            </Button>
          </>
        )}
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="mr-2 h-3 w-3" /> Nova avaliação
        </Button>
      </div>
    </div>
  );
}
