import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, Phone, ShieldCheck } from "lucide-react";

interface Props {
  name: string;
  email: string;
  phone: string;
  initialCpf: string;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: (cpf: string) => Promise<void>;
}

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isValidCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (digits: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i);
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };
  return calc(d, 9) === parseInt(d[9]) && calc(d, 10) === parseInt(d[10]);
}

export function StepConfirmIdentity({
  name,
  email,
  phone,
  initialCpf,
  isSubmitting,
  onBack,
  onConfirm,
}: Props) {
  const [cpf, setCpf] = useState(initialCpf ? maskCpf(initialCpf) : "");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cpfDigits = cpf.replace(/\D/g, "");
  const cpfError =
    touched && cpfDigits.length > 0 && cpfDigits.length < 11
      ? "CPF incompleto."
      : touched && cpfDigits.length === 11 && !isValidCpf(cpf)
        ? "CPF inválido. Verifique os números."
        : null;

  const isReady = cpfDigits.length === 11 && isValidCpf(cpf);

  const handleSubmit = async () => {
    setTouched(true);
    if (!isReady) return;
    setSubmitting(true);
    try {
      await onConfirm(cpf);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isSubmitting || submitting;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Confirmar seus dados
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Confirme as informações abaixo e informe seu CPF para validação legal
          do contrato.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Nome</p>
            <p className="text-sm font-medium truncate">{name || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="text-sm font-medium truncate">{email || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="text-sm font-medium truncate">{phone || "—"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cpf-input" className="text-sm font-medium">
          CPF <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cpf-input"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(maskCpf(e.target.value))}
          onBlur={() => setTouched(true)}
          className={cpfError ? "border-destructive focus-visible:ring-destructive" : ""}
          disabled={busy}
          autoComplete="off"
        />
        {cpfError && (
          <p className="text-xs text-destructive">{cpfError}</p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={busy}
          className="sm:w-auto w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={handleSubmit}
          className="flex-1"
          size="lg"
        >
          Confirmar e continuar
        </Button>
      </div>
    </div>
  );
}
