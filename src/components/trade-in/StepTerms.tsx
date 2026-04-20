import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, ShieldCheck } from "lucide-react";

const DEFAULT_TERMS = `Ao prosseguir, você declara que:

1. As informações fornecidas (incluindo IMEI e estado do aparelho) são verdadeiras.
2. O valor estimado pela calculadora é uma proposta inicial e está sujeito a inspeção física do aparelho.
3. Autoriza o tratamento dos seus dados pessoais (nome, e-mail, telefone, IMEI) para fins de avaliação, contato comercial e cumprimento de obrigações legais, conforme a LGPD (Lei nº 13.709/2018).
4. O cupom gerado tem validade conforme as regras da loja e está vinculado a este IMEI.

Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato conosco.`;

interface Props {
  isSubmitting: boolean;
  onBack: () => void;
  onAccept: () => void | Promise<void>;
  flowLabel: string;
}

export function StepTerms({ isSubmitting, onBack, onAccept, flowLabel }: Props) {
  const [accepted, setAccepted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["lp_settings", "terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", ["terms_title", "terms_text", "terms_version", "terms_policy_url"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => (map[r.key] = r.value));
      return map;
    },
  });

  const title = settings?.terms_title?.trim() || "Termos e Política de Privacidade";
  const text = settings?.terms_text?.trim() || DEFAULT_TERMS;
  const policyUrl = settings?.terms_policy_url?.trim() || "";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Leia e aceite para finalizar sua proposta de {flowLabel.toLowerCase()}.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Leia com atenção
          </span>
        </div>
        <ScrollArea className="h-64 px-4 py-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{text}</p>
          {policyUrl && (
            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-primary underline underline-offset-2"
            >
              Ver política completa
            </a>
          )}
        </ScrollArea>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors">
        <Checkbox
          checked={accepted}
          onCheckedChange={(c) => setAccepted(c === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground leading-relaxed">
          <strong>Li e aceito</strong> os termos acima e autorizo o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="sm:w-auto w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          type="button"
          disabled={!accepted || isSubmitting}
          onClick={() => onAccept()}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando proposta...
            </>
          ) : (
            "Aceitar e gerar proposta"
          )}
        </Button>
      </div>
    </div>
  );
}
