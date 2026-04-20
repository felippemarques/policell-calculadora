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
  /** Brand id of the currently selected device — used to filter damage categories */
  selectedBrandId?: string | null;
  /** Model id of the currently selected device — used to filter rules by model */
  selectedModelId?: string | null;
}

export type SubScreen = "condition" | "damages" | "rejection";

const SUB_SCREEN_META: Record<SubScreen, { label: string; icon: typeof Sparkles }> = {
  condition: { label: "Categorias de Defeitos", icon: Sparkles },
  damages: { label: "Condições do Aparelho", icon: Wrench },
  rejection: { label: "Impedimentos", icon: ShieldAlert },
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
}: Props) {
  // Map between UI sub-screen ids and admin group ids (stored in lp_settings).
  // Reminder: UI labels were swapped — "condition" sub-screen now visually shows
  // "Categorias de Defeitos" (group `conditions`), and "damages" shows
  // "Condições do Aparelho" (group `defects`). The data sources are unchanged.
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

  // Ordered + visible sub-screens (drives the wizard navigation)
  const orderedSubScreens = useMemo<SubScreen[]>(() => {
    const order = groupsConfig?.order ?? ["conditions", "defects", "rejection"];
    const visible = groupsConfig?.visible ?? { conditions: true, defects: true, rejection: true };
    return order.filter((g) => visible[g]).map((g) => GROUP_TO_SUB_SCREEN[g]);
  }, [groupsConfig]);

  const [subScreen, setSubScreen] = useState<SubScreen>("condition");
  const [rejectionModal, setRejectionModal] = useState<{
    open: boolean;
    title: string;
    label: string;
  }>({ open: false, title: "", label: "" });

  // Sync initial sub-screen with the first visible one (in case admin disabled it)
  useEffect(() => {
    if (orderedSubScreens.length > 0 && !orderedSubScreens.includes(subScreen)) {
      setSubScreen(orderedSubScreens[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedSubScreens]);

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

  // ── Filter categories by selected device's brand AND model ──
  // Rules:
  //  - Root categories (parent_id null AND parent_option_id null): visible if
  //      brand_ids empty (global) OR contains selectedBrandId, AND
  //      model_ids empty (global) OR contains selectedModelId
  //  - Subcategories (parent_id): inherit visibility from their root ancestor
  //  - Conditional sub-questions (parent_option_id): inherit visibility from the category that owns the trigger option
  const damageCategories = useMemo(() => {
    if (damageCategoriesAll.length === 0) return [];

    const matchesScope = (c: DamageCategory) => {
      const brandIds = c.brand_ids ?? [];
      const modelIds = c.model_ids ?? [];
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

    // Walk up parent chain to find root, following both parent_id and parent_option_id
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
  }, [damageCategoriesAll, damageOptions, selectedBrandId, selectedModelId]);

  // Conditions (Tela A + rejections) filtered by model_ids (brand filter not used here today)
  const filteredConditions = useMemo(() => {
    return conditions.filter((c) => {
      const ids = c.model_ids ?? [];
      return ids.length === 0 || (!!selectedModelId && ids.includes(selectedModelId));
    });
  }, [conditions, selectedModelId]);

  const normalConditions = useMemo(() => filteredConditions.filter((c) => !c.is_rejected), [filteredConditions]);
  const rejectionReasons = useMemo(() => filteredConditions.filter((c) => c.is_rejected), [filteredConditions]);

  // ── Selection helpers ──
  const selectCondition = (id: string) => {
    onAnswersChange({ ...answers, conditionId: id });
  };

  const selectDamageOption = (catId: string, optId: string) => {
    const opt = damageOptions.find((o) => o.id === optId);
    const previousOptId = answers.damageOptionByCategory[catId];
    const nextMap = { ...answers.damageOptionByCategory, [catId]: optId };

    // If switching to a different option, clear answers of any conditional
    // sub-questions previously triggered by the OLD option (and recursively
    // their own descendants) so they don't keep contributing to the price.
    if (previousOptId && previousOptId !== optId) {
      const collectDescendantCatIds = (rootOptId: string): string[] => {
        const directCats = damageCategoriesAll
          .filter((c) => c.parent_option_id === rootOptId)
          .map((c) => c.id);
        const result = [...directCats];
        for (const cid of directCats) {
          // Each cat's selected option may itself trigger more conditionals
          const selectedChildOpt = nextMap[cid];
          if (selectedChildOpt) result.push(...collectDescendantCatIds(selectedChildOpt));
          // Also collect via parent_id chains
          const subCats = damageCategoriesAll.filter((c) => c.parent_id === cid).map((c) => c.id);
          result.push(...subCats);
        }
        return result;
      };
      for (const staleCatId of collectDescendantCatIds(previousOptId)) {
        nextMap[staleCatId] = null;
      }
    }

    const next: ChecklistAnswers = {
      ...answers,
      damageOptionByCategory: nextMap,
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
  // True root: no parent at all (neither parent_id nor parent_option_id)
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

  // Conditional sub-questions indexed by the option that triggers them
  const conditionalsByOption = useMemo(() => {
    const map: Record<string, DamageCategory[]> = {};
    for (const c of damageCategories) {
      if (c.parent_option_id) {
        if (!map[c.parent_option_id]) map[c.parent_option_id] = [];
        map[c.parent_option_id].push(c);
      }
    }
    // Keep stable display_order
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0),
      );
    }
    return map;
  }, [damageCategories]);

  // A required category that has no options is not actionable — exclude it.
  // Conditional sub-questions only count when their trigger option is currently selected.
  const requiredDamageCategories = useMemo(
    () =>
      damageCategories.filter((c) => {
        if (c.is_required === false) return false;
        if (!damageOptions.some((o) => o.damage_category_id === c.id)) return false;
        if (c.parent_option_id) {
          // active only if the trigger option is currently chosen in its owning category
          const triggerOpt = damageOptions.find((o) => o.id === c.parent_option_id);
          if (!triggerOpt) return false;
          const ownerCatId = triggerOpt.damage_category_id;
          return answers.damageOptionByCategory[ownerCatId] === c.parent_option_id;
        }
        return true;
      }),
    [damageCategories, damageOptions, answers.damageOptionByCategory],
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
    // Validate current screen before moving to the next visible one.
    if (subScreen === "condition") {
      const requireCondition =
        normalConditions.length > 0 && normalConditions.some((c) => c.is_required !== false);
      if (requireCondition && !conditionAnswered) {
        setMissingIds(new Set(["__condition__"]));
        toast.error("Selecione uma opção para continuar.");
        scrollToFirstMissing(["__condition__"]);
        return;
      }
    } else if (subScreen === "damages") {
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
    }
    setMissingIds(new Set());
    const idx = orderedSubScreens.indexOf(subScreen);
    const nextScreen = orderedSubScreens[idx + 1];
    if (nextScreen) setSubScreen(nextScreen);
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

  // ── Sub-screen navigation (dynamic based on admin order/visibility) ──
  const goPrev = () => {
    const idx = orderedSubScreens.indexOf(subScreen);
    const prevScreen = orderedSubScreens[idx - 1];
    if (prevScreen) setSubScreen(prevScreen);
    else onBack();
  };

  const isLastSubScreen = orderedSubScreens[orderedSubScreens.length - 1] === subScreen;
  const currentIdx = orderedSubScreens.indexOf(subScreen);
  const visibleSubScreensMeta = orderedSubScreens.map((key) => ({ key, ...SUB_SCREEN_META[key] }));

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

            {(() => {
              const renderCategory = (cat: DamageCategory, depth: number): JSX.Element | null => {
                const opts = damageOptions.filter((o) => o.damage_category_id === cat.id);
                const subs = subcategoriesByParent[cat.id] || [];
                if (opts.length === 0 && subs.length === 0) return null;

                const selectedId = answers.damageOptionByCategory[cat.id] ?? null;
                const isMissing = missingIds.has(cat.id);
                const isRequired = cat.is_required !== false;
                const hasMedia = !!(cat.help_image_url || (cat.help_text && cat.help_text.trim()));

                return (
                  <div
                    key={cat.id}
                    ref={(el) => {
                      cardRefs.current[cat.id] = el;
                    }}
                    style={depth > 0 ? { marginLeft: `${Math.min(depth, 2) * 12}px` } : undefined}
                    className={`rounded-3xl border p-5 md:p-6 shadow-sm transition-all ${
                      depth > 0 ? "bg-muted/30 border-dashed" : "bg-card border-black/5"
                    } ${
                      isMissing
                        ? "!border-destructive ring-2 ring-destructive/40 !bg-destructive/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        {depth > 0 && (
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            ↳ Sub-pergunta
                          </span>
                        )}
                        <span>{cat.name}</span>
                        {isRequired && opts.length > 0 && (
                          <span className="text-xs font-normal text-destructive" aria-label="obrigatório">
                            *
                          </span>
                        )}
                        {hasMedia && <HelpExampleButton category={cat} />}
                      </h4>
                      {isMissing && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive whitespace-nowrap">
                          Obrigatório
                        </span>
                      )}
                    </div>

                    {opts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {opts.map((opt) => {
                          const isSelected = selectedId === opt.id;
                          return (
                            <OptionCard
                              key={opt.id}
                              selected={isSelected}
                              onClick={() => {
                                if (isMissing) {
                                  const next = new Set(missingIds);
                                  next.delete(cat.id);
                                  setMissingIds(next);
                                }
                                selectDamageOption(cat.id, opt.id);
                              }}
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
                    )}

                    {/* Reveal conditional sub-questions tied to the currently-selected option */}
                    {selectedId && (conditionalsByOption[selectedId]?.length ?? 0) > 0 && (
                      <div className="mt-4 space-y-3 animate-fade-in">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                          ↳ Por favor, responda também:
                        </p>
                        {conditionalsByOption[selectedId].map((cond) =>
                          renderCategory(cond, depth + 1),
                        )}
                      </div>
                    )}

                    {subs.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {subs.map((sub) => renderCategory(sub, depth + 1))}
                      </div>
                    )}
                  </div>
                );
              };

              return rootCategories.map((cat) => renderCategory(cat, 0));
            })()}
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
              onClick={handleNextClick}
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

// ── Inline "?" tooltip with help text ──
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

// ── "Ver Exemplo" button → opens dialog with help image + text ──
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

// Aggregates help text from all conditions into a single tooltip on the screen heading
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
