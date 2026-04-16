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

export interface WizardData {
  name: string;
  email: string;
  phone: string;
  deviceId: string;
  answers: ChecklistAnswers;
}

export function TradeInWizard() {
  const [step, setStep] = useState(0);
  const [subScreen, setSubScreen] = useState<SubScreen>("condition");
  const [data, setData] = useState<WizardData>({
    name: "",
    email: "",
    phone: "",
    deviceId: "",
    answers: emptyAnswers(),
  });

  const { data: devices, isLoading: loadingDevices } = useDevices();
  const { submit, isSubmitting, result, setResult } = useSubmitEvaluation();
  const { leadId, setLeadId, createLead, updateLead, updateAssessment, markRejected } = useLead();

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

  const handleDeviceSelected = async () => {
    if (leadId && data.deviceId) {
      await updateLead(leadId, { device_id: data.deviceId });
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

  const handleSubmit = async () => {
    if (!selectedDevice) return;

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
    });

    if (leadId) {
      await updateLead(leadId, { status: "completed" });
    }

    setStep(3);
  };

  const handleReset = () => {
    setData({ name: "", email: "", phone: "", deviceId: "", answers: emptyAnswers() });
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
    <div id="calculadora" className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 mb-5 shadow-sm">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
          Calculadora Trade-in
        </h2>
        <p className="text-muted-foreground mt-2">Descubra quanto vale seu aparelho</p>
      </div>

      <div className="relative rounded-3xl bg-card shadow-lg border border-black/5 overflow-hidden">
        {step < 3 && (
          <div className="h-1 w-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              aria-label={`Progresso: ${progressPct}%`}
            />
          </div>
        )}

        <div className="p-6 md:p-10 pb-6">
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
          <div className="sticky bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 backdrop-blur-md px-6 md:px-10 py-4 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Valor Estimado
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Atualiza conforme você responde
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl md:text-2xl font-semibold tracking-tight text-foreground tabular-nums">
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
