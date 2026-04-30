import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessSettings } from "@/hooks/use-business-settings";
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
  HelpCircle,
  Info,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/lib/trade-in-pricing";
import {
  useEvaluationGroupsConfig,
  type EvaluationGroupId,
} from "@/hooks/use-evaluation-groups-config";

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
  selectedBrandId?: string | null;
  selectedModelId?: string | null;
  /** Optional callback so the wizard can show "Pergunta X de Y" in the global progress bar. */
  onProgressChange?: (current: number, total: number) => void;
}

export type SubScreen = "condition" | "damages" | "rejection";

// ───────────────── Question model ─────────────────
//
// We flatten the entire checklist into a linear queue of "questions". Each
// question is shown one at a time, auto-advances on selection, and conditional
// sub-questions get inserted right after their parent the moment they become
// relevant. This drives the gamified one-question-per-screen UX.

type Question =
  | {
      kind: "condition";
      id: string; // synthetic
      group: SubScreen;
      title: string;
      subtitle: string;
      icon: typeof Sparkles;
      conditions: ConditionRow[];
    }
  | {
      kind: "damage";
      id: string; // damage_category id
      group: SubScreen;
      title: string;
      subtitle: string;
      icon: typeof Wrench;
      category: DamageCategory;
      options: DamageOption[];
      depth: number;
    }
  | {
      kind: "rejection";
      id: string; // synthetic
      group: SubScreen;
      title: string;
      subtitle: string;
      icon: typeof ShieldAlert;
      reasons: ConditionRow[];
    };

const GROUP_META: Record<SubScreen, { label: string; tone: string }> = {
  condition: { label: "Estado Geral", tone: "text-primary" },
  damages: { label: "Defeitos", tone: "text-amber-600" },
  rejection: { label: "Impedimentos", tone: "text-destructive" },
};

