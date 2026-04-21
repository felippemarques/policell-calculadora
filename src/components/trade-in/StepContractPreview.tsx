import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2, ShieldCheck, Download } from "lucide-react";
import { renderContractText, generateContractPdf, type ContractData } from "@/lib/contract";

/**
 * Contrato UNIFICADO: termos LGPD + contrato de troca/venda em um único
 * documento. O cliente lê, baixa o PDF e aceita uma única vez.
 */
const DEFAULT_TEMPLATE = `INSTRUMENTO PARTICULAR DE PROPOSTA DE {{flow_label_upper}} DE APARELHO USADO E TERMO DE CONSENTIMENTO LGPD

Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e contratado o seguinte:

I. DAS PARTES

LOJA / PROPONENTE: {{store_name}}
CLIENTE / OFERTANTE: {{customer_name}}
E-mail: {{customer_email}}
Telefone: {{customer_phone}}
Endereço completo: {{customer_address}}

II. DO OBJETO

O presente instrumento tem por objeto formalizar a proposta de {{flow_label_lower}} do aparelho descrito a seguir, ofertado pelo CLIENTE à LOJA, mediante avaliação técnica realizada de forma remota através da calculadora online.

Aparelho ofertado:
- Modelo: {{device_label}}
- IMEI declarado: {{imei}}

III. DA PROPOSTA COMERCIAL

A LOJA, com base nas informações declaradas pelo CLIENTE, apresenta a seguinte proposta:
- Valor base de mercado: R$ {{base_price}}
- Deduções aplicadas (estado de conservação, defeitos e danos declarados): R$ {{deductions}}
- Bônus de upgrade (aplicável apenas em operações de troca): {{bonus_percent}}%
- VALOR FINAL DA PROPOSTA: R$ {{final_value}}
- Modalidade da operação: {{flow_label}}

Parágrafo único — A presente proposta é preliminar e está condicionada à inspeção física do aparelho pela LOJA. Constatada divergência entre as informações declaradas e o estado real do aparelho, a proposta poderá ser revista ou cancelada sem qualquer ônus às partes.

IV. DAS DECLARAÇÕES DO CLIENTE

O CLIENTE declara, sob as penas da lei, que:
a) é o legítimo proprietário do aparelho ofertado, possuindo plena capacidade para dispor do bem;
b) o aparelho não é objeto de furto, roubo, apropriação indébita, bloqueio, restrição judicial ou de qualquer outra natureza;
c) todas as informações fornecidas — incluindo IMEI, modelo, capacidade e estado de conservação — são verdadeiras, completas e exatas;
d) está ciente de que a omissão ou prestação de informações falsas configura ilícito civil e penal, sujeitando-o às sanções aplicáveis.

V. DO TRATAMENTO DE DADOS PESSOAIS (LGPD — LEI Nº 13.709/2018)

O CLIENTE, na qualidade de titular dos dados, AUTORIZA EXPRESSAMENTE a LOJA a coletar, armazenar, tratar e utilizar os seus dados pessoais (nome completo, e-mail, telefone, endereço, IMEI e demais informações fornecidas) para as seguintes finalidades:
1. Avaliação e formalização da presente proposta de {{flow_label_lower}};
2. Comunicação comercial relacionada ao processo de avaliação;
3. Cumprimento de obrigações legais, regulatórias e fiscais;
4. Eventual emissão do cupom promocional vinculado à proposta;
5. Defesa de direitos em processos administrativos ou judiciais.

O CLIENTE poderá, a qualquer tempo, exercer os direitos previstos no art. 18 da LGPD — incluindo confirmação, acesso, correção, anonimização, portabilidade e eliminação dos dados — mediante solicitação direta à LOJA pelos canais oficiais de atendimento.

VI. DO CUPOM E DAS CONDIÇÕES DE USO

Aceita a presente proposta, será gerado um cupom de desconto vinculado ao IMEI declarado, com validade e regras conforme política da LOJA. O cupom é pessoal, intransferível e perderá validade caso o aparelho não seja entregue para inspeção dentro do prazo estabelecido.

VII. DAS DISPOSIÇÕES GERAIS

7.1. Este instrumento é firmado de forma eletrônica, sendo o aceite registrado com data, hora e versão para fins probatórios, na forma do art. 10, § 2º, da MP 2.200-2/2001.
7.2. Fica eleito o foro da comarca da sede da LOJA para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

VIII. DO ACEITE

Pelo presente, o CLIENTE declara ter lido, compreendido e aceito integralmente os termos desta proposta e do termo de consentimento LGPD.

Aceite registrado eletronicamente em {{accepted_at}}.

________________________________________
{{customer_name}} — CLIENTE
{{store_name}} — LOJA
`;

