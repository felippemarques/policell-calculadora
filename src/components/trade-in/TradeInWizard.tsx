import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDevices, resolveBasePrice } from "@/hooks/use-trade-in-data";
import { useFlowSettings } from "@/hooks/use-flow-settings";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { useSubmitEvaluation, DuplicateImeiError } from "@/hooks/use-submit-evaluation";
import { useLead } from "@/hooks/use-lead";
import { StepImei } from "./StepImei";
// StepTerms foi unificado ao StepContractPreview (LGPD + contrato em um único documento).
import { StepChooseFlow, type FlowType } from "./StepChooseFlow";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepSelectDevice } from "./StepSelectDevice";
import {
  StepEvaluationChecklist,
  type SubScreen,
} from "./StepEvaluationChecklist";
import { StepResult } from "./StepResult";
import { StepSpecialOffer } from "./StepSpecialOffer";
import { StepAddress, type AddressData } from "./StepAddress";
import { StepContractPreview } from "./StepContractPreview";
import { RestartProposalButton } from "./RestartProposalButton";
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
  flowType: FlowType | null;
  name: string;
  email: string;
  phone: string;
  deviceId: string;
  /** Selected color id (informational only — does not affect price). null until chosen. */
  colorId: string | null;
  /** IMEI (15 digits, validated locally + server-side). */
  imei: string;
  answers: ChecklistAnswers;
  address: AddressData;
}

const emptyAddress = (): AddressData => ({
  zip: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
});

