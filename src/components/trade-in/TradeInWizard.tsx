import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDevices } from "@/hooks/use-trade-in-data";
import { useSubmitEvaluation } from "@/hooks/use-submit-evaluation";
import { useLead } from "@/hooks/use-lead";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepSelectDevice } from "./StepSelectDevice";
import {
  StepEvaluationChecklist,
  type SubScreen,
} from "./StepEvaluationChecklist";
import { StepResult } from "./StepResult";
import { Smartphone, TrendingUp } from "lucide-react";
import {
  ChecklistAnswers,
  ConditionRow,
  DamageOption,
  DamageCategory,
  computePricing,
  emptyAnswers,
  formatBRL,
} from "@/lib/trade-in-pricing";
import { validateTradeInState } from "@/lib/trade-in-sanity";
import { toast } from "sonner";

export interface WizardData {
  name: string;
  email: string;
  phone: string;
  deviceId: string;
  /** Selected color id (informational only — does not affect price). null until chosen. */
  colorId: string | null;
  answers: ChecklistAnswers;
}

// ── Persistence ──
// Saves the wizard progress (step + sub-screen + data + leadId) in localStorage
// so the user can refresh the page or come back later and resume exactly
// where they were. Cleared on submit success or reset.
const STORAGE_KEY = "pollicell.tradein.progress.v1";

