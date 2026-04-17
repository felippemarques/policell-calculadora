import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { WizardData } from "./TradeInWizard";

interface Props {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onCreateLead: () => Promise<string | null>;
  /**
   * Called when a social login returned a name+email and we want the wizard to
   * ensure a lead exists (reusing existing one by email when possible) and
   * advance to the device-selection step.
   */
  onSocialAutofill?: (info: { name: string; email: string; phone: string }) => Promise<void>;
}

export function StepPersonalInfo({
  data,
  onChange,
  onNext,
  onCreateLead,
  onSocialAutofill,
}: Props) {
  const { signInWithGoogle, signInWithApple, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  const isValid = data.name.trim() && data.email.trim() && data.phone.trim();

  // ── Auto-fill from social session ──
  // When the user returns from an OAuth redirect, `user` becomes available.
  // If we don't have lead data yet, hydrate the form with what the provider
  // returned and (if a phone is also present) continue the funnel automatically.
  useEffect(() => {
    if (!user || autofilling) return;
    if (data.name && data.email) return; // user already typed their info

    const meta = (user.user_metadata ?? {}) as Record<string, any>;
    const name =
      meta.full_name ||
      meta.name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(" ").trim() ||
      "";
    const email = user.email ?? meta.email ?? "";
    const phone = (user.phone ?? meta.phone ?? "") as string;

    if (!name && !email) return;

    onChange({ name, email, phone });

    // If phone is missing, leave the user on this step to fill it in manually.
    if (!phone) {
      toast.success(`Bem-vindo, ${name.split(" ")[0] || "tudo certo"}! Confirme seu telefone.`);
      return;
    }

    // We have everything → create/link lead and advance.
    (async () => {
      setAutofilling(true);
      try {
        if (onSocialAutofill) {
          await onSocialAutofill({ name, email, phone });
        } else {
          await onCreateLead();
          onNext();
        }
      } finally {
        setAutofilling(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const handleSocial = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    const fn = provider === "google" ? signInWithGoogle : signInWithApple;
    const { error } = await fn(window.location.href);
    if (error) {
      toast.error(error.message || "Não foi possível autenticar.");
      setSocialLoading(null);
    }
    // On success the page redirects; loading state will be reset on remount.
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

      {/* ── Identificação Rápida ── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
          Identificação rápida
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            disabled={socialLoading !== null || autofilling}
            onClick={() => handleSocial("google")}
          >
            {socialLoading === "google" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Usar conta Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            disabled={socialLoading !== null || autofilling}
            onClick={() => handleSocial("apple")}
          >
            {socialLoading === "apple" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M16.365 1.43c0 1.14-.42 2.21-1.18 3.02-.85.94-2.21 1.66-3.34 1.57-.14-1.13.42-2.31 1.16-3.07.83-.86 2.27-1.5 3.36-1.52zM20.5 17.32c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.12 3.51-1.55.02-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.01-3.06-1.76-4.05-3.32-2.78-4.36-3.07-9.48-1.36-12.2 1.22-1.95 3.15-3.09 4.96-3.09 1.85 0 3.01 1.01 4.54 1.01 1.49 0 2.4-1.02 4.54-1.02 1.62 0 3.34.88 4.56 2.4-4.01 2.2-3.36 7.94.59 9.75z" />
              </svg>
            )}
            Usar conta Apple
          </Button>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-card px-2 text-muted-foreground">ou preencha manualmente</span>
          </div>
        </div>
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
        disabled={!isValid || submitting || autofilling}
      >
        {submitting || autofilling ? (
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
