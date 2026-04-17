import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, ShoppingCart, Clock, MessageCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SanityResult } from "@/lib/trade-in-sanity";

interface Props {
  result: { finalValue: number; couponCode: string } | null;
  onReset: () => void;
  sanity?: SanityResult;
}

/**
 * Normalize a stored phone/whatsapp setting into a usable wa.me URL.
 * Accepts: full https://wa.me/... links, https://api.whatsapp.com/... links,
 * or a raw number (with or without country code, with mask).
 */
function buildWhatsAppUrl(raw: string | undefined, message: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Already a link → just append/replace text param
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      url.searchParams.set("text", message);
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  // Raw number → strip non-digits, default BR country code if missing
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function StepResult({ result, onReset, sanity }: Props) {
  const [copied, setCopied] = useState(false);

  // Sanity guard: if anything is inconsistent (or there's no saved result), show the
  // inconsistency banner and force the user to restart instead of trusting stale numbers.
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

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.couponCode);
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const storeUrl = "https://pollicell.com.br"; // TODO: configurar

  const handleSpecialist = () => {
    if (!result) return;
    const message = `Olá! Acabei de fazer minha avaliação e gostaria de falar com um especialista. Meu cupom: ${result.couponCode} (valor estimado: R$ ${result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`;
    const url = buildWhatsAppUrl(settings.whatsapp || settings.phone, message);
    if (!url) {
      toast.error("Canal de atendimento ainda não foi configurado.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── Inconsistency screen: blocks the result UI and forces a fresh start ──
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
            <p className="text-sm text-muted-foreground">Valor estimado do seu aparelho:</p>
            <p className="text-4xl font-bold text-foreground mt-1">
              R$ {result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border">
            <p className="text-xs text-muted-foreground mb-1">Seu cupom de desconto:</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono font-bold text-primary tracking-wider">
                {result.couponCode}
              </code>
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={() => {
            copyToClipboard();
            window.open(storeUrl, "_blank");
          }}
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> Comprar Agora
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // TODO: webhook N8N
            toast.success("Solicitação enviada! Entraremos em contato em breve.");
          }}
        >
          <Clock className="mr-2 h-4 w-4" /> Aguardar Contato
        </Button>
        <Button variant="outline" className="w-full" onClick={handleSpecialist}>
          <MessageCircle className="mr-2 h-4 w-4" /> Falar com Especialista
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="mr-2 h-3 w-3" /> Nova avaliação
        </Button>
      </div>
    </div>
  );
}
