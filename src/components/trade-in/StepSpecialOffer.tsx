import { Sparkles, Gift, ShieldCheck, ArrowLeft, TrendingUp, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/trade-in-pricing";

interface Props {
  baseValue: number; // valor avaliado (sem bônus)
  bonusPercent: number; // % configurado em Negócio
  onBack: () => void;
  onContinue: () => void;
}

/**
 * "Tela do cupom especial" — exibida APÓS a avaliação, ANTES do IMEI,
 * quando o fluxo é troca e há bônus configurado. Reforça o ganho extra
 * para criar tensão positiva antes de pedir o IMEI.
 */
export function StepSpecialOffer({ baseValue, bonusPercent, onBack, onContinue }: Props) {
  const bonusValue = Math.round(baseValue * (bonusPercent / 100) * 100) / 100;
  const totalWithBonus = Math.round((baseValue + bonusValue) * 100) / 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
          <Sparkles className="h-3 w-3" /> Cupom especial liberado
        </div>
        <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Você acabou de desbloquear um bônus exclusivo
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Confirme o IMEI agora para garantir o valor com bônus aplicado na sua troca.
        </p>
      </div>

      {/* Card hero do valor */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-accent/40 bg-gradient-to-br from-primary/5 via-background to-accent/15 p-6 md:p-8">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl animate-pulse" />

        <div className="relative space-y-5">
          {/* Linha 1: valor base */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Valor avaliado do seu aparelho
                </p>
                <p className="text-xs text-muted-foreground">Conforme respostas da avaliação</p>
              </div>
            </div>
            <p className="text-lg md:text-xl font-semibold tabular-nums text-foreground">
              {formatBRL(baseValue)}
            </p>
          </div>

          {/* Linha 2: + bônus */}
          {bonusPercent > 0 && bonusValue > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-accent/25 flex items-center justify-center animate-bounce">
                  <Gift className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                    Bônus de troca {`+${bonusPercent.toLocaleString("pt-BR")}%`}
                  </p>
                  <p className="text-xs text-foreground/80">Aplicado automaticamente</p>
                </div>
              </div>
              <p className="text-lg md:text-xl font-semibold tabular-nums text-accent">
                + {formatBRL(bonusValue)}
              </p>
            </div>
          )}

          <div className="h-px bg-border/60" />

          {/* Linha 3: total com bônus */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                Total para usar na sua troca
              </p>
              <p className="text-xs text-muted-foreground">Em crédito imediato na loja</p>
            </div>
            <p className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">
              {formatBRL(totalWithBonus)}
            </p>
          </div>
        </div>
      </div>

      {/* Aviso/CTA */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Tag className="h-4 w-4 text-primary" />
        </div>
        <p className="text-xs leading-relaxed text-foreground/80">
          Para liberar o cupom com o bônus, precisamos confirmar o <strong>IMEI</strong> do
          aparelho — ele garante que esse desconto fique vinculado a esse celular específico,
          sem duplicidade.
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="sm:w-auto w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          size="lg"
          className="flex-1 h-12 rounded-2xl text-base font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Digitar IMEI para garantir o desconto
        </Button>
      </div>
    </div>
  );
}
