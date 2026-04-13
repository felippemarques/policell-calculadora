import { useState } from "react";
import { useDevices, useDamageCategories, useConditionDiscounts } from "@/hooks/use-trade-in-data";
import { useSubmitEvaluation } from "@/hooks/use-submit-evaluation";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepSelectDevice } from "./StepSelectDevice";
import { StepDamageCheck } from "./StepDamageCheck";
import { StepResult } from "./StepResult";
import { Smartphone } from "lucide-react";

export interface WizardData {
  name: string;
  email: string;
  phone: string;
  deviceId: string;
  condition: string;
  selectedDamages: string[];
}

export function TradeInWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    name: "",
    email: "",
    phone: "",
    deviceId: "",
    condition: "",
    selectedDamages: [],
  });

  const { data: devices, isLoading: loadingDevices } = useDevices();
  const { data: damageCategories, isLoading: loadingDamages } = useDamageCategories();
  const { data: conditions, isLoading: loadingConditions } = useConditionDiscounts();
  const { submit, isSubmitting, result, setResult } = useSubmitEvaluation();

  const isLoading = loadingDevices || loadingDamages || loadingConditions;

  const steps = ["Seus Dados", "Seu Aparelho", "Condições", "Resultado"];

  const handleSubmit = async () => {
    if (!devices || !damageCategories || !conditions) return;

    const device = devices.find((d) => d.id === data.deviceId);
    if (!device) return;

    const condition = conditions.find((c) => c.condition_name === data.condition);
    if (!condition) return;

    const basePrice = device.base_price;
    const conditionDiscount = basePrice * (condition.discount_percentage / 100);

    let totalDeductions = 0;
    for (const catId of data.selectedDamages) {
      const cat = damageCategories.find((c) => c.id === catId);
      if (cat?.damage_deductions?.[0]) {
        totalDeductions += cat.damage_deductions[0].deduction_value;
      }
    }

    const finalValue = Math.max(0, basePrice - conditionDiscount - totalDeductions);

    await submit({
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      deviceId: data.deviceId,
      deviceCondition: data.condition,
      damages: data.selectedDamages,
      basePrice,
      conditionDiscount,
      totalDeductions,
      finalValue,
    });

    setStep(3);
  };

  const handleReset = () => {
    setData({ name: "", email: "", phone: "", deviceId: "", condition: "", selectedDamages: [] });
    setResult(null);
    setStep(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div id="calculadora" className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Smartphone className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Calculadora Trade-in</h2>
        <p className="text-muted-foreground mt-1">Descubra quanto vale seu aparelho</p>
      </div>

      {/* Progress bar */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-8">
          {steps.slice(0, 3).map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
              <p className={`text-xs mt-1 ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {step === 0 && (
        <StepPersonalInfo
          data={data}
          onChange={(d) => setData({ ...data, ...d })}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepSelectDevice
          data={data}
          devices={devices || []}
          conditions={conditions || []}
          onChange={(d) => setData({ ...data, ...d })}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepDamageCheck
          data={data}
          damageCategories={damageCategories || []}
          onChange={(d) => setData({ ...data, ...d })}
          onSubmit={handleSubmit}
          onBack={() => setStep(1)}
          isSubmitting={isSubmitting}
        />
      )}
      {step === 3 && result && (
        <StepResult
          result={result}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
