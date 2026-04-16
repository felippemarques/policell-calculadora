import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { WizardData } from "./TradeInWizard";

interface Props {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onCreateLead: () => Promise<string | null>;
}

export function StepPersonalInfo({ data, onChange, onNext, onCreateLead }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const isValid = data.name.trim() && data.email.trim() && data.phone.trim();

  const handleNext = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    const id = await onCreateLead();
    setSubmitting(false);
    if (!id) {
      toast.error("Não foi possível salvar seus dados. Tente novamente.");
      return;
    }
    onNext();
  };

  return (
    <div className="bg-card rounded-3xl shadow-sm border border-black/5 p-8 md:p-10 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">Vamos começar</h3>
        <p className="text-sm text-muted-foreground">Precisamos de alguns dados para enviar sua oferta.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
          <Input
            id="name"
            placeholder="Seu nome"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="h-12 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            placeholder="(00) 00000-0000"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className="h-12 rounded-xl"
          />
        </div>
      </div>

      <Button
        className="w-full h-12 rounded-full text-base shadow-sm hover:shadow-md transition-shadow"
        onClick={handleNext}
        disabled={!isValid || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
          </>
        ) : (
          <>
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
