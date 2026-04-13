import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import type { WizardData } from "./TradeInWizard";

interface DamageCategory {
  id: string;
  name: string;
  damage_deductions: { deduction_value: number }[];
}

interface Props {
  data: WizardData;
  damageCategories: DamageCategory[];
  onChange: (data: Partial<WizardData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function StepDamageCheck({ data, damageCategories, onChange, onSubmit, onBack, isSubmitting }: Props) {
  const toggleDamage = (catId: string) => {
    const current = data.selectedDamages;
    const next = current.includes(catId)
      ? current.filter((id) => id !== catId)
      : [...current, catId];
    onChange({ selectedDamages: next });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground mb-2">
          Selecione os defeitos que seu aparelho possui (se houver):
        </p>

        <div className="space-y-3">
          {damageCategories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Checkbox
                checked={data.selectedDamages.includes(cat.id)}
                onCheckedChange={() => toggleDamage(cat.id)}
              />
              <div className="flex-1">
                <span className="font-medium text-sm">{cat.name}</span>
              </div>
              <span className="text-sm text-destructive font-medium">
                −R$ {cat.damage_deductions[0]?.deduction_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Calculando..." : "Calcular"}{" "}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
