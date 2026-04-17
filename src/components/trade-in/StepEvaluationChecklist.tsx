import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  Send,
  Ban,
  RotateCcw,
  Sparkles,
  Wrench,
  ShieldAlert,
  Check,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
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
import {
  ChecklistAnswers,
  ConditionRow,
  DamageOption,
  DamageCategory,
  formatBRL,
} from "@/lib/trade-in-pricing";

interface Props {
  answers: ChecklistAnswers;
  onAnswersChange: (next: ChecklistAnswers) => void;
  onSubmit: () => void;
  onBack: () => void;
  onSubScreenChange?: (screen: SubScreen) => void;
  onReject: (reason: string) => void;
  onResetAll?: () => void;
  isSubmitting: boolean;
  basePrice: number;
}

export type SubScreen = "condition" | "damages" | "rejection";

const SUB_SCREENS: { key: SubScreen; label: string; icon: typeof Sparkles }[] = [
  { key: "condition", label: "Estado Geral", icon: Sparkles },
  { key: "damages", label: "Defeitos", icon: Wrench },
  { key: "rejection", label: "Impedimentos", icon: ShieldAlert },
];

export function StepEvaluationChecklist({
  answers,
  onAnswersChange,
  onSubmit,
  onBack,
  onSubScreenChange,
  onReject,
  onResetAll,
  isSubmitting,
}: Props) {
  const [subScreen, setSubScreen] = useState<SubScreen>("condition");
  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    title: string;
    label: string;
  }>({ open: false, title: "", label: "" });

  // Validation: which required ids (condition or damage category) are missing
  const [missingIds, setMissingIds] = useState<Set<string>>(new Set());
  // Refs to scroll to the first missing card
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    onSubScreenChange?.(subScreen);
  }, [subScreen, onSubScreenChange]);

  // ── Data ──
  const { data: conditions = [] } = useQuery({
    queryKey: ["condition_discounts_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as ConditionRow[];
    },
  });

  const { data: damageCategories = [] } = useQuery({
    queryKey: ["damage_categories_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as DamageCategory[];
    },
  });

  const { data: damageOptions = [] } = useQuery({
    queryKey: ["damage_deductions_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_deductions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as DamageOption[];
    },
  });

  const normalConditions = useMemo(() => conditions.filter((c) => !c.is_rejected), [conditions]);
  const rejectionReasons = useMemo(() => conditions.filter((c) => c.is_rejected), [conditions]);

  // ── Selection helpers ──
  const selectCondition = (id: string) => {
    onAnswersChange({ ...answers, conditionId: id });
  };

  const selectDamageOption = (catId: string, optId: string) => {
    const opt = damageOptions.find((o) => o.id === optId);
    const next: ChecklistAnswers = {
      ...answers,
      damageOptionByCategory: { ...answers.damageOptionByCategory, [catId]: optId },
    };
    onAnswersChange(next);

    if (opt?.is_rejected) {
      const cat = damageCategories.find((c) => c.id === catId);
      const reason = `${cat?.name ?? "Defeito"}: ${opt.option_name}`;
      onReject(reason);
      setRejectionModal({ open: true, title: cat?.name ?? "Defeito", label: opt.option_name });
    }
  };

  const selectRejection = (id: string) => {
    const rej = conditions.find((c) => c.id === id);
    const next: ChecklistAnswers = { ...answers, rejectionId: id };
    onAnswersChange(next);
    if (rej) {
      onReject(rej.condition_name);
      setRejectionModal({ open: true, title: "Impedimento", label: rej.condition_name });
    }
  };

  // ── Validation per sub-screen ──
  const requiredDamageCategories = useMemo(
    () => damageCategories.filter((c) => c.is_required !== false),
    [damageCategories],
  );
  const conditionAnswered = !!answers.conditionId;
  const allRequiredDamageCategoriesAnswered = requiredDamageCategories.every(
    (c) => !!answers.damageOptionByCategory[c.id],
  );

  const scrollToFirstMissing = (ids: string[]) => {
    const first = ids[0];
    if (!first) return;
    const el = cardRefs.current[first];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNextClick = () => {
    if (subScreen === "condition") {
      const requireCondition =
        normalConditions.length > 0 && normalConditions.some((c) => c.is_required !== false);
      if (requireCondition && !conditionAnswered) {
        setMissingIds(new Set(["__condition__"]));
        toast.error("Selecione a condição geral do aparelho para continuar.");
        scrollToFirstMissing(["__condition__"]);
        return;
      }
      setMissingIds(new Set());
      setSubScreen("damages");
      return;
    }
    if (subScreen === "damages") {
      const missing = requiredDamageCategories
        .filter((c) => !answers.damageOptionByCategory[c.id])
        .map((c) => c.id);
      if (missing.length > 0) {
        setMissingIds(new Set(missing));
        toast.error(
          missing.length === 1
            ? "Falta responder uma categoria obrigatória."
            : `Faltam ${missing.length} categorias obrigatórias.`,
        );
        scrollToFirstMissing(missing);
        return;
      }
      setMissingIds(new Set());
      setSubScreen("rejection");
    }
  };


  // Clear rejection on revisar
  const handleClearRejection = () => {
    const next: ChecklistAnswers = { ...answers };
    // Remove rejection field
    next.rejectionId = null;
    // Remove any rejected damage option from B
    next.damageOptionByCategory = { ...answers.damageOptionByCategory };
    for (const [catId, optId] of Object.entries(next.damageOptionByCategory)) {
      const opt = damageOptions.find((o) => o.id === optId);
      if (opt?.is_rejected) next.damageOptionByCategory[catId] = null;
    }
    onAnswersChange(next);
    setRejectionModal({ ...rejectionModal, open: false });
  };

  const handleStartOver = () => {
    setRejectionModal({ ...rejectionModal, open: false });
    onResetAll?.();
  };

  // ── Sub-screen navigation ──
  const goNext = () => {
    if (subScreen === "condition") setSubScreen("damages");
    else if (subScreen === "damages") setSubScreen("rejection");
  };

  const goPrev = () => {
    if (subScreen === "rejection") setSubScreen("damages");
    else if (subScreen === "damages") setSubScreen("condition");
    else onBack();
  };

  const currentIdx = SUB_SCREENS.findIndex((s) => s.key === subScreen);

  return (
    <>
      <div className="animate-fade-in space-y-6">
        {/* Header + sub-step indicator */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Avaliação do Aparelho
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {SUB_SCREENS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === currentIdx;
              const isDone = i < currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all flex-1 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isDone
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <Icon className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ───── TELA A: Condição Geral ───── */}
        {subScreen === "condition" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Estado Geral
              </p>
              <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground mt-2 flex items-center gap-2">
                Como está a condição geral do aparelho?
                <ConditionsHelp conditions={normalConditions} />
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione a opção que melhor descreve o estado do seu aparelho.
              </p>
            </div>

            <div
              ref={(el) => {
                cardRefs.current["__condition__"] = el;
              }}
              className={`rounded-3xl p-1 transition-all ${
                missingIds.has("__condition__")
                  ? "ring-2 ring-destructive bg-destructive/5"
                  : ""
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                {normalConditions.map((cond) => {
                  const isSelected = answers.conditionId === cond.id;
                  return (
                    <OptionCard
                      key={cond.id}
                      selected={isSelected}
                      onClick={() => {
                        if (missingIds.has("__condition__")) {
                          const next = new Set(missingIds);
                          next.delete("__condition__");
                          setMissingIds(next);
                        }
                        selectCondition(cond.id);
                      }}
                      label={cond.condition_name}
                      help={cond.help_text}
                      badge={
                        cond.discount_percentage > 0
                          ? `−${cond.discount_percentage}%`
                          : "Sem desconto"
                      }
                    />
                  );
                })}
              </div>
              {missingIds.has("__condition__") && (
                <p className="text-xs text-destructive font-medium px-3 pb-2 pt-1">
                  Selecione uma opção para continuar.
                </p>
              )}
            </div>
            {normalConditions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma condição cadastrada.
              </p>
            )}
          </div>
        )}

        {/* ───── TELA B: Categorias de Defeitos (dinâmicas) ───── */}
        {subScreen === "damages" && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                <Wrench className="h-3 w-3" /> Defeitos Específicos
              </p>
              <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground mt-2">
                Há algum defeito específico no aparelho?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Para cada categoria, selecione a opção que descreve o estado.
              </p>
            </div>

            {damageCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma categoria cadastrada.
              </p>
            )}

            {damageCategories.map((cat) => {
              const opts = damageOptions.filter((o) => o.damage_category_id === cat.id);
              const selectedId = answers.damageOptionByCategory[cat.id] ?? null;
              if (opts.length === 0) return null;
              return (
                <div
                  key={cat.id}
                  className="rounded-3xl border border-black/5 bg-card p-5 md:p-6 shadow-sm"
                >
                  <h4 className="text-base font-semibold text-foreground mb-3">{cat.name}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {opts.map((opt) => {
                      const isSelected = selectedId === opt.id;
                      return (
                        <OptionCard
                          key={opt.id}
                          selected={isSelected}
                          onClick={() => selectDamageOption(cat.id, opt.id)}
                          label={opt.option_name}
                          isReject={opt.is_rejected}
                          badge={
                            opt.is_rejected
                              ? "Inviabiliza"
                              : Number(opt.deduction_value) > 0
                                ? `−${formatBRL(Number(opt.deduction_value))}`
                                : "Sem dedução"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ───── TELA C: Motivos de Rejeição ───── */}
        {subScreen === "rejection" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-destructive uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="h-3 w-3" /> Impedimentos
              </p>
              <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground mt-2">
                Algum desses problemas se aplica ao aparelho?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Se nenhum se aplica, basta avançar para finalizar a avaliação.
              </p>
            </div>

            <div className="rounded-3xl bg-destructive/5 border border-destructive/15 p-5 space-y-2.5">
              {rejectionReasons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum impedimento cadastrado.
                </p>
              )}
              {rejectionReasons.map((rej) => {
                const isSelected = answers.rejectionId === rej.id;
                return (
                  <button
                    key={rej.id}
                    type="button"
                    onClick={() => selectRejection(rej.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-3 ${
                      isSelected
                        ? "border-destructive bg-destructive/10 ring-2 ring-destructive/30"
                        : "border-destructive/20 bg-card hover:border-destructive/40"
                    }`}
                  >
                    <Ban
                      className={`h-4 w-4 flex-shrink-0 ${
                        isSelected ? "text-destructive" : "text-destructive/70"
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground flex-1">
                      {rej.condition_name}
                    </span>
                    {isSelected && (
                      <Badge variant="destructive" className="text-[10px]">
                        Selecionado
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ───── Footer navigation ───── */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={goPrev} className="flex-1 h-12 rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          {subScreen !== "rejection" ? (
            <Button
              onClick={goNext}
              disabled={
                (subScreen === "condition" && !conditionAnswered) ||
                (subScreen === "damages" && damageCategories.length > 0 && !allDamageCategoriesAnswered)
              }
              className="flex-1 h-12 rounded-full shadow-sm"
            >
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-full shadow-sm"
            >
              {isSubmitting ? "Calculando..." : "Calcular"} <Send className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hard-stop rejection modal */}
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
                Sua resposta em <strong className="text-foreground">{rejectionModal.title}</strong>:
              </span>
              <span className="block text-foreground font-medium">"{rejectionModal.label}"</span>
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

// ── Small reusable option card ──
function OptionCard({
  selected,
  onClick,
  label,
  badge,
  isReject,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
  isReject?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
        selected
          ? isReject
            ? "border-destructive bg-destructive/5 ring-2 ring-destructive/30 shadow-sm"
            : "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
          : "border-black/10 bg-card hover:border-black/20 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            selected
              ? isReject
                ? "border-destructive bg-destructive"
                : "border-primary bg-primary"
              : "border-black/20 bg-transparent"
          }`}
        >
          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-foreground block">{label}</span>
          {badge && (
            <span
              className={`block text-xs mt-1 ${
                isReject ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
