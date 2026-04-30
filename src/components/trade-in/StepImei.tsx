import { useState, useMemo } from "react";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, Smartphone, TrendingUp, Gift, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { digitsOnly, formatImei, isValidImei } from "@/lib/imei";
import { formatBRL } from "@/lib/trade-in-pricing";
import type { FlowType } from "./StepChooseFlow";

interface Props {
  initialValue: string;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: (imei: string) => Promise<void> | void;
  /** Erro vindo do servidor (e.g. duplicidade). */
  serverError?: string | null;
  /** Limpa erro do servidor ao digitar. */
  onClearServerError?: () => void;
  flowLabel: "Trocar" | "Vender";
  /** Valor estimado parcial calculado pela checklist. */
  estimatedValue?: number;
  /** Fluxo atual (para decidir se mostra o bônus de troca). */
  flowType?: FlowType | null;
  /** % do bônus configurado em Negócio (de troca OU venda, conforme fluxo). */
  upgradeBonusPercent?: number;
  /** WhatsApp comercial para o botão de contato em caso de erro de duplicidade. */
  commercialWhatsapp?: string;
}

function buildWaUrl(input: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/\D/g, "");
  if (!digits) return null;
  // assume Brazil if no country code
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function StepImei({
  initialValue,
  isSubmitting,
  onBack,
  onConfirm,
  serverError,
  onClearServerError,
  flowLabel,
  estimatedValue,
  flowType,
  upgradeBonusPercent = 0,
  commercialWhatsapp,
}: Props) {
  const [raw, setRaw] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  const display = useMemo(() => formatImei(raw), [raw]);
  const digits = digitsOnly(raw);
  const valid = isValidImei(digits);
  const showError = (touched && digits.length > 0 && !valid) || !!serverError;

  const errorMessage = serverError
    ? serverError
    : digits.length === 0
      ? "Informe o IMEI."
      : digits.length < 15
        ? `Faltam ${15 - digits.length} dígito${15 - digits.length === 1 ? "" : "s"}.`
        : "IMEI inválido. Confira os números e tente novamente.";

  const handleChange = (v: string) => {
    onClearServerError?.();
    setRaw(v);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!valid) return;
    await onConfirm(digits);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Confirme o IMEI do aparelho
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Esse passo garante que cada aparelho receba uma proposta única e evita
          duplicidade de cupons. Você pode descobrir o IMEI digitando{" "}
          <code className="px-1 rounded bg-muted text-foreground">*#06#</code> no
          discador do celular.
        </p>
      </div>

      <Card className="p-4 md:p-5 space-y-3 bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
            Vamos usar o IMEI para registrar essa proposta de <strong>{flowLabel}</strong>.
            Caso você já tenha gerado um cupom para este mesmo aparelho, vamos
            informar para que não haja duplicidade.
          </div>
        </div>
      </Card>

      {typeof estimatedValue === "number" && estimatedValue > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 p-4 md:p-5 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Sua proposta até aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  {flowType === "sale" ? "Em dinheiro" : "Em crédito para troca"}
                </p>
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
              {formatBRL(estimatedValue)}
            </p>
          </div>

          {flowType === "trade" && upgradeBonusPercent > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/15 flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-accent/25 flex items-center justify-center flex-shrink-0 animate-bounce">
                <Gift className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                  <Sparkles className="h-3 w-3" /> Bônus de troca
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug mt-0.5">
                  Confirme agora e ganhe{" "}
                  <span className="text-accent font-bold">
                    +{upgradeBonusPercent.toLocaleString("pt-BR")}%
                  </span>{" "}
                  extra para trocar seu celular!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="imei" className="text-sm font-medium">
          IMEI (15 dígitos)
        </Label>
        <Input
          id="imei"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ex.: 359123 456789 012"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={20}
          className={`text-base tracking-wider tabular-nums ${
            showError ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
        <div className="flex items-center justify-between text-[11px]">
          <span
            className={`${
              showError ? "text-destructive" : "text-muted-foreground"
            } flex items-center gap-1`}
          >
            {showError && !serverError && <AlertCircle className="h-3 w-3" />}
            {showError && !serverError
              ? errorMessage
              : "Apenas números. Sem espaços ou traços."}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {digits.length}/15
          </span>
        </div>
      </div>

      {serverError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-destructive">
                Já existe uma proposta para este IMEI
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">
                {serverError}
              </p>
            </div>
          </div>
          {(() => {
            const wa = buildWaUrl(commercialWhatsapp ?? "");
            if (!wa) return null;
            return (
              <Button
                type="button"
                variant="default"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.open(wa, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar com o comercial no WhatsApp
              </Button>
            );
          })()}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!valid || isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Confirmar e ver proposta
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
