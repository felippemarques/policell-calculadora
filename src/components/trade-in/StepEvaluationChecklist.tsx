import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, ArrowLeft, Send, Ban, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { checklistItems } from "@/data/checklist";
import { ChecklistCard } from "./ChecklistCard";
import type { WizardData } from "./TradeInWizard";

interface Props {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  onAnswer: (itemId: string, optionIndex: number) => void;
  onReject: (reason: string) => void;
  onResetAll?: () => void;
  isSubmitting: boolean;
}

const CONDITION_ITEM_ID = "__condition__";

export function StepEvaluationChecklist({
  data,
  onChange,
  onSubmit,
  onBack,
  onAnswer,
  onReject,
  onResetAll,
  isSubmitting,
}: Props) {
  const answers = data.checklistAnswers;

  // Dynamic conditions from DB
  const { data: conditions = [] } = useQuery({
    queryKey: ["condition_discounts_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Build virtual checklist item from conditions
  const conditionItem = useMemo(() => {
    if (conditions.length === 0) return null;
    return {
      id: CONDITION_ITEM_ID,
      title: "Condição Geral do Aparelho",
      description: "Selecione a condição que melhor descreve o estado geral do seu aparelho.",
      required: true,
      options: conditions.map((c) => ({
        label: c.condition_name,
        discountFixed: 0,
        discountPercent: c.is_rejected ? 0 : c.discount_percentage,
        isCritical: c.is_rejected,
      })),
    };
  }, [conditions]);

  const requiredItems = checklistItems.filter((i) => i.required);
  const optionalItems = checklistItems.filter((i) => !i.required);

  const totalCount = checklistItems.length + (conditionItem ? 1 : 0);
  const answeredCount = Object.entries(answers).filter(
    ([, v]) => v !== null && v !== undefined,
  ).length;

  const conditionAnswered =
    !conditionItem || (answers[CONDITION_ITEM_ID] !== null && answers[CONDITION_ITEM_ID] !== undefined);
  const requiredAnswered =
    requiredItems.every((item) => answers[item.id] !== null && answers[item.id] !== undefined) &&
    conditionAnswered;

  // Detect any current rejection across all answers (DB conditions OR hardcoded items)
  const isRejected = useMemo(() => {
    // Check condition rejection
    if (conditionItem) {
      const idx = answers[CONDITION_ITEM_ID];
      if (idx !== null && idx !== undefined && conditionItem.options[idx]?.isCritical) {
        return true;
      }
    }
    // Check hardcoded items
    for (const item of checklistItems) {
      const idx = answers[item.id];
      if (idx !== null && idx !== undefined && item.options[idx]?.isCritical) {
        return true;
      }
    }
    return false;
  }, [answers, conditionItem]);

  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    itemTitle: string;
    optionLabel: string;
  }>({ open: false, itemTitle: "", optionLabel: "" });

  const setAnswer = (itemId: string, optionIndex: number) => {
    let item: { id: string; title: string; options: { label: string; isCritical: boolean }[] } | undefined;

    if (itemId === CONDITION_ITEM_ID) {
      item = conditionItem ?? undefined;
    } else {
      item = checklistItems.find((i) => i.id === itemId);
    }
    if (!item) return;

    const option = item.options[optionIndex];
    const newAnswers = { ...answers, [itemId]: optionIndex };
    onChange({ checklistAnswers: newAnswers });
    onAnswer(itemId, optionIndex);

    if (option?.isCritical) {
      const reason = `${item.title}: ${option.label}`;
      onReject(reason);
      setRejectionModal({ open: true, itemTitle: item.title, optionLabel: option.label });
    }
  };

  const handleClearRejection = () => {
    // Clear ALL critical answers so user can re-answer
    const newAnswers = { ...answers };

    if (conditionItem) {
      const idx = newAnswers[CONDITION_ITEM_ID];
      if (idx !== null && idx !== undefined && conditionItem.options[idx]?.isCritical) {
        newAnswers[CONDITION_ITEM_ID] = null;
      }
    }
    Object.keys(newAnswers).forEach((id) => {
      if (id === CONDITION_ITEM_ID) return;
      const item = checklistItems.find((i) => i.id === id);
      const idx = newAnswers[id];
      if (item && idx !== null && idx !== undefined && item.options[idx]?.isCritical) {
        newAnswers[id] = null;
      }
    });
    onChange({ checklistAnswers: newAnswers });
    setRejectionModal({ ...rejectionModal, open: false });
  };

  const handleStartOver = () => {
    setRejectionModal({ ...rejectionModal, open: false });
    onResetAll?.();
  };

  return (
    <>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Checklist de Avaliação
            </h2>
          </div>
          <span className="text-xs font-semibold bg-foreground text-background px-3 py-1 rounded-full">
            {answeredCount}/{totalCount}
          </span>
        </div>

        {/* Dynamic condition (from DB) */}
        {conditionItem && (
          <>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Condição Geral
            </p>
            <ChecklistCard
              item={conditionItem as any}
              selectedIndex={answers[CONDITION_ITEM_ID] ?? null}
              onSelect={(i) => setAnswer(CONDITION_ITEM_ID, i)}
            />
          </>
        )}

        <p className="text-xs font-semibold text-destructive uppercase tracking-widest mt-2">
          ✱ Obrigatórios
        </p>
        <div className="space-y-4">
          {requiredItems.map((item) => (
            <ChecklistCard
              key={item.id}
              item={item}
              selectedIndex={answers[item.id] ?? null}
              onSelect={(i) => setAnswer(item.id, i)}
            />
          ))}
        </div>

        {optionalItems.length > 0 && (
          <>
            <hr className="border-border" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Opcionais
            </p>
            <div className="space-y-4">
              {optionalItems.map((item) => (
                <ChecklistCard
                  key={item.id}
                  item={item}
                  selectedIndex={answers[item.id] ?? null}
                  onSelect={(i) => setAnswer(item.id, i)}
                />
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {/* Hide calc button when rejected */}
          {!isRejected && (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !requiredAnswered}
              className="flex-1 h-12 rounded-full shadow-sm"
            >
              {isSubmitting ? "Calculando..." : "Calcular"} <Send className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {isRejected && (
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-center">
            <p className="text-sm text-destructive font-medium">
              Avaliação bloqueada por uma condição crítica.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revise sua resposta ou recomece a avaliação.
            </p>
          </div>
        )}
      </div>

      {/* Hard-stop rejection modal (AlertDialog) */}
      <AlertDialog
        open={rejectionModal.open}
        onOpenChange={(open) =>
          !open && setRejectionModal({ ...rejectionModal, open: false })
        }
      >
        <AlertDialogContent className="rounded-3xl border-destructive/20 max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
              <Ban className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl tracking-tight">
              Não podemos prosseguir
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2 text-base space-y-2">
              <span className="block">
                Sua resposta em <strong className="text-foreground">{rejectionModal.itemTitle}</strong>:
              </span>
              <span className="block text-foreground font-medium">
                "{rejectionModal.optionLabel}"
              </span>
              <span className="block text-sm pt-2">
                Infelizmente não podemos prosseguir com a compra do aparelho nestas condições.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center pt-2 gap-2">
            <AlertDialogCancel onClick={handleClearRejection} className="rounded-full mt-0">
              Revisar resposta
            </AlertDialogCancel>
            {onResetAll && (
              <AlertDialogAction
                onClick={handleStartOver}
                className="rounded-full bg-destructive hover:bg-destructive/90"
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Recomeçar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
