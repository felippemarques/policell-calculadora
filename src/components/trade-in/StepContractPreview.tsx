import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, ShieldCheck, Download } from "lucide-react";
import { renderContractText, generateContractPdf, type ContractData } from "@/lib/contract";

const DEFAULT_TEMPLATE = `CONTRATO DE INTENÇÃO DE TROCA / VENDA DE APARELHO USADO

Entre as partes:
- LOJA: {{store_name}}
- CLIENTE: {{customer_name}} — Email: {{customer_email}} — Telefone: {{customer_phone}}
- ENDEREÇO DO CLIENTE: {{customer_address}}

Aparelho ofertado pelo CLIENTE:
- Modelo: {{device_label}}
- IMEI: {{imei}}

Proposta:
- Valor base: R$ {{base_price}}
- Deduções aplicadas: R$ {{deductions}}
- Bônus de upgrade (apenas troca): {{bonus_percent}}%
- VALOR FINAL DA PROPOSTA: R$ {{final_value}}
- Modalidade: {{flow_label}}

O CLIENTE declara que as informações fornecidas são verdadeiras. O valor é uma proposta inicial e está sujeito a inspeção física do aparelho.

Aceite registrado eletronicamente em {{accepted_at}}.`;

interface Props {
  data: ContractData;
  isSubmitting: boolean;
  onBack: () => void;
  onAccept: () => void | Promise<void>;
}

export function StepContractPreview({ data, isSubmitting, onBack, onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["lp_settings", "contract"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", ["business_contract_template", "business_store_name"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (rows ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
  });

  const template =
    settings?.business_contract_template?.trim() || DEFAULT_TEMPLATE;
  const storeName = settings?.business_store_name?.trim() || data.storeName;

  const renderedText = useMemo(
    () => renderContractText(template, { ...data, storeName }),
    [template, data, storeName],
  );

  const handleDownload = () => {
    generateContractPdf(renderedText, "contrato-pollicell.pdf");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Revise e aceite o contrato
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Esse documento resume sua proposta. Você pode baixar uma cópia em PDF antes de
          aceitar.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contrato gerado
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar PDF
          </Button>
        </div>
        <ScrollArea className="h-72 px-4 py-3">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
            {renderedText}
          </pre>
        </ScrollArea>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors">
        <Checkbox
          checked={accepted}
          onCheckedChange={(c) => setAccepted(c === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-foreground leading-relaxed">
          <strong>Li, entendi e aceito</strong> os termos do contrato acima. Confirmo que as
          informações são verdadeiras e autorizo a Pollicell a prosseguir com a proposta.
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
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button
          type="button"
          disabled={!accepted || isSubmitting}
          onClick={() => onAccept()}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando proposta...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" /> Aceitar contrato e gerar cupom
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
