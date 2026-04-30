import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/trade-in-pricing";
import {
  parseProposalOverride,
  serializeOverride,
  stripOverrideBlock,
  bonusToMoney,
  recalcFinalValue,
  type BonusType,
  type ProposalOverrideRecord,
} from "@/lib/proposal-override";

interface Props {
  evaluation: any;
  /** E-mail do admin logado (para auditoria). */
  adminEmail?: string | null;
}

/**
 * Bloco "Ajuste comercial" que vive dentro do ProposalDetailSheet
 * (apenas para evaluations). Permite ao comercial sobrescrever preço base
 * e bônus para conceder um bônus extra e fechar o negócio.
 */
export function CommercialAdjustmentSection({ evaluation, adminEmail }: Props) {
  const qc = useQueryClient();
  const existingOverride = useMemo(
    () => parseProposalOverride(evaluation?.internal_notes),
    [evaluation?.internal_notes],
  );

  // Snapshot original: se já houver um override salvo, usamos `original` dele;
  // caso contrário, usamos os valores vivos da evaluation (que ainda são os do cliente).
  const original = useMemo(() => {
    if (existingOverride) return existingOverride.original;
    return {
      basePrice: Number(evaluation?.base_price) || 0,
      bonusPercent: 0,
      bonusValue: 0,
      finalValue: Number(evaluation?.final_value) || 0,
    };
  }, [existingOverride, evaluation]);

  const conditionDiscount = Number(evaluation?.condition_discount) || 0;
  const totalDeductions = Number(evaluation?.total_deductions) || 0;

  const [basePrice, setBasePrice] = useState<number>(
    existingOverride?.override.basePrice ?? original.basePrice,
  );
  const [bonusType, setBonusType] = useState<BonusType>(
    existingOverride?.override.bonusType ?? "money",
  );
  const [bonusValue, setBonusValue] = useState<number>(
    existingOverride?.override.bonusValue ?? 0,
  );

  const bonusMoney = bonusToMoney(basePrice, bonusType, bonusValue);
  const newFinalValue = recalcFinalValue({
    basePrice,
    conditionDiscount,
    totalDeductions,
    bonusMoney,
  });
  const extraBonus = Math.round((newFinalValue - original.finalValue) * 100) / 100;

  const saveMut = useMutation({
    mutationFn: async () => {
      const record: ProposalOverrideRecord = {
        original,
        override: {
          basePrice,
          bonusType,
          bonusValue,
          bonusValueMoney: bonusMoney,
          finalValue: newFinalValue,
        },
        extraBonus,
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail ?? null,
      };
      const freeText = stripOverrideBlock(evaluation?.internal_notes);
      const newNotes = serializeOverride(freeText, record);
      const { error } = await (supabase.rpc as any)("apply_proposal_override", {
        _evaluation_id: evaluation.id,
        _base_price: basePrice,
        _final_value: newFinalValue,
        _internal_notes: newNotes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ajuste salvo", description: "Os novos valores foram aplicados à proposta." });
      qc.invalidateQueries({ queryKey: ["proposal-detail"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-view-evaluations"] });
      qc.invalidateQueries({ queryKey: ["admin-evaluations"] });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao salvar", description: e?.message ?? "—", variant: "destructive" }),
  });

  const revertMut = useMutation({
    mutationFn: async () => {
      if (!existingOverride) return;
      const freeText = stripOverrideBlock(evaluation?.internal_notes);
      const { error } = await (supabase.rpc as any)("revert_proposal_override", {
        _evaluation_id: evaluation.id,
        _original_base_price: existingOverride.original.basePrice,
        _original_final_value: existingOverride.original.finalValue,
        _internal_notes: freeText || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ajuste revertido" });
      // Reset local state
      setBasePrice(original.basePrice);
      setBonusType("money");
      setBonusValue(0);
      qc.invalidateQueries({ queryKey: ["proposal-detail"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-view-evaluations"] });
      qc.invalidateQueries({ queryKey: ["admin-evaluations"] });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao reverter", description: e?.message ?? "—", variant: "destructive" }),
  });

  const dirty =
    basePrice !== (existingOverride?.override.basePrice ?? original.basePrice) ||
    bonusType !== (existingOverride?.override.bonusType ?? "money") ||
    bonusValue !== (existingOverride?.override.bonusValue ?? 0);

  return (
    <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-accent flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Ajuste comercial
        </h4>
        {existingOverride && (
          <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/40">
            Ajustado
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Conceda um bônus extra para fechar o negócio. O cupom usará o novo valor total;
        o contrato ajustado mostra o histórico “de / para”.
      </p>

      {/* Preço base */}
      <div className="space-y-1.5">
        <Label className="text-xs">Preço base</Label>
        <CurrencyInput
          value={basePrice}
          onValueChange={(v) => setBasePrice(v || 0)}
        />
        <p className="text-[11px] text-muted-foreground">
          Original: {formatBRL(original.basePrice)}
        </p>
      </div>

      {/* Bônus */}
      <div className="space-y-1.5">
        <Label className="text-xs">Bônus extra</Label>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setBonusType("money")}
              className={`px-2.5 py-1.5 ${bonusType === "money" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            >
              R$
            </button>
            <button
              type="button"
              onClick={() => setBonusType("percent")}
              className={`px-2.5 py-1.5 border-l border-border ${bonusType === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
            >
              %
            </button>
          </div>
          {bonusType === "money" ? (
            <CurrencyInput
              value={bonusValue}
              onValueChange={(v) => setBonusValue(v || 0)}
              className="flex-1"
            />
          ) : (
            <Input
              type="number"
              min={0}
              step="0.5"
              value={bonusValue || ""}
              onChange={(e) => setBonusValue(Number(e.target.value) || 0)}
              className="flex-1"
              placeholder="0"
            />
          )}
          {bonusType === "percent" && (
            <span className="text-xs text-muted-foreground tabular-nums">
              = {formatBRL(bonusMoney)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Original: {original.bonusPercent > 0 ? `${original.bonusPercent}% (${formatBRL(original.bonusValue)})` : formatBRL(original.bonusValue)}
        </p>
      </div>

      {/* De / Para */}
      <div className="rounded-md border border-border bg-background p-3 space-y-1 text-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Cupom (valor total)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">De:</span>
          <span className="tabular-nums text-foreground">{formatBRL(original.finalValue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Para:</span>
          <span className="tabular-nums font-bold text-primary">{formatBRL(newFinalValue)}</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <span className="text-xs text-accent font-medium">Bônus extra do comercial:</span>
          <span className={`tabular-nums font-semibold ${extraBonus >= 0 ? "text-success" : "text-destructive"}`}>
            {extraBonus >= 0 ? "+" : "−"} {formatBRL(Math.abs(extraBonus))}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          onClick={() => saveMut.mutate()}
          disabled={!dirty || saveMut.isPending}
          className="gap-1.5 flex-1"
          size="sm"
        >
          {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar ajuste
        </Button>
        {existingOverride && (
          <Button
            onClick={() => revertMut.mutate()}
            disabled={revertMut.isPending}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {revertMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reverter
          </Button>
        )}
      </div>
    </section>
  );
}
