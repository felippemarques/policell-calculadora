import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Mail, Phone, User } from "lucide-react";
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
    <div className="animate-fade-in space-y-7">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Vamos começar
        </h3>
        <p className="text-sm text-muted-foreground">
          Em menos de 2 minutos você descobre quanto vale seu aparelho.
        </p>
      </div>

      <div className="space-y-5">
        <FieldWithIcon
          id="name"
          label="Nome completo"
          icon={<User className="h-4 w-4" />}
          placeholder="Seu nome"
          value={data.name}
          onChange={(v) => onChange({ name: v })}
        />
        <FieldWithIcon
          id="email"
          label="E-mail"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(v) => onChange({ email: v })}
        />
        <FieldWithIcon
          id="phone"
          label="Telefone / WhatsApp"
          icon={<Phone className="h-4 w-4" />}
          placeholder="(00) 00000-0000"
          value={data.phone}
          onChange={(v) => onChange({ phone: v })}
        />
      </div>

      <Button
        className="w-full h-14 rounded-full text-base font-semibold shadow-md hover:shadow-lg transition-all"
        onClick={handleNext}
        disabled={!isValid || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
          </>
        ) : (
          <>
            Começar avaliação <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Seus dados ficam seguros e são usados apenas para enviar sua oferta.
      </p>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

function FieldWithIcon({ id, label, icon, value, onChange, placeholder, type }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {icon}
        </div>
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 pl-11 rounded-2xl border-border/70 bg-background/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all"
        />
      </div>
    </div>
  );
}
