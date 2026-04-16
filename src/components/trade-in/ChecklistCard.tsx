import { CheckCircle2, AlertTriangle, Ban } from "lucide-react";
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
    <div className="rounded-3xl border border-black/5 bg-card p-6 md:p-7 shadow-sm transition-all">
      <div className="flex items-start justify-between mb-1.5 gap-3">
        <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
          {item.title}
        </h3>
        {isAnswered && !hasCritical && (
          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{item.description}</p>

      {/* Radio cards — Apple-style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={item.title}>
        {item.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const hasDiscount = opt.discountFixed > 0 || opt.discountPercent > 0;
          const isReject = opt.isCritical;

          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(i)}
              className={`group relative text-left rounded-2xl border p-4 transition-all duration-200
                ${
                  isSelected
                    ? isReject
                      ? "border-destructive bg-destructive/5 ring-2 ring-destructive/30 shadow-sm"
                      : "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                    : "border-black/10 bg-card hover:border-black/20 hover:shadow-sm"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected
                      ? isReject
                        ? "border-destructive bg-destructive"
                        : "border-primary bg-primary"
                      : "border-black/20 bg-transparent"
                  }`}
                >
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{opt.label}</span>
                    {isReject && <Ban className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                  </div>
                  {hasDiscount && (
                    <span className="block text-xs mt-1 text-muted-foreground">
                      {opt.discountFixed > 0 && `−R$ ${opt.discountFixed.toFixed(2).replace(".", ",")}`}
                      {opt.discountFixed > 0 && opt.discountPercent > 0 && " · "}
                      {opt.discountPercent > 0 && `−${opt.discountPercent}%`}
                    </span>
                  )}
                  {!hasDiscount && !isReject && (
                    <span className="block text-xs mt-1 text-muted-foreground/70">Sem dedução</span>
                  )}
                  {isReject && !hasDiscount && (
                    <span className="block text-xs mt-1 text-destructive font-medium">Reprova a avaliação</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {hasCritical && (
        <div className="mt-4 flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-2xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive">
            Esta opção bloqueia a avaliação.
          </span>
        </div>
      )}
    </div>
  );
}