// ── Persistence ──
const STORAGE_KEY = "pollicell.tradein.progress.v3";
const RESULT_STEP = 9;

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
    if (parsed.step >= RESULT_STEP) return null;
    return {
      step: parsed.step,
      subScreen: (parsed.subScreen as SubScreen) ?? "condition",
      data: {
        flowType: (parsed.data?.flowType as FlowType | null) ?? null,
        name: parsed.data?.name ?? "",
        email: parsed.data?.email ?? "",
        phone: parsed.data?.phone ?? "",
        deviceId: parsed.data?.deviceId ?? "",
        colorId: parsed.data?.colorId ?? null,
        imei: parsed.data?.imei ?? "",
        answers: parsed.data?.answers ?? emptyAnswers(),
        address: parsed.data?.address ?? emptyAddress(),
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
      flowType: null,
      name: "",
      email: "",
      phone: "",
      deviceId: "",
      colorId: null,
      imei: "",
      answers: emptyAnswers(),
      address: emptyAddress(),
    },
  );

  const { data: devices, isLoading: loadingDevices } = useDevices();
  const { data: flowSettings, isLoading: loadingFlowSettings } = useFlowSettings();
  const { data: businessSettings } = useBusinessSettings();
  const { submit, isSubmitting, result, setResult } = useSubmitEvaluation();
  const { leadId, setLeadId, createLead, upsertLeadByEmail, updateLead, updateAssessment, markRejected, setImei } = useLead();

  const [imeiServerError, setImeiServerError] = useState<string | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [acceptedContract, setAcceptedContract] = useState<{
    text: string;
    storeName: string;
    flowLabel: string;
    acceptedAt: Date;
  } | null>(null);

  // Restore the saved leadId into the useLead hook on first mount
  useEffect(() => {
    if (persisted?.leadId) {
      setLeadId(persisted.leadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flowSettings) return;

    if (flowSettings.onlyEnabled) {
      if (data.flowType !== flowSettings.onlyEnabled) {
        setData((prev) => ({ ...prev, flowType: flowSettings.onlyEnabled }));
      }
      if (step === 0) setStep(1);
      return;
    }

    if (
      flowSettings.trade.enabled &&
      flowSettings.sale.enabled &&
      data.flowType === null &&
      step !== 0
    ) {
      setStep(0);
    }
  }, [flowSettings, step, data.flowType]);

  // Catalog-sync guard
  useEffect(() => {
    if (!devices || devices.length === 0) return;
    if (!data.deviceId) return;
    const stillExists = devices.some((d) => d.id === data.deviceId);
    if (!stillExists) {
      setData((prev) => ({
        ...prev,
        deviceId: "",
        colorId: null,
        answers: emptyAnswers(),
      }));
      if (step > 2) setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  // Persist progress on every meaningful change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step >= RESULT_STEP) return;
    try {
      const snapshot: PersistedState = { step, subScreen, data, leadId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota exceeded — silently ignore */
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

  const { data: validBrandIds = [] } = useQuery({
    queryKey: ["valid_brand_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id");
      if (error) throw error;
      return (data ?? []).map((b: any) => b.id as string);
    },
  });

  const isLoading = loadingDevices || loadingFlowSettings;

  // Step labels — IMPORTANTE: índices alinhados com setStep abaixo.
  // 0 Negociação · 1 Seus Dados · 2 Aparelho · 3 Avaliação · 4 Cupom · 5 IMEI · 6 (DEPRECATED) · 7 Endereço · 8 Contrato · 9 Resultado
  const steps = [
    "Negociação",
    "Seus Dados",
    "Seu Aparelho",
    "Avaliação",
    "Cupom Especial",
    "IMEI",
    "—",
    "Endereço",
    "Contrato",
    "Resultado",
  ];

  const selectedDevice = useMemo(
    () => devices?.find((d) => d.id === data.deviceId),
    [devices, data.deviceId],
  );
  const basePrice = resolveBasePrice(selectedDevice as any, data.flowType);

  const { data: selectedModelId = null } = useQuery({
    queryKey: ["selected-device-model-id", data.deviceId],
    enabled: !!data.deviceId,
    queryFn: async () => {
      const { data: ms, error } = await supabase
        .from("model_storages")
        .select("model_id")
        .eq("id", data.deviceId)
        .maybeSingle();
      if (error) throw error;
      return ms?.model_id ?? null;
    },
  });

  const pricing = useMemo(
    () => computePricing(basePrice, data.answers, conditions, damageOptions, damageCategories),
    [basePrice, data.answers, conditions, damageOptions, damageCategories],
  );

  // Laudo dinâmico — lista explícita do que o cliente declarou na avaliação,
  // injetada no contrato para garantir transparência total.
  const evaluationItems = useMemo(() => {
    const items: { group: string; answer: string; impact: string }[] = [];

    if (data.answers.conditionId) {
      const cond = conditions.find((c) => c.id === data.answers.conditionId);
      if (cond) {
        const mode = (cond.discount_mode as string) || "percent";
        let impact = "";
        if (mode === "fixed") {
          const v = Number(cond.discount_fixed) || 0;
          if (v > 0) impact = `− ${formatBRL(v)}`;
        } else {
          const p = Number(cond.discount_percentage) || 0;
          if (p > 0) impact = `− ${p}% sobre o valor base`;
        }
        items.push({
          group: "Estado de conservação",
          answer: cond.condition_name,
          impact,
        });
      }
    }

    for (const [catId, optId] of Object.entries(data.answers.damageOptionByCategory)) {
      if (!optId) continue;
      const opt = damageOptions.find((o) => o.id === optId);
      const cat = damageCategories.find((c) => c.id === catId);
      if (!opt || !cat) continue;
      let impact = "";
      if (opt.is_rejected) {
        impact = "Bloqueia avaliação";
      } else {
        const mode = (opt.deduction_mode as string) || "fixed";
        if (mode === "percent") {
          const p = Number(opt.deduction_percent) || 0;
          if (p > 0) impact = `− ${p}% sobre o valor base`;
        } else {
          const v = Number(opt.deduction_value) || 0;
          if (v > 0) impact = `− ${formatBRL(v)}`;
        }
      }
      items.push({ group: cat.name, answer: opt.option_name, impact });
    }

    if (data.answers.rejectionId) {
      const rej = conditions.find((c) => c.id === data.answers.rejectionId);
      if (rej) {
        items.push({
          group: "Restrição declarada",
          answer: rej.condition_name,
          impact: "Bloqueia avaliação",
        });
      }
    }

    return items;
  }, [data.answers, conditions, damageOptions, damageCategories]);

  // Define se a tela "Cupom Especial" deve aparecer.
  const upgradeBonusPercent = businessSettings?.upgradeBonusPercent ?? 0;
  const showSpecialOffer =
    data.flowType === "trade" && upgradeBonusPercent > 0 && pricing.finalValue > 0 && !pricing.isRejected;

  // ── Handlers ──
  const handleChooseFlow = (type: FlowType) => {
    setData((prev) => ({ ...prev, flowType: type }));
    if (leadId) {
      updateAssessment(leadId, { ...(data.answers as any), flow_type: type });
    }
    setStep(1);
  };

  const handleCreateLead = async () => {
    const id = await createLead({
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
    });
    if (id && data.flowType) {
      await updateAssessment(id, { ...(data.answers as any), flow_type: data.flowType });
    }
    return id;
  };

  const handleSocialAutofill = async (info: { name: string; email: string; phone: string }) => {
    const id = await upsertLeadByEmail({
      customer_name: info.name,
      customer_email: info.email,
      customer_phone: info.phone,
    });
    if (!id) return;
    setData((prev) => ({ ...prev, name: info.name, email: info.email, phone: info.phone }));
    setStep(2);
  };

  const handleDeviceSelected = async () => {
    if (leadId && data.deviceId) {
      await updateLead(leadId, { device_id: data.deviceId });
      await updateAssessment(leadId, {
        ...(data.answers as any),
        selectedColorId: data.colorId ?? null,
        flow_type: data.flowType,
      });
    }
    setStep(3);
  };

  useEffect(() => {
    if (!leadId || step !== 3) return;
    const timer = setTimeout(() => {
      updateAssessment(leadId, { ...(data.answers as any), flow_type: data.flowType });
    }, 400);
    return () => clearTimeout(timer);
  }, [leadId, step, data.answers, data.flowType, updateAssessment]);

  const handleSubScreenChange = useCallback(
    (next: SubScreen) => {
      setSubScreen(next);
      if (leadId) {
        updateAssessment(leadId, { ...(data.answers as any), flow_type: data.flowType });
      }
    },
    [leadId, data.answers, data.flowType, updateAssessment],
  );

  const handleAnswersChange = (next: ChecklistAnswers) => {
    setData((prev) => ({ ...prev, answers: next }));
  };

  const handleReject = async (reason: string) => {
    if (!leadId) return;
    await markRejected(leadId, reason);
  };

  const sanity = useMemo(
    () =>
      validateTradeInState({
        device: selectedDevice,
        brandId: selectedDevice?.brand_id ?? null,
        answers: data.answers,
        conditions,
        damageOptions,
        damageCategories,
        validBrandIds,
      }),
    [selectedDevice, data.answers, conditions, damageOptions, damageCategories, validBrandIds],
  );

  // Após o checklist, decide se vai para Cupom Especial (4) ou direto para IMEI (5).
  const handleChecklistDone = () => {
    if (!selectedDevice) return;
    if (!sanity.ok) {
      toast.error(
        sanity.reason ??
          "Detectamos uma mudança na sua seleção. Reinicie a avaliação para garantir o preço correto.",
      );
      setStep(RESULT_STEP);
      return;
    }
    setImeiServerError(null);
    if (showSpecialOffer) {
      setStep(4);
    } else {
      setStep(5);
    }
  };

  const handleConfirmImei = async (imei: string) => {
    if (!selectedDevice) return;
    setImeiServerError(null);

    if (leadId) {
      try {
        await setImei(leadId, imei);
      } catch (e: any) {
        const msg = e?.message?.includes("IMEI inv")
          ? "IMEI inválido. Confira os números e tente novamente."
          : "Não foi possível registrar o IMEI agora. Tente novamente.";
        setImeiServerError(msg);
        return;
      }
    }

    setData((prev) => ({ ...prev, imei }));
    // Pula direto para o endereço — termos LGPD foram unificados ao contrato.
    setStep(7);
  };

  // (deprecated) handleAcceptTerms — termos foram unificados ao contrato.

  // Endereço salvo -> avança para Contrato
  const handleAddressConfirmed = async (address: AddressData) => {
    setData((prev) => ({ ...prev, address }));
    if (leadId) {
      try {
        const { error } = await (supabase.rpc as any)("update_lead_address", {
          _lead_id: leadId,
          _zip: address.zip,
          _street: address.street,
          _number: address.number,
          _complement: address.complement,
          _neighborhood: address.neighborhood,
          _city: address.city,
          _state: address.state,
        });
        if (error) console.warn("Falha ao salvar endereço:", error);
      } catch (err) {
        console.warn("Falha ao salvar endereço:", err);
      }
    }
    setStep(8);
  };

  // Contrato aceito -> registra aceite + submete avaliação (gera cupom)
  const handleAcceptContract = async (
    rendered?: { text: string; storeName: string; flowLabel: string; acceptedAt: Date },
  ) => {
    if (!selectedDevice) return;

    if (leadId) {
      try {
        const { data: versionRow } = await supabase
          .from("lp_settings")
          .select("value")
          .eq("key", "terms_version")
          .maybeSingle();

        const { error } = await (supabase.rpc as any)("accept_lead_contract", {
          _lead_id: leadId,
          _version: versionRow?.value?.trim() || "v1",
        });
        if (error) console.warn("Falha ao registrar aceite do contrato:", error);
      } catch (err) {
        console.warn("Falha ao registrar aceite do contrato:", err);
      }
    }

    const damageStrings: string[] = [];
    if (data.answers.conditionId) damageStrings.push(`condition:${data.answers.conditionId}`);
    for (const [catId, optId] of Object.entries(data.answers.damageOptionByCategory)) {
      if (optId) damageStrings.push(`damage:${catId}:${optId}`);
    }

    try {
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
        flowType: data.flowType ?? "trade",
        imei: data.imei,
      });
    } catch (e: any) {
      if (e instanceof DuplicateImeiError) {
        setImeiServerError(
          `Já existe uma proposta ativa para este IMEI no fluxo de ${
            data.flowType === "sale" ? "venda" : "troca"
          }. Use outro aparelho ou fale com um especialista.`,
        );
        setStep(5);
        return;
      }
      toast.error("Não foi possível concluir a proposta. Tente novamente.");
      return;
    }

    if (leadId) {
      await updateLead(leadId, { status: "completed" });
    }

    if (rendered) setAcceptedContract(rendered);
    clearPersisted();
    setStep(RESULT_STEP);
  };

  const handleReset = () => {
    clearPersisted();
    setData({
      flowType: null,
      name: "",
      email: "",
      phone: "",
      deviceId: "",
      colorId: null,
      imei: "",
      answers: emptyAnswers(),
      address: emptyAddress(),
    });
    setResult(null);
    setLeadId(null);
    setImeiServerError(null);
    setAcceptedContract(null);
    setStep(0);
    setSubScreen("condition");
  };

  const handleRestartProposal = () => {
    const goToFlowChoice =
      !!flowSettings && flowSettings.trade.enabled && flowSettings.sale.enabled;
    setData((prev) => ({
      ...prev,
      flowType: goToFlowChoice ? null : prev.flowType,
      deviceId: "",
      colorId: null,
      imei: "",
      answers: emptyAnswers(),
      address: emptyAddress(),
    }));
    setResult(null);
    setImeiServerError(null);
    setSubScreen("condition");
    setStep(goToFlowChoice ? 0 : 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (flowSettings && !flowSettings.anyEnabled) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-10 text-center">
        <p className="text-muted-foreground">A calculadora está temporariamente indisponível.</p>
      </div>
    );
  }

  // Quando só um fluxo está habilitado, esconde passo 0 -> total visível diminui em 1.
  const flowChoiceHidden = flowSettings?.onlyEnabled !== null && flowSettings?.onlyEnabled !== undefined;
  // Total possível: 8 visíveis (0..8 menos o passo 6 desativado).
  // Sem escolha de fluxo: -1. Sem oferta especial (passo 4): -1.
  const baseTotal = flowChoiceHidden ? 7 : 8;
  const visibleStepsCount = baseTotal - (showSpecialOffer ? 0 : 1);
  const displayStepIndex = (() => {
    let s = step;
    if (flowChoiceHidden && s > 0) s -= 1;
    if (!showSpecialOffer && step > 4) s -= 1;
    if (step > 6) s -= 1; // passo 6 (Termos) foi removido
    return Math.max(0, s);
  })();
  const totalProgressSteps = visibleStepsCount; // resultado fica de fora
  const progressPct =
    step >= RESULT_STEP
      ? 100
      : Math.round(((displayStepIndex + 1) / (visibleStepsCount + 1)) * 100);

  const showPriceFooter =
    (businessSettings?.showRealtimeDeductions ?? true) &&
    step === 3 &&
    (subScreen === "condition" || subScreen === "damages") &&
    basePrice > 0;

  // Build contract data once (used by step 8)
  const deviceLabel = selectedDevice
    ? `${selectedDevice.brand} ${selectedDevice.model} ${selectedDevice.storage}`.trim()
    : "";
  const addrLine = (() => {
    const a = data.address;
    if (!a.street) return "—";
    const line1 = [a.street, a.number].filter(Boolean).join(", ");
    const line2 = [a.complement, a.neighborhood].filter(Boolean).join(" — ");
    const line3 = [a.city, a.state].filter(Boolean).join("/");
    const cep = a.zip ? `CEP ${a.zip.replace(/(\d{5})(\d{3})/, "$1-$2")}` : "";
    return [line1, line2, line3, cep].filter(Boolean).join(" · ");
  })();



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
        {step < RESULT_STEP && (
          <div className="h-1 w-full bg-muted/60 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
              aria-label={`Progresso: ${progressPct}%`}
            />
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-10 pb-6">
          {step < RESULT_STEP && (
            <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  {step === 3 && checklistProgress.total > 0
                    ? `Pergunta ${checklistProgress.current} de ${checklistProgress.total}`
                    : `Passo ${displayStepIndex + 1} de ${totalProgressSteps}`}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{steps[step]}</span>
              </div>
              {step >= 1 && step <= 8 && data.name && data.email && (
                <RestartProposalButton
                  prominent
                  onConfirm={handleRestartProposal}
                  onFullReset={handleReset}
                />
              )}
            </div>
          )}

          {step === 0 && <StepChooseFlow onChoose={handleChooseFlow} />}

          {step === 1 && (
            <StepPersonalInfo
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={() => setStep(2)}
              onCreateLead={handleCreateLead}
              onSocialAutofill={handleSocialAutofill}
            />
          )}
          {step === 2 && (
            <StepSelectDevice
              data={data as any}
              devices={devices || []}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleDeviceSelected}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepEvaluationChecklist
              answers={data.answers}
              onAnswersChange={handleAnswersChange}
              onSubmit={handleChecklistDone}
              onBack={() => setStep(2)}
              onSubScreenChange={handleSubScreenChange}
              onReject={handleReject}
              onResetAll={handleReset}
              isSubmitting={isSubmitting}
              basePrice={basePrice}
              selectedBrandId={selectedDevice?.brand_id ?? null}
              selectedModelId={selectedModelId}
              onProgressChange={(current, total) => setChecklistProgress({ current, total })}
            />
          )}
          {step === 4 && showSpecialOffer && (
            <StepSpecialOffer
              baseValue={pricing.finalValue}
              bonusPercent={upgradeBonusPercent}
              onBack={() => setStep(3)}
              onContinue={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <StepImei
              initialValue={data.imei}
              isSubmitting={isSubmitting}
              onBack={() => setStep(showSpecialOffer ? 4 : 3)}
              onConfirm={handleConfirmImei}
              serverError={imeiServerError}
              onClearServerError={() => setImeiServerError(null)}
              flowLabel={data.flowType === "sale" ? "Vender" : "Trocar"}
              estimatedValue={pricing.finalValue}
              flowType={data.flowType}
              upgradeBonusPercent={upgradeBonusPercent}
            />
          )}
          {/* Step 6 (Termos) foi unificado ao Contrato (step 8). */}
          {step === 7 && (
            <StepAddress
              initial={data.address}
              isSubmitting={false}
              onBack={() => setStep(5)}
              onConfirm={handleAddressConfirmed}
            />
          )}
          {step === 8 && (
            <StepContractPreview
              data={{
                storeName: "Pollicell",
                customerName: data.name,
                customerEmail: data.email,
                customerPhone: data.phone,
                customerAddress: addrLine,
                deviceLabel,
                imei: data.imei,
                basePrice: pricing.basePrice,
                deductions:
                  pricing.fixedDeductions +
                  Math.round(pricing.basePrice * (pricing.percentDiscount / 100) * 100) / 100,
                percentDiscount: pricing.percentDiscount,
                fixedDeductions: pricing.fixedDeductions,
                bonusPercent: data.flowType === "trade" ? upgradeBonusPercent : 0,
                finalValue: pricing.finalValue,
                flowLabel: data.flowType === "sale" ? "Venda" : "Troca",
                evaluationItems,
              }}
              isSubmitting={isSubmitting}
              onBack={() => setStep(7)}
              onAccept={handleAcceptContract}
            />
          )}
          {step === RESULT_STEP && (
            <div className="animate-fade-in">
              <StepResult
                result={result}
                onReset={handleReset}
                sanity={sanity}
                flowType={data.flowType}
                customerName={data.name}
                deviceLabel={deviceLabel}
                acceptedContractText={acceptedContract?.text ?? null}
                acceptedContractMeta={
                  acceptedContract
                    ? {
                        storeName: acceptedContract.storeName,
                        flowLabel: acceptedContract.flowLabel,
                        acceptedAt: acceptedContract.acceptedAt,
                      }
                    : null
                }
              />
            </div>
          )}
        </div>

        {/* Sticky price footer */}
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
                    {data.flowType === "sale" ? "Em dinheiro" : "Em crédito para troca"}
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
