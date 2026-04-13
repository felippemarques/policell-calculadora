import { useState, useMemo } from "react";
import { Search, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { WizardData } from "./TradeInWizard";
import type { Database } from "@/integrations/supabase/types";

type Device = Database["public"]["Tables"]["devices"]["Row"];

interface Props {
  data: WizardData;
  devices: Device[];
  onChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSelectDevice({ data, devices, onChange, onNext, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const selectedDevice = devices.find((d) => d.id === data.deviceId) || null;

  const filtered = useMemo(() => {
    if (!query.trim()) return devices;
    const q = query.toLowerCase();
    return devices.filter(
      (d) =>
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.storage.toLowerCase().includes(q) ||
        `${d.brand} ${d.model} ${d.storage}`.toLowerCase().includes(q)
    );
  }, [query, devices]);

  const isValid = !!data.deviceId;

  return (
    <div className="space-y-6">
      {/* Device selector card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Selecionar Dispositivo</h2>
        </div>

        {selectedDevice ? (
          <>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedDevice.brand}</p>
                <p className="text-lg font-bold text-foreground">{selectedDevice.model}</p>
                <p className="text-sm text-muted-foreground">{selectedDevice.storage}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-primary">
                  R$ {selectedDevice.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <button
                  onClick={() => onChange({ deviceId: "" })}
                  className="h-8 w-8 rounded-md border border-destructive/30 bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por marca, modelo ou armazenamento..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            {isFocused && filtered.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filtered.map((d) => (
                  <button
                    key={d.id}
                    onMouseDown={() => {
                      onChange({ deviceId: d.id });
                      setQuery("");
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-accent/10 transition-colors flex justify-between items-center border-b border-border last:border-0"
                  >
                    <div>
                      <span className="text-xs text-muted-foreground uppercase">{d.brand}</span>
                      <p className="text-sm font-medium text-foreground">
                        {d.model} — {d.storage}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      R$ {d.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          Próximo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