interface Props {
  data: ContractData;
  isSubmitting: boolean;
  onBack: () => void;
  onAccept: (renderedContract?: { text: string; storeName: string; flowLabel: string; acceptedAt: Date }) => void | Promise<void>;
}

export function StepContractPreview({ data, isSubmitting, onBack, onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  const isSale = (data.flowLabel || "").toLowerCase().startsWith("venda");
  const contractKey = isSale
    ? "business_contract_terms_sale"
    : "business_contract_terms_trade";

  const { data: settings } = useQuery({
    queryKey: ["lp_settings", "contract_unified", contractKey],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("lp_settings")
        .select("key,value")
        .in("key", [
          contractKey,
          "business_contract_terms", // legado — fallback
          "business_contract_template", // legado mais antigo
          "business_store_name",
          "terms_title",
          "terms_text",
          "terms_version",
          "terms_policy_url",
        ]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (rows ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
  });

  const storeName = settings?.business_store_name?.trim() || data.storeName;
  const lgpdTitle = settings?.terms_title?.trim() || "Termos e Política de Privacidade";
  const lgpdText = settings?.terms_text?.trim() || "";
  const contractTerms =
    settings?.[contractKey]?.trim() ||
    settings?.business_contract_terms?.trim() ||
    settings?.business_contract_template?.trim() ||
    DEFAULT_TEMPLATE;
  const contractVersion = settings?.terms_version?.trim() || "v1";
  const policyUrl = settings?.terms_policy_url?.trim() || "";

  const unifiedTemplate = useMemo(() => {
    if (!lgpdText) return contractTerms;
    return `${lgpdTitle}\n\n${lgpdText}\n\n${contractTerms}`;
  }, [lgpdTitle, lgpdText, contractTerms]);

  const renderedText = useMemo(
    () => renderContractText(unifiedTemplate, { ...data, storeName }),
    [unifiedTemplate, data, storeName],
  );

  const handleDownload = () => {
    generateContractPdf(renderedText, "contrato-pollicell.pdf", {
      storeName,
      customerName: data.customerName,
      deviceLabel: data.deviceLabel,
      acceptedAt: data.acceptedAt ?? new Date(),
      flowLabel: data.flowLabel,
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Contrato de {isSale ? "Venda" : "Troca"} e Termo LGPD
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Documento personalizado para a modalidade de <strong>{isSale ? "venda em dinheiro" : "troca/upgrade"}</strong>,
          com o laudo completo da sua avaliação. Você pode baixar uma cópia em PDF antes de aceitar.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contrato unificado · versão {contractVersion}
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
        <ScrollArea className="h-80 px-4 py-3">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans">
            {renderedText}
          </pre>
          {policyUrl && (
            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs text-primary underline underline-offset-2"
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
          <strong>Li, compreendi e aceito</strong> integralmente os termos do contrato e
          autorizo o tratamento dos meus dados pessoais conforme descrito no documento
          acima (LGPD — Lei nº 13.709/2018).
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
          onClick={() =>
            onAccept({
              text: renderedText,
              storeName,
              flowLabel: data.flowLabel,
              acceptedAt: new Date(),
            })
          }
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
