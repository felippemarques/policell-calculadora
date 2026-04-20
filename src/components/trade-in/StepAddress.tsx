import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Home } from "lucide-react";
import { toast } from "sonner";

export interface AddressData {
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface Props {
  initial: AddressData;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: (address: AddressData) => Promise<void> | void;
}

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function StepAddress({ initial, isSubmitting, onBack, onConfirm }: Props) {
  const [form, setForm] = useState<AddressData>(initial);
  const [cepLoading, setCepLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const cepDigits = form.zip.replace(/\D/g, "");
  const cepValid = cepDigits.length === 8;
  const isValid =
    cepValid &&
    form.street.trim().length > 0 &&
    form.number.trim().length > 0 &&
    form.neighborhood.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length === 2;

  // Auto-fetch ViaCEP when CEP is complete
  useEffect(() => {
    if (!cepValid) return;
    let cancel = false;
    (async () => {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();
        if (cancel) return;
        if (data?.erro) {
          toast.error("CEP não encontrado. Verifique e preencha manualmente.");
          return;
        }
        setForm((prev) => ({
          ...prev,
          street: prev.street || data.logradouro || "",
          neighborhood: prev.neighborhood || data.bairro || "",
          city: prev.city || data.localidade || "",
          state: prev.state || (data.uf || "").toUpperCase(),
        }));
      } catch {
        toast.error("Não conseguimos buscar o CEP agora. Preencha manualmente.");
      } finally {
        if (!cancel) setCepLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepDigits]);

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    await onConfirm({
      ...form,
      zip: cepDigits,
      state: form.state.toUpperCase(),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mx-auto">
          <Home className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Onde você está?
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Precisamos do seu endereço para finalizar o contrato e organizar a logística da
          troca/coleta do aparelho.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="zip" className="text-sm font-medium">CEP *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="zip"
              inputMode="numeric"
              placeholder="00000-000"
              value={maskCep(form.zip)}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
              maxLength={9}
              className="pl-10"
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Buscamos endereço automaticamente pelo CEP.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="state" className="text-sm font-medium">UF *</Label>
          <select
            id="state"
            value={form.state.toUpperCase()}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione…</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="street" className="text-sm font-medium">Rua / Logradouro *</Label>
          <Input
            id="street"
            placeholder="Ex.: Av. Paulista"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number" className="text-sm font-medium">Número *</Label>
          <Input
            id="number"
            placeholder="123"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complement" className="text-sm font-medium">Complemento</Label>
          <Input
            id="complement"
            placeholder="Apto, bloco, sala…"
            value={form.complement}
            onChange={(e) => setForm({ ...form, complement: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood" className="text-sm font-medium">Bairro *</Label>
          <Input
            id="neighborhood"
            placeholder="Bairro"
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium">Cidade *</Label>
          <Input
            id="city"
            placeholder="Cidade"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>

      {touched && !isValid && (
        <p className="text-xs text-destructive">
          Preencha CEP, rua, número, bairro, cidade e UF para continuar.
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="sm:w-auto w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              Continuar para o contrato <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
