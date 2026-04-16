import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDevices } from "@/hooks/use-trade-in-data";
import { useSubmitEvaluation } from "@/hooks/use-submit-evaluation";
import { useLead } from "@/hooks/use-lead";
import { checklistItems } from "@/data/checklist";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepSelectDevice } from "./StepSelectDevice";
import { StepEvaluationChecklist } from "./StepEvaluationChecklist";
import { StepResult } from "./StepResult";
import { Smartphone } from "lucide-react";

const CONDITION_ITEM_ID = "__condition__";

export interface WizardData {
  name: string;
  email: string;
  phone: string;
  deviceId: string;
  checklistAnswers: Record<string, number | null>;
}

function initAnswers(): Record<string, number | null> {
  const init: Record<string, number | null> = {};
  checklistItems.forEach((item) => (init[item.id] = null));
  return init;
}

export function TradeInWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    name: "",
    email: "",
    phone: "",
    deviceId: "",
    checklistAnswers: initAnswers(),
  });

  const { data: devices, isLoading: loadingDevices } = useDevices();
  const { submit, isSubmitting, result, setResult } = useSubmitEvaluation();
  const { leadId, setLeadId, createLead, updateLead, updateAssessment, markRejected } = useLead();

  // Pull dynamic conditions for percent-discount calc on submit
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

  const isLoading = loadingDevices;

  const steps = ["Seus Dados", "Seu Aparelho", "Avaliação", "Resultado"];

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

  const handleAnswer = async (itemId: string, optionIndex: number) => {
    if (!leadId) return;
    const newResponses = { ...data.checklistAnswers, [itemId]: optionIndex };
    await updateAssessment(leadId, newResponses);
  };

  const handleReject = async (reason: string) => {
    if (!leadId) return;
    await markRejected(leadId, reason);
  };

  const handleSubmit = async () => {
    if (!devices) return;

    const device = devices.find((d) => d.id === data.deviceId);
    if (!device) return;

    const basePrice = device.base_price;

    let totalFixedDiscount = 0;
    let totalPercentDiscount = 0;
    let hasCriticalWarning = false;

    checklistItems.forEach((item) => {
      const idx = data.checklistAnswers[item.id];
      if (idx !== null && idx !== undefined) {
        const opt = item.options[idx];
        totalFixedDiscount += opt.discountFixed;
        totalPercentDiscount += opt.discountPercent;
        if (opt.isCritical) hasCriticalWarning = true;
      }
    });

    // Apply dynamic condition discount from DB (if selected)
    const condIdx = data.checklistAnswers[CONDITION_ITEM_ID];
    if (condIdx !== null && condIdx !== undefined && conditions[condIdx]) {
      const cond = conditions[condIdx];
      if (cond.is_rejected) {
        hasCriticalWarning = true;
      } else {
        totalPercentDiscount += Number(cond.discount_percentage) || 0;
      }
    }

    const afterFixed = Math.max(0, basePrice - totalFixedDiscount);
    const finalValue = Math.max(0, Math.round(afterFixed * (1 - totalPercentDiscount / 100) * 100) / 100);

    await submit({
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      deviceId: data.deviceId,
      deviceCondition: hasCriticalWarning ? "critical" : "normal",
      damages: Object.entries(data.checklistAnswers)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${k}:${v}`),
      basePrice,
      conditionDiscount: totalPercentDiscount,
      totalDeductions: totalFixedDiscount,
      finalValue,
    });

    if (leadId) {
      await updateLead(leadId, { status: "completed" });
    }

    setStep(3);
  };

  const handleReset = () => {
    setData({ name: "", email: "", phone: "", deviceId: "", checklistAnswers: initAnswers() });
    setResult(null);
    setLeadId(null);
    setStep(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Continuous progress (0..100)
  const totalSteps = 3; // Steps 0,1,2 (Result is final)
  const progressPct = step >= 3 ? 100 : Math.round(((step + 1) / (totalSteps + 1)) * 100);

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

      {/* Premium card wrapper */}
      <div className="relative rounded-3xl bg-card shadow-lg border border-black/5 overflow-hidden">
        {/* Continuous progress bar at top of card */}
        {step < 3 && (
          <div className="h-1 w-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              aria-label={`Progresso: ${progressPct}%`}
            />
          </div>
        )}

        <div className="p-6 md:p-10">
          {/* Step label */}
          {step < 3 && (
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Passo {step + 1} de {totalSteps}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {steps[step]}
              </span>
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
              data={data}
              devices={devices || []}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleDeviceSelected}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepEvaluationChecklist
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onSubmit={handleSubmit}
              onBack={() => setStep(1)}
              onAnswer={handleAnswer}
              onReject={handleReject}
              onResetAll={handleReset}
              isSubmitting={isSubmitting}
            />
          )}
          {step === 3 && result && (
            <div className="animate-fade-in">
              <StepResult result={result} onReset={handleReset} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
