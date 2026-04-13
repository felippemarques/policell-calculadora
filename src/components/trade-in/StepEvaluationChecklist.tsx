import { ClipboardCheck, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checklistItems } from "@/data/checklist";
import { ChecklistCard } from "./ChecklistCard";
import type { WizardData } from "./TradeInWizard";

interface Props {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function StepEvaluationChecklist({ data, onChange, onSubmit, onBack, isSubmitting }: Props) {
  const answers = data.checklistAnswers;
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const total = checklistItems.length;

  const requiredItems = checklistItems.filter((i) => i.required);
  const optionalItems = checklistItems.filter((i) => !i.required);

  const requiredAnswered = requiredItems.every((item) => answers[item.id] !== null && answers[item.id] !== undefined);

  const setAnswer = (itemId: string, optionIndex: number) => {
    onChange({
      checklistAnswers: { ...answers, [itemId]: optionIndex },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Checklist de Avaliação</h2>
          </div>
          <span className="text-xs font-bold bg-foreground text-card px-2.5 py-1 rounded-full">
            {answeredCount}/{total}
          </span>
        </div>

        <p className="text-xs font-bold text-destructive uppercase tracking-wider mb-4">
          ✱ OBRIGATÓRIOS
        </p>
        <div className="space-y-4 mb-6">
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
            <hr className="border-border mb-4" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              OPCIONAIS
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
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting || !requiredAnswered} className="flex-1">
          {isSubmitting ? "Calculando..." : "Calcular"}{" "}
          <Send className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