export function StepEvaluationChecklist({
  answers,
  onAnswersChange,
  onSubmit,
  onBack,
  onSubScreenChange,
  onReject,
  onResetAll,
  isSubmitting,
  selectedBrandId,
  selectedModelId,
  onProgressChange,
}: Props) {
  const SUB_SCREEN_TO_GROUP: Record<SubScreen, EvaluationGroupId> = {
    condition: "conditions",
    damages: "defects",
    rejection: "rejection",
  };
  const GROUP_TO_SUB_SCREEN: Record<EvaluationGroupId, SubScreen> = {
    conditions: "condition",
    defects: "damages",
    rejection: "rejection",
  };

  const { data: groupsConfig } = useEvaluationGroupsConfig();
  const { data: businessSettings } = useBusinessSettings();
  const showRejectLabel = businessSettings?.showRejectLabel ?? true;
  const showNoDeductionLabel = businessSettings?.showNoDeductionLabel ?? true;

  const adminOrderedSubScreens = useMemo<SubScreen[]>(() => {
    const order = groupsConfig?.order ?? ["conditions", "defects", "rejection"];
    const visible = groupsConfig?.visible ?? { conditions: true, defects: true, rejection: true };
    return order.filter((g) => visible[g]).map((g) => GROUP_TO_SUB_SCREEN[g]);
  }, [groupsConfig]);

  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    title: string;
    label: string;
  }>({ open: false, title: "", label: "" });

  // ── Data ──
  const { data: conditions = [] } = useQuery({
    queryKey: ["condition_discounts_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as ConditionRow[];
    },
  });

  const { data: damageCategoriesAll = [] } = useQuery({
    queryKey: ["damage_categories_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        brand_ids: Array.isArray(c.brand_ids) ? c.brand_ids : [],
      })) as DamageCategory[];
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

  const { data: validBrandIds = [] } = useQuery({
    queryKey: ["valid_brand_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id");
      if (error) throw error;
      return (data ?? []).map((b: any) => b.id as string);
    },
  });
  const { data: validModelIds = [] } = useQuery({
    queryKey: ["valid_model_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_models").select("id");
      if (error) throw error;
      return (data ?? []).map((m: any) => m.id as string);
    },
  });

  // ── Filter categories by brand/model (stale ids ignored) ──
  const damageCategories = useMemo(() => {
    if (damageCategoriesAll.length === 0) return [];
    const validBrandSet = new Set(validBrandIds);
    const validModelSet = new Set(validModelIds);
    const matchesScope = (c: DamageCategory) => {
      const brandIds = (c.brand_ids ?? []).filter((id) => validBrandSet.has(id));
      const modelIds = (c.model_ids ?? []).filter((id) => validModelSet.has(id));
      const brandOk = brandIds.length === 0 || (!!selectedBrandId && brandIds.includes(selectedBrandId));
      const modelOk = modelIds.length === 0 || (!!selectedModelId && modelIds.includes(selectedModelId));
      return brandOk && modelOk;
    };
    const rootVisibility = new Map<string, boolean>();
    for (const c of damageCategoriesAll) {
      if (!c.parent_id && !c.parent_option_id) {
        rootVisibility.set(c.id, matchesScope(c));
      }
    }
    const findRootId = (id: string): string | null => {
      let cur = damageCategoriesAll.find((x) => x.id === id);
      const visited = new Set<string>();
      while (cur && !visited.has(cur.id)) {
        visited.add(cur.id);
        if (!cur.parent_id && !cur.parent_option_id) return cur.id;
        if (cur.parent_id) {
          const parent = damageCategoriesAll.find((x) => x.id === cur!.parent_id);
          if (!parent) return cur.id;
          cur = parent;
          continue;
        }
        if (cur.parent_option_id) {
          const triggerOpt = damageOptions.find((o) => o.id === cur!.parent_option_id);
          if (!triggerOpt) return null;
          const owning = damageCategoriesAll.find((x) => x.id === triggerOpt.damage_category_id);
          if (!owning) return null;
          cur = owning;
          continue;
        }
      }
      return cur?.id ?? null;
    };
    return damageCategoriesAll.filter((c) => {
      if (!c.parent_id && !c.parent_option_id) return rootVisibility.get(c.id) === true;
      const rootId = findRootId(c.id);
      return rootId ? rootVisibility.get(rootId) === true : false;
    });
  }, [damageCategoriesAll, damageOptions, selectedBrandId, selectedModelId, validBrandIds, validModelIds]);

  const filteredConditions = useMemo(() => {
    const validModelSet = new Set(validModelIds);
    return conditions.filter((c) => {
      const ids = (c.model_ids ?? []).filter((id) => validModelSet.has(id));
      return ids.length === 0 || (!!selectedModelId && ids.includes(selectedModelId));
    });
  }, [conditions, selectedModelId, validModelIds]);

  const normalConditions = useMemo(() => filteredConditions.filter((c) => !c.is_rejected), [filteredConditions]);
  const rejectionReasons = useMemo(() => filteredConditions.filter((c) => c.is_rejected), [filteredConditions]);

  const rootCategories = useMemo(
    () => damageCategories.filter((c) => !c.parent_id && !c.parent_option_id),
    [damageCategories],
  );
  const subcategoriesByParent = useMemo(() => {
    const map: Record<string, DamageCategory[]> = {};
    for (const c of damageCategories) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      }
    }
    return map;
  }, [damageCategories]);

  const conditionalsByOption = useMemo(() => {
    const map: Record<string, DamageCategory[]> = {};
    for (const c of damageCategories) {
      if (c.parent_option_id) {
        if (!map[c.parent_option_id]) map[c.parent_option_id] = [];
        map[c.parent_option_id].push(c);
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
    }
    return map;
  }, [damageCategories]);

  // ── Build the linear question queue ──
  // We re-derive on every answers change so conditional sub-questions appear
  // immediately after the user picks the trigger option.
  const questions = useMemo<Question[]>(() => {
    const list: Question[] = [];

    const buildDamageQuestion = (cat: DamageCategory, depth: number): Question | null => {
      const opts = damageOptions.filter((o) => o.damage_category_id === cat.id);
      if (opts.length === 0) return null;
      return {
        kind: "damage",
        id: cat.id,
        group: "damages",
        title: cat.name,
        subtitle:
          depth > 0 ? "Detalhe do defeito anterior" : "Selecione a opção que melhor descreve o estado.",
        icon: Wrench,
        category: cat,
        options: opts,
        depth,
      };
    };

    const pushDamageBranch = (cat: DamageCategory, depth: number) => {
      const q = buildDamageQuestion(cat, depth);
      if (q) list.push(q);
      // Conditional sub-questions tied to the option currently selected
      const selectedOptId = answers.damageOptionByCategory[cat.id];
      if (selectedOptId && conditionalsByOption[selectedOptId]) {
        for (const child of conditionalsByOption[selectedOptId]) {
          pushDamageBranch(child, depth + 1);
        }
      }
      // Static sub-categories (parent_id chain)
      const subs = subcategoriesByParent[cat.id] ?? [];
      for (const sub of subs) pushDamageBranch(sub, depth + 1);
    };

    for (const group of adminOrderedSubScreens) {
      if (group === "condition" && normalConditions.length > 0) {
        list.push({
          kind: "condition",
          id: "__condition__",
          group: "condition",
          title: "Como está a condição geral do aparelho?",
          subtitle: "Selecione a opção que melhor descreve o estado do seu aparelho.",
          icon: Sparkles,
          conditions: normalConditions,
        });
      } else if (group === "damages" && rootCategories.length > 0) {
        for (const cat of rootCategories) pushDamageBranch(cat, 0);
      } else if (group === "rejection" && rejectionReasons.length > 0) {
        list.push({
          kind: "rejection",
          id: "__rejection__",
          group: "rejection",
          title: "Algum desses problemas se aplica ao aparelho?",
          subtitle: "Se nenhum se aplica, basta avançar para finalizar.",
          icon: ShieldAlert,
          reasons: rejectionReasons,
        });
      }
    }

    return list;
  }, [
    adminOrderedSubScreens,
    normalConditions,
    rootCategories,
    rejectionReasons,
    damageOptions,
    answers.damageOptionByCategory,
    conditionalsByOption,
    subcategoriesByParent,
  ]);

  // Current question index. Clamp into range whenever the queue shrinks.
  const [qIdx, setQIdx] = useState(0);
  useEffect(() => {
    if (questions.length === 0) return;
    if (qIdx > questions.length - 1) setQIdx(questions.length - 1);
  }, [questions.length, qIdx]);

  // If literally nothing is registered, skip the checklist entirely.
  const triggeredEmptySubmit = useRef(false);
  useEffect(() => {
    if (
      adminOrderedSubScreens.length > 0 &&
      questions.length === 0 &&
      conditions.length === 0 &&
      damageCategoriesAll.length === 0 &&
      !triggeredEmptySubmit.current
    ) {
      triggeredEmptySubmit.current = true;
      onSubmit();
    }
  }, [questions, adminOrderedSubScreens, conditions, damageCategoriesAll, onSubmit]);

  const currentQ = questions[qIdx];

  // Notify parent of group changes so the wizard can adjust the price footer etc.
  useEffect(() => {
    if (currentQ) onSubScreenChange?.(currentQ.group);
  }, [currentQ?.group, currentQ, onSubScreenChange]);

  // Notify parent of granular progress (Pergunta X de Y)
  useEffect(() => {
    if (questions.length > 0) onProgressChange?.(qIdx + 1, questions.length);
    return () => onProgressChange?.(0, 0);
  }, [qIdx, questions.length, onProgressChange]);

  // ── Selection helpers (with auto-advance) ──
  const ADVANCE_DELAY = 280; // ms — gives a beat of feedback before moving on
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  const scheduleAdvance = (intoFinal = false) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      if (intoFinal || qIdx >= questions.length - 1) {
        onSubmit();
      } else {
        setQIdx((i) => Math.min(i + 1, questions.length - 1));
      }
    }, ADVANCE_DELAY);
  };

  const cancelAdvance = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const handlePickCondition = (id: string) => {
    onAnswersChange({ ...answers, conditionId: id });
    scheduleAdvance();
  };

  const handlePickDamage = (catId: string, optId: string) => {
    const opt = damageOptions.find((o) => o.id === optId);
    const previousOptId = answers.damageOptionByCategory[catId];
    const nextMap = { ...answers.damageOptionByCategory, [catId]: optId };

    // Clear stale conditional descendants when switching options
    if (previousOptId && previousOptId !== optId) {
      const collectDescendantCatIds = (rootOptId: string): string[] => {
        const directCats = damageCategoriesAll
          .filter((c) => c.parent_option_id === rootOptId)
          .map((c) => c.id);
        const result = [...directCats];
        for (const cid of directCats) {
          const selectedChildOpt = nextMap[cid];
          if (selectedChildOpt) result.push(...collectDescendantCatIds(selectedChildOpt));
          const subCats = damageCategoriesAll.filter((c) => c.parent_id === cid).map((c) => c.id);
          result.push(...subCats);
        }
        return result;
      };
      for (const staleCatId of collectDescendantCatIds(previousOptId)) {
        nextMap[staleCatId] = null;
      }
    }

    onAnswersChange({ ...answers, damageOptionByCategory: nextMap });

    if (opt?.is_rejected) {
      cancelAdvance();
      const cat = damageCategories.find((c) => c.id === catId);
      const reason = `${cat?.name ?? "Defeito"}: ${opt.option_name}`;
      onReject(reason);
      setRejectionModal({ open: true, title: cat?.name ?? "Defeito", label: opt.option_name });
      return;
    }
    scheduleAdvance();
  };

  const handlePickRejection = (id: string) => {
    const rej = rejectionReasons.find((c) => c.id === id);
    onAnswersChange({ ...answers, rejectionId: id });
    if (rej) {
      cancelAdvance();
      onReject(rej.condition_name);
      setRejectionModal({ open: true, title: "Impedimento", label: rej.condition_name });
    }
  };

  const handleSkipRejection = () => {
    onAnswersChange({ ...answers, rejectionId: null });
    scheduleAdvance(true);
  };

  const handleClearRejection = () => {
    const next: ChecklistAnswers = { ...answers, rejectionId: null };
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

  const goPrev = () => {
    cancelAdvance();
    if (qIdx === 0) onBack();
    else setQIdx((i) => Math.max(0, i - 1));
  };

  const goNextManual = () => {
    cancelAdvance();
    if (qIdx >= questions.length - 1) onSubmit();
    else setQIdx((i) => Math.min(questions.length - 1, i + 1));
  };

  // Determine if the current question has been answered (so "Avançar" can be enabled).
  const currentAnswered = useMemo(() => {
    if (!currentQ) return false;
    if (currentQ.kind === "condition") return !!answers.conditionId;
    if (currentQ.kind === "damage") return !!answers.damageOptionByCategory[currentQ.id];
    return true; // rejection screen has its own primary action
  }, [currentQ, answers]);

  if (!currentQ) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Carregando avaliação…
      </div>
    );
  }

  const isLast = qIdx === questions.length - 1;
  const groupMeta = GROUP_META[currentQ.group];
  const Icon = currentQ.icon;

  return (
    <>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Avaliação do Aparelho
              </h2>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground tabular-nums">
              {qIdx + 1}/{questions.length}
            </span>
          </div>

          {/* Granular progress bar */}
          <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Group chip */}
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${groupMeta.tone}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-widest ${groupMeta.tone}`}>
              {groupMeta.label}
            </span>
            {currentQ.kind === "damage" && currentQ.depth > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground">
                · sub-pergunta
              </span>
            )}
          </div>
        </div>

        {/* Question body — keyed so animation re-runs on each question change */}
        <div key={currentQ.id} className="space-y-4 animate-fade-in">
          <div>
            <h3 className="text-base md:text-lg font-semibold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
              {currentQ.title}
              {currentQ.kind === "condition" && (
                <ConditionsHelp conditions={currentQ.conditions} />
              )}
              {currentQ.kind === "damage" && (
                <HelpExampleButton category={currentQ.category} />
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{currentQ.subtitle}</p>
          </div>

          {currentQ.kind === "condition" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.conditions.map((cond) => (
                <OptionCard
                  key={cond.id}
                  selected={answers.conditionId === cond.id}
                  onClick={() => handlePickCondition(cond.id)}
                  label={cond.condition_name}
                  help={cond.help_text}
                />
              ))}
            </div>
          )}

          {currentQ.kind === "damage" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt) => (
                <OptionCard
                  key={opt.id}
                  selected={answers.damageOptionByCategory[currentQ.id] === opt.id}
                  onClick={() => handlePickDamage(currentQ.id, opt.id)}
                  label={opt.option_name}
                  isReject={opt.is_rejected}
                  badge={
                    opt.is_rejected && showRejectLabel ? "Inviabiliza" : undefined
                  }
                />
              ))}
            </div>
          )}

          {currentQ.kind === "rejection" && (
            <div className="rounded-3xl bg-destructive/5 border border-destructive/15 p-5 space-y-2.5">
              {currentQ.reasons.map((rej) => {
                const isSelected = answers.rejectionId === rej.id;
                return (
                  <button
                    key={rej.id}
                    type="button"
                    onClick={() => handlePickRejection(rej.id)}
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
              <button
                type="button"
                onClick={handleSkipRejection}
                className="w-full text-center rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 p-4 text-sm font-medium text-primary transition-colors"
              >
                Nenhum desses se aplica — finalizar avaliação
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation — discreet, since auto-advance does most of the work */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={goPrev} className="rounded-full">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar
          </Button>
          {currentQ.kind !== "rejection" && (
            <Button
              size="sm"
              variant={currentAnswered ? "default" : "ghost"}
              onClick={goNextManual}
              disabled={!currentAnswered || isSubmitting}
              className="rounded-full"
            >
              {isLast ? (
                isSubmitting ? "Calculando..." : (
                  <>
                    Calcular <Send className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )
              ) : (
                <>
                  Avançar <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
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

// ── Reusable option card ──
function OptionCard({
  selected,
  onClick,
  label,
  badge,
  isReject,
  help,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
  isReject?: boolean;
  help?: string | null;
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
            ? "border-destructive bg-destructive/5 ring-2 ring-destructive/30 shadow-sm scale-[0.99]"
            : "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm scale-[0.99]"
          : "border-black/10 bg-card hover:border-black/20 hover:shadow-sm hover:scale-[1.01]"
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
          <span className="font-medium text-sm text-foreground flex items-center gap-1.5">
            {label}
            <HelpIcon text={help} />
          </span>
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

function HelpIcon({ text }: { text?: string | null }) {
  if (!text || !text.trim()) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function HelpExampleButton({ category }: { category: DamageCategory }) {
  const [open, setOpen] = useState(false);
  const hasImage = !!category.help_image_url;
  const hasText = !!(category.help_text && category.help_text.trim());
  if (!hasImage && !hasText) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
        aria-label="Ver exemplo"
      >
        {hasImage ? <ImageIcon className="h-3 w-3" /> : <Info className="h-3 w-3" />}
        Ver exemplo
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg tracking-tight">{category.name}</DialogTitle>
            {hasText && (
              <DialogDescription className="text-sm text-muted-foreground pt-1 whitespace-pre-line">
                {category.help_text}
              </DialogDescription>
            )}
          </DialogHeader>
          {hasImage && (
            <div className="rounded-2xl overflow-hidden border border-black/5 bg-muted/20">
              <img
                src={category.help_image_url!}
                alt={`Exemplo: ${category.name}`}
                loading="lazy"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConditionsHelp({ conditions }: { conditions: ConditionRow[] }) {
  const withHelp = conditions.filter((c) => c.help_text && c.help_text.trim());
  if (withHelp.length === 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Ajuda sobre as condições"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed space-y-1.5">
          {withHelp.map((c) => (
            <div key={c.id}>
              <strong className="font-semibold">{c.condition_name}:</strong> {c.help_text}
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
