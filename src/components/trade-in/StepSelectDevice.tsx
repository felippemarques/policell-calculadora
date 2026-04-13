import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { WizardData } from "./TradeInWizard";
import type { Database } from "@/integrations/supabase/types";

type Device = Database["public"]["Tables"]["devices"]["Row"];
type Condition = Database["public"]["Tables"]["condition_discounts"]["Row"];

interface Props {
  data: WizardData;
  devices: Device[];
  conditions: Condition[];
  onChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSelectDevice({ data, devices, conditions, onChange, onNext, onBack }: Props) {
  const models = useMemo(() => {
    const unique = [...new Set(devices.map((d) => d.model))];
    return unique.sort();
  }, [devices]);

  const selectedModel = devices.find((d) => d.id === data.deviceId)?.model || "";

  const storageOptions = useMemo(() => {
    return devices.filter((d) => d.model === selectedModel);
  }, [devices, selectedModel]);

  const handleModelChange = (model: string) => {
    const first = devices.find((d) => d.model === model);
    if (first) onChange({ deviceId: first.id });
  };

  const availableConditions = conditions.filter((c) => !c.is_rejected);
  const isValid = data.deviceId && data.condition;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>Modelo do aparelho</Label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModel && storageOptions.length > 1 && (
          <div className="space-y-2">
            <Label>Armazenamento</Label>
            <Select value={data.deviceId} onValueChange={(id) => onChange({ deviceId: id })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {storageOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.storage} — R$ {d.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Condição do aparelho</Label>
          <Select value={data.condition} onValueChange={(v) => onChange({ condition: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a condição" />
            </SelectTrigger>
            <SelectContent>
              {availableConditions.map((c) => (
                <SelectItem key={c.id} value={c.condition_name}>
                  {c.condition_name} (−{c.discount_percentage}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={onNext} disabled={!isValid} className="flex-1">
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
