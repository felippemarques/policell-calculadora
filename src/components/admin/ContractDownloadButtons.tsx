import { useState } from "react";
import { Download, Loader2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { renderContractText, generateContractPdf } from "@/lib/contract";
import { buildAdminContractData } from "@/lib/admin-contract";
import { parseProposalOverride } from "@/lib/proposal-override";

interface Props {
  evaluation: any;
}

/**
 * Dois botões para o admin baixar o PDF do contrato:
 *  1. "Original do cliente" — sempre disponível, replica o que o cliente assinou.
 *  2. "Ajustado pelo comercial" — só habilita quando há override salvo.
 *
 * Usa o mesmo `generateContractPdf` do fluxo público, garantindo o mesmo
 * layout visual que o cliente recebeu.
 */
export function ContractDownloadButtons({ evaluation }: Props) {
  const [loading, setLoading] = useState<"original" | "override" | null>(null);
  const override = parseProposalOverride(evaluation?.internal_notes);

  const handleDownload = async (mode: "original" | "override") => {
    setLoading(mode);
    try {
      // Carrega nome da loja + template do contrato (mesmas chaves do fluxo do cliente)
      const flowKey =
        evaluation.flow_type === "sale"
          ? "business_contract_terms_sale"
          : "business_contract_terms_trade";
      const { data: rows } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", [
          "business_store_name",
          flowKey,
          "business_contract_terms",
          "business_contract_template",
          "terms_title",
          "terms_text",
        ]);
      const settings: Record<string, string> = {};
      (rows ?? []).forEach((r: any) => (settings[r.key] = r.value));

      const storeName = settings.business_store_name?.trim() || "Pollicell";
      const lgpdTitle = settings.terms_title?.trim() || "";
      const lgpdText = settings.terms_text?.trim() || "";
      const contractTerms =
        settings[flowKey]?.trim() ||
        settings.business_contract_terms?.trim() ||
        settings.business_contract_template?.trim() ||
        "";

      const unifiedTemplate = lgpdText
        ? `${lgpdTitle}\n\n${lgpdText}\n\n${contractTerms}`
        : contractTerms;

      const data = await buildAdminContractData({
        evaluation,
        storeName,
        useOverride: mode === "override",
        override,
      });

      const text = renderContractText(unifiedTemplate, data);
      const suffix = mode === "override" ? "ajustado" : "original";
      const fileName = `contrato-${storeName.toLowerCase().replace(/\s+/g, "-")}-${suffix}.pdf`;

      generateContractPdf(text, fileName, {
        storeName,
        customerName: data.customerName,
        deviceLabel: data.deviceLabel,
        acceptedAt: data.acceptedAt ?? new Date(),
        flowLabel: data.flowLabel,
      });
    } catch (e: any) {
      toast({
        title: "Não foi possível gerar o PDF",
        description: e?.message ?? "—",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <FileText className="h-3.5 w-3.5" /> Contrato
      </h4>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload("original")}
          disabled={loading !== null}
          className="gap-1.5 flex-1"
        >
          {loading === "original" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Original do cliente
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload("override")}
          disabled={loading !== null || !override}
          className="gap-1.5 flex-1"
          title={!override ? "Salve um ajuste comercial primeiro" : undefined}
        >
          {loading === "override" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Ajustado pelo comercial
        </Button>
      </div>
    </section>
  );
}
