import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ChecklistItem } from "@/data/checklist";

interface ChecklistCardProps {
  item: ChecklistItem;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function ChecklistCard({ item, selectedIndex, onSelect }: ChecklistCardProps) {
  const isAnswered = selectedIndex !== null;
  const selectedOption = selectedIndex !== null ? item.options[selectedIndex] : null;
  const hasCritical = selectedOption?.isCritical;

  return (
    <div
      className={`rounded-lg border-2 p-5 transition-all ${
        isAnswered
          ? hasCritical
            ? "border-warning-border bg-checked-bg"
            : "border-checked-border bg-checked-bg"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
        {isAnswered && (
          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">{item.description}</p>

      <div className="flex flex-wrap gap-2">
        {item.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const hasDiscount = opt.discountFixed > 0 || opt.discountPercent > 0;

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all min-w-[100px] text-center ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              <span>{opt.label}</span>
              {hasDiscount && (
                <span className="block text-xs mt-0.5 opacity-80">
                  {opt.discountFixed > 0 && `-R$ ${opt.discountFixed.toFixed(2).replace(".", ",")}`}
                  {opt.discountPercent > 0 && `-${opt.discountPercent}%`}
                </span>
              )}
              {!hasDiscount && !opt.isCritical && (
                <span className="block text-xs mt-0.5 opacity-60">—</span>
              )}
              {opt.isCritical && (
                <AlertTriangle className="inline h-3.5 w-3.5 ml-1 -mt-0.5 opacity-80" />
              )}
            </button>
          );
        })}
      </div>

      {hasCritical && (
        <div className="mt-3 flex items-center gap-2 bg-warning-bg border border-warning-border rounded-lg px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <span className="text-sm text-warning-foreground">
            Atenção! Essa opção pode invalidar a avaliação.
          </span>
        </div>
      )}
    </div>
  );
}