interface PersistedState {
  step: number;
  subScreen: SubScreen;
  data: WizardData;
  leadId: string | null;
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (typeof parsed?.step !== "number") return null;
    // Never resume on the result screen — that one belongs to a finished flow.
    if (parsed.step >= 3) return null;
    return {
      step: parsed.step,
      subScreen: (parsed.subScreen as SubScreen) ?? "condition",
      data: {
        name: parsed.data?.name ?? "",
        email: parsed.data?.email ?? "",
        phone: parsed.data?.phone ?? "",
        deviceId: parsed.data?.deviceId ?? "",
        colorId: parsed.data?.colorId ?? null,
        answers: parsed.data?.answers ?? emptyAnswers(),
      },
      leadId: parsed.leadId ?? null,
    };
  } catch {
    return null;
  }
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function TradeInWizard() {
  const persisted = useMemo(() => loadPersisted(), []);

  const [step, setStep] = useState(persisted?.step ?? 0);
  const [subScreen, setSubScreen] = useState<SubScreen>(persisted?.subScreen ?? "condition");
  const [data, setData] = useState<WizardData>(
    persisted?.data ?? {
      name: "",
      email: "",
      phone: "",
      deviceId: "",
      colorId: null,
      answers: emptyAnswers(),
    },
  );

  const { data: devices, isLoading: loadingDevices } = useDevices();
  const { submit, isSubmitting, result, setResult } = useSubmitEvaluation();
  const { leadId, setLeadId, createLead, upsertLeadByEmail, updateLead, updateAssessment, markRejected } = useLead();

  // Restore the saved leadId into the useLead hook on first mount
  useEffect(() => {
    if (persisted?.leadId) {
      setLeadId(persisted.leadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress on every meaningful change
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't persist the result step — it's a terminal screen
    if (step >= 3) return;
    try {
      const snapshot: PersistedState = { step, subScreen, data, leadId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota exceeded or private mode — silently ignore */
    }
  }, [step, subScreen, data, leadId]);


  // Pull dynamic catalog for live pricing
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

  const isLoading = loadingDevices;

  const steps = ["Seus Dados", "Seu Aparelho", "Avaliação", "Resultado"];

  const selectedDevice = useMemo(
    () => devices?.find((d) => d.id === data.deviceId),
    [devices, data.deviceId],
  );
  const basePrice = selectedDevice?.base_price ?? 0;

  // ── Live pricing breakdown ──
  const pricing = useMemo(
    () => computePricing(basePrice, data.answers, conditions, damageOptions, damageCategories),
    [basePrice, data.answers, conditions, damageOptions, damageCategories],
  );

  // ── Lead handlers ──
  const handleCreateLead = async () => {
    const id = await createLead({
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
    });
    return id;
  };

  // Called by StepPersonalInfo when an OAuth login auto-filled the form.
  // Reuses an existing lead matching the email (so we don't duplicate) and
  // advances the wizard to the device-selection step.
  const handleSocialAutofill = async (info: { name: string; email: string; phone: string }) => {
    const id = await upsertLeadByEmail({
      customer_name: info.name,
      customer_email: info.email,
      customer_phone: info.phone,
    });
    if (!id) return;
    setData((prev) => ({ ...prev, name: info.name, email: info.email, phone: info.phone }));
    setStep(1);
  };

  const handleDeviceSelected = async () => {
    if (leadId && data.deviceId) {
      await updateLead(leadId, { device_id: data.deviceId });
      // Persist informational color choice into the lead's assessment_responses JSON
      await updateAssessment(leadId, {
        ...(data.answers as any),
        selectedColorId: data.colorId ?? null,
      });
    }
    setStep(2);
  };

  // Silent assessment update on every answers change (debounced via useEffect)
  useEffect(() => {
    if (!leadId || step !== 2) return;
    const timer = setTimeout(() => {
      updateAssessment(leadId, data.answers as any);
    }, 400);
    return () => clearTimeout(timer);
  }, [leadId, step, data.answers, updateAssessment]);

  // Force-flush the lead snapshot at every sub-screen transition
  const handleSubScreenChange = useCallback(
    (next: SubScreen) => {
      setSubScreen(next);
      if (leadId) {
        updateAssessment(leadId, data.answers as any);
      }
    },
    [leadId, data.answers, updateAssessment],
  );

  const handleAnswersChange = (next: ChecklistAnswers) => {
    setData((prev) => ({ ...prev, answers: next }));
  };

  const handleReject = async (reason: string) => {
    if (!leadId) return;
    await markRejected(leadId, reason);
  };

  // Live sanity check — recomputed on every state change so the price footer
  // and the result screen always reflect catalog truth.
  const sanity = useMemo(
    () =>
      validateTradeInState({
        device: selectedDevice,
        brandId: selectedDevice?.brand_id ?? null,
        answers: data.answers,
        conditions,
        damageOptions,
        damageCategories,
      }),
    [selectedDevice, data.answers, conditions, damageOptions, damageCategories],
  );

  const handleSubmit = async () => {
    if (!selectedDevice) return;

    // Last line of defense: refuse to persist if data is inconsistent.
    if (!sanity.ok) {
      toast.error(
        sanity.reason ??
          "Detectamos uma mudança na sua seleção. Reinicie a avaliação para garantir o preço correto.",
      );
      // Move to the result screen so the user sees the inconsistency banner + reset CTA
      setStep(3);
      return;
    }

    // Build legacy "damages" string array for evaluations table
    const damageStrings: string[] = [];
    if (data.answers.conditionId) damageStrings.push(`condition:${data.answers.conditionId}`);
    for (const [catId, optId] of Object.entries(data.answers.damageOptionByCategory)) {
      if (optId) damageStrings.push(`damage:${catId}:${optId}`);
    }

    await submit({
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      deviceId: data.deviceId,
      deviceCondition: pricing.isRejected ? "critical" : "normal",
      damages: damageStrings,
      basePrice: pricing.basePrice,
      conditionDiscount: pricing.percentDiscount,
      totalDeductions: pricing.fixedDeductions,
      finalValue: pricing.finalValue,
      leadId,
    });

    if (leadId) {
      await updateLead(leadId, { status: "completed" });
    }

    clearPersisted();
    setStep(3);
  };

  const handleReset = () => {
    clearPersisted();
    setData({ name: "", email: "", phone: "", deviceId: "", colorId: null, answers: emptyAnswers() });
    setResult(null);
    setLeadId(null);
    setStep(0);
    setSubScreen("condition");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalSteps = 3;
  const progressPct = step >= 3 ? 100 : Math.round(((step + 1) / (totalSteps + 1)) * 100);

  // Show sticky price footer on Telas A and B (not on rejection screen, and only on step 2)
  const showPriceFooter =
    step === 2 && (subScreen === "condition" || subScreen === "damages") && basePrice > 0;

  return (
    <div id="calculadora" className="w-full max-w-2xl mx-auto px-4 md:px-0">
      <div className="text-center mb-6 md:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-primary/10 mb-4 md:mb-5 shadow-sm">
          <Smartphone className="h-7 w-7 md:h-8 md:w-8 text-primary" />
        </div>
        <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground">
          Policell - Garantia de entrega e qualidade
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-2">Seu aparelho vale mais do que você imagina.</p>
      </div>

      <div className="relative rounded-2xl md:rounded-3xl bg-card shadow-lg border border-black/5 overflow-hidden">
        {step < 3 && (
          <div className="h-1 w-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              aria-label={`Progresso: ${progressPct}%`}
            />
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-10 pb-6">
          {step < 3 && (
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Passo {step + 1} de {totalSteps}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{steps[step]}</span>
            </div>
          )}

          {step === 0 && (
            <StepPersonalInfo
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={() => setStep(1)}
              onCreateLead={handleCreateLead}
              onSocialAutofill={handleSocialAutofill}
            />
          )}
          {step === 1 && (
            <StepSelectDevice
              data={data as any}
              devices={devices || []}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleDeviceSelected}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepEvaluationChecklist
              answers={data.answers}
              onAnswersChange={handleAnswersChange}
              onSubmit={handleSubmit}
              onBack={() => setStep(1)}
              onSubScreenChange={handleSubScreenChange}
              onReject={handleReject}
              onResetAll={handleReset}
              isSubmitting={isSubmitting}
              basePrice={basePrice}
              selectedBrandId={selectedDevice?.brand_id ?? null}
            />
          )}
          {step === 3 && result && (
            <div className="animate-fade-in">
              <StepResult result={result} onReset={handleReset} />
            </div>
          )}
        </div>

        {/* ───── Sticky price footer (telas A e B do checklist) ───── */}
        {showPriceFooter && (
          <div className="sticky bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 backdrop-blur-md px-4 sm:px-6 md:px-10 py-3 md:py-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Valor Estimado
                  </p>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">
                    Atualiza conforme você responde
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg md:text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {formatBRL(pricing.finalValue)}
                </p>
                {(pricing.percentDiscount > 0 || pricing.fixedDeductions > 0) && (
                  <p className="text-[10px] text-muted-foreground">
                    de {formatBRL(pricing.basePrice)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
