import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck } from "lucide-react";

interface IdentityData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

interface Props {
  name: string;
  email: string;
  phone: string;
  initialCpf: string;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: (data: IdentityData) => Promise<void>;
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
  const [form, setForm] = useState<IdentityData>({
    name,
    email,
    phone,
    cpf: initialCpf ? maskCpf(initialCpf) : "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof IdentityData, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const cpfDigits = form.cpf.replace(/\D/g, "");

  const errors = {
    name: touched.name && !form.name.trim() ? "Informe seu nome." : null,
    email:
      touched.email && !form.email.trim()
        ? "Informe seu e-mail."
        : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
          ? "E-mail inválido."
          : null,
    phone: touched.phone && !form.phone.trim() ? "Informe seu telefone." : null,
    cpf:
      touched.cpf && cpfDigits.length === 0
        ? "Informe seu CPF para continuar."
        : touched.cpf && cpfDigits.length > 0 && cpfDigits.length < 11
          ? "CPF incompleto."
          : touched.cpf && cpfDigits.length === 11 && !isValidCpf(form.cpf)
            ? "CPF inválido. Verifique os números."
            : null,
  };

  const isReady =
    form.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.phone.trim().length > 0 &&
    cpfDigits.length === 11 &&
    isValidCpf(form.cpf);

  const touch = (field: keyof IdentityData) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async () => {
    setTouched({ name: true, email: true, phone: true, cpf: true });
    if (!isReady) return;
    setSubmitting(true);
    try {
      await onConfirm(form);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isSubmitting || submitting;

  const fieldClass = (err: string | null) =>
    err ? "border-destructive focus-visible:ring-destructive" : "";

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
          Verifique e corrija seus dados se necessário, depois informe seu CPF
          para validação legal do contrato.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ci-name" className="text-sm font-medium">
            Nome completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ci-name"
            placeholder="Seu nome completo"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            onBlur={() => touch("name")}
            className={fieldClass(errors.name)}
            disabled={busy}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ci-email" className="text-sm font-medium">
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ci-email"
            type="email"
            inputMode="email"
            placeholder="seuemail@exemplo.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            onBlur={() => touch("email")}
            className={fieldClass(errors.email)}
            disabled={busy}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ci-phone" className="text-sm font-medium">
            Telefone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ci-phone"
            type="tel"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            onBlur={() => touch("phone")}
            className={fieldClass(errors.phone)}
            disabled={busy}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ci-cpf" className="text-sm font-medium">
            CPF <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ci-cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => setForm((p) => ({ ...p, cpf: maskCpf(e.target.value) }))}
            onBlur={() => touch("cpf")}
            className={fieldClass(errors.cpf)}
            disabled={busy}
            autoComplete="off"
          />
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
        </div>
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
