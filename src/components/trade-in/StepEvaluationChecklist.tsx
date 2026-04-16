import { useState } from "react";
import { ClipboardCheck, ArrowLeft, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  isSubmitting: boolean;
}

export function StepEvaluationChecklist({ data, onChange, onSubmit, onBack, onAnswer, onReject, isSubmitting }: Props) {
  const answers = data.checklistAnswers;
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const total = checklistItems.length;

  const requiredItems = checklistItems.filter((i) => i.required);
  const optionalItems = checklistItems.filter((i) => !i.required);

  const requiredAnswered = requiredItems.every((item) => answers[item.id] !== null && answers[item.id] !== undefined);

  const [rejectionModal, setRejectionModal] = useState<{ open: boolean; itemTitle: string; optionLabel: string }>({
    open: false,
    itemTitle: "",
    optionLabel: "",
  });

  const setAnswer = (itemId: string, optionIndex: number) => {
    const item = checklistItems.find((i) => i.id === itemId);
    if (!item) return;
    const option = item.options[optionIndex];

    const newAnswers = { ...answers, [itemId]: optionIndex };
    onChange({ checklistAnswers: newAnswers });
    onAnswer(itemId, optionIndex);

    // Hard stop on rejection
    if (option?.isCritical) {
      const reason = `${item.title}: ${option.label}`;
      onReject(reason);
      setRejectionModal({ open: true, itemTitle: item.title, optionLabel: option.label });
    }
  };

  const handleResetRejection = () => {
    // Clear the rejecting answer so user can change it
    const newAnswers = { ...answers };
    Object.keys(newAnswers).forEach((id) => {
      const item = checklistItems.find((i) => i.id === id);
      const idx = newAnswers[id];
      if (item && idx !== null && idx !== undefined && item.options[idx]?.isCritical) {
        newAnswers[id] = null;
      }
    });
    onChange({ checklistAnswers: newAnswers });
    setRejectionModal({ ...rejectionModal, open: false });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-card rounded-3xl shadow-sm border border-black/5 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Checklist de Avaliação</h2>
            </div>
            <span className="text-xs font-semibold bg-foreground text-background px-3 py-1 rounded-full">
              {answeredCount}/{total}
            </span>
          </div>

          <p className="text-xs font-semibold text-destructive uppercase tracking-widest mb-4">
            ✱ Obrigatórios
          </p>
          <div className="space-y-4 mb-8">
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
              <hr className="border-border mb-6" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
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
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !requiredAnswered}
            className="flex-1 h-12 rounded-full shadow-sm"
          >
            {isSubmitting ? "Calculando..." : "Calcular"} <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hard-stop rejection modal */}
      <Dialog open={rejectionModal.open} onOpenChange={(open) => !open && setRejectionModal({ ...rejectionModal, open: false })}>
        <DialogContent className="rounded-3xl border-destructive/20 max-w-md">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
              <Ban className="h-7 w-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl tracking-tight">
              Não podemos prosseguir
            </DialogTitle>
            <DialogDescription className="text-center pt-2 text-base">
              <span className="block">
                Sua resposta em <strong className="text-foreground">{rejectionModal.itemTitle}</strong>:
              </span>
              <span className="block mt-1 text-foreground font-medium">"{rejectionModal.optionLabel}"</span>
              <span className="block mt-3 text-sm">
                Infelizmente este aparelho não atende aos critérios mínimos para nossa avaliação.
                Recomendamos buscar um serviço de manutenção antes de retornar.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-2">
            <Button
              variant="outline"
              onClick={handleResetRejection}
              className="rounded-full"
            >
              Revisar respostas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
