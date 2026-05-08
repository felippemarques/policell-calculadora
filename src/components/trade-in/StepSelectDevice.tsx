import { useState, useMemo, useEffect } from "react";
import { Smartphone, Check, ArrowLeft, ArrowRight, ChevronRight, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useColorsByDevice, useBrandLogos } from "@/hooks/use-trade-in-data";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { hasAnyAnswers } from "@/lib/trade-in-sanity";
import { emptyAnswers } from "@/lib/trade-in-pricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type Phase = "brand" | "model" | "storage" | "color";

export function StepSelectDevice({ data, devices, onChange, onNext, onBack }: Props) {
  const { data: businessSettings } = useBusinessSettings();
  const showBasePrice = businessSettings?.showDeviceBasePrice ?? false;
  const selectedDevice = devices.find((d) => d.id === data.deviceId) || null;

  const [phase, setPhase] = useState<Phase>(
    data.colorId ? "color" : selectedDevice ? "color" : "brand",
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(selectedDevice?.brand ?? null);
  const [selectedModel, setSelectedModel] = useState<string | null>(selectedDevice?.model ?? null);

  // If parent clears the deviceId (e.g. catalog-sync removed a stale device),
  // snap the phase back to brand selection so the UI doesn't show "color"
  // with no device behind it.
  useEffect(() => {
    if (!data.deviceId && phase !== "brand") {
      setPhase("brand");
      setSelectedBrand(null);
      setSelectedModel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.deviceId]);

  // brands list
  const brands = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => set.add(d.brand));
    return Array.from(set).sort();
  }, [devices]);

  // brand logos (from `brands` table) — keyed lowercased
  const { data: brandLogos = [] } = useBrandLogos();
  const brandLogoMap = useMemo(() => {
    const m = new Map<string, string | null>();
    brandLogos.forEach((b) => m.set(b.name.trim().toLowerCase(), b.logo_url));
    return m;
  }, [brandLogos]);

  // models for selected brand (with their image, picked from the first variant)
  const models = useMemo(() => {
    if (!selectedBrand) return [] as { name: string; image_url: string | null }[];
    const map = new Map<string, string | null>();
    devices
      .filter((d) => d.brand === selectedBrand)
      .forEach((d) => {
        if (!map.has(d.model)) map.set(d.model, (d as any).image_url ?? null);
      });
    // Sort by model name DESC using natural numeric order so
    // "Iphone 16 Pro Max" > "Iphone 16 Pro" > "Iphone 15 Pro Max" > … > "Iphone 12".
    const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
    return Array.from(map.entries())
      .map(([name, image_url]) => ({ name, image_url }))
      .sort((a, b) => collator.compare(b.name, a.name));
  }, [devices, selectedBrand]);

  // storages for selected brand+model
  const storages = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    return devices
      .filter((d) => d.brand === selectedBrand && d.model === selectedModel)
      .sort((a, b) => a.base_price - b.base_price);
  }, [devices, selectedBrand, selectedModel]);

  // ── Colors registered for THIS specific device variant (model+storage) ──
  // Falls back to brand-level colors when the variant has no colors registered.
  const { data: colors = [], isLoading: loadingColors } = useColorsByDevice(
    selectedDevice?.id ?? null,
    selectedDevice?.brand_id ?? null,
  );
  const selectedColor = colors.find((c) => c.id === data.colorId) || null;

  // animate phase transition by remounting
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [phase]);

  // ── Reset-cascade with confirmation when answers exist ──
  // Pending change is staged here; when user confirms (or no answers exist), we apply it.
  const [pendingChange, setPendingChange] = useState<
    | { kind: "brand"; value: string }
    | { kind: "model"; value: string }
    | { kind: "storage"; deviceId: string }
    | null
  >(null);

  const answersDirty = hasAnyAnswers(data.answers);

  const applyChange = (change: NonNullable<typeof pendingChange>) => {
    if (change.kind === "brand") {
      setSelectedBrand(change.value);
      setSelectedModel(null);
      // Brand change → wipe device, color AND all checklist answers downstream
      onChange({ deviceId: "", colorId: null, answers: emptyAnswers() });
      setPhase("model");
    } else if (change.kind === "model") {
      setSelectedModel(change.value);
      // Model change → wipe storage, color AND all checklist answers downstream
      onChange({ deviceId: "", colorId: null, answers: emptyAnswers() });
      setPhase("storage");
    } else {
      // Storage change → switch device, wipe color AND restart the evaluation
      onChange({ deviceId: change.deviceId, colorId: null, answers: emptyAnswers() });
      setPhase("color");
    }
  };

  const requestChange = (change: NonNullable<typeof pendingChange>) => {
    // Detect "no-op" (clicking the already-selected option) to avoid the modal
    const noop =
      (change.kind === "brand" && change.value === selectedBrand) ||
      (change.kind === "model" && change.value === selectedModel) ||
      (change.kind === "storage" && change.deviceId === data.deviceId);
    if (noop) return;

    // Confirmation only matters when the user has already made checklist progress
    if (answersDirty) {
      setPendingChange(change);
    } else {
      applyChange(change);
    }
  };

  const handleBrandPick = (b: string) => requestChange({ kind: "brand", value: b });
  const handleModelPick = (m: string) => requestChange({ kind: "model", value: m });
  const handleStoragePick = (deviceId: string) => requestChange({ kind: "storage", deviceId });

  const handleColorPick = (colorId: string) => {
    onChange({ colorId });
  };

  // Validity: must have device + (color, if any color is available for this brand)
  const isValid = !!data.deviceId && (colors.length === 0 || !!data.colorId);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header with breadcrumbs */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Smartphone className="h-5 w-5" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Escolha seu aparelho
          </h3>
        </div>

        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <Crumb
            label={selectedBrand || "Marca"}
            active={phase === "brand"}
            done={!!selectedBrand}
            onClick={() => setPhase("brand")}
          />
          {selectedBrand && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Crumb
                label={selectedModel || "Modelo"}
                active={phase === "model"}
                done={!!selectedModel}
                onClick={() => selectedBrand && setPhase("model")}
              />
            </>
          )}
          {selectedModel && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Crumb
                label={selectedDevice?.storage || "Armazenamento"}
                active={phase === "storage"}
                done={!!selectedDevice}
                onClick={() => selectedModel && setPhase("storage")}
              />
            </>
          )}
          {selectedDevice && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Crumb
                label={selectedColor?.name || "Cor"}
                active={phase === "color"}
                done={!!selectedColor}
                onClick={() => selectedDevice && setPhase("color")}
              />
            </>
          )}
        </div>
      </div>

      {/* Phase content */}
      <div key={animKey} className="animate-fade-in min-h-[260px]">
        {phase === "brand" && (
          <PhaseGrid>
            {brands.length === 0 && <EmptyState message="Nenhuma marca disponível" />}
            {brands.map((b) => (
              <BrandCard
                key={b}
                label={b}
                logoUrl={brandLogoMap.get(b.trim().toLowerCase()) ?? null}
                selected={selectedBrand === b}
                onClick={() => handleBrandPick(b)}
              />
            ))}
          </PhaseGrid>
        )}

        {phase === "model" && (
          <>
            <BackLink label={`Trocar marca (${selectedBrand})`} onClick={() => setPhase("brand")} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {models.map((m) => (
                <ModelCard
                  key={m.name}
                  name={m.name}
                  imageUrl={m.image_url}
                  selected={selectedModel === m.name}
                  onClick={() => handleModelPick(m.name)}
                />
              ))}
            </div>
          </>
        )}

        {phase === "storage" && (
          <>
            <BackLink
              label={`Trocar modelo (${selectedModel})`}
              onClick={() => setPhase("model")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {storages.map((d) => {
                const isSel = data.deviceId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => handleStoragePick(d.id)}
                    className={`group w-full rounded-2xl px-5 py-3.5 border transition-all duration-200 text-left
                      ${
                        isSel
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
                          : "border-border bg-card hover:border-primary/40 hover:ring-2 hover:ring-primary/15"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-foreground">
                          {d.storage}
                        </span>
                        {showBasePrice && (
                          <span className="text-sm font-semibold text-primary">
                            R$ {d.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {isSel && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedDevice && (
              <div
                className={`mt-6 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-fast ${
                  showBasePrice
                    ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 shadow-md ring-1 ring-primary/10"
                    : "bg-primary/5 border border-primary/15"
                }`}
              >
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    {showBasePrice && <Sparkles className="h-3 w-3" />}
                    {showBasePrice ? "Oferta especial" : "Selecionado"}
                  </p>
                  <p className="text-sm md:text-base font-semibold text-foreground">
                    {selectedDevice.brand} {selectedDevice.model} · {selectedDevice.storage}
                  </p>
                </div>
                {showBasePrice && (
                  <p className="text-xl font-bold text-primary">
                    R$ {selectedDevice.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {phase === "color" && (
          <>
            <BackLink
              label={`Trocar armazenamento (${selectedDevice?.storage ?? ""})`}
              onClick={() => setPhase("storage")}
            />
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Escolha a cor do seu aparelho
              </p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
                informativo · sem desconto
              </span>
            </div>

            {loadingColors ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : colors.length === 0 ? (
              <EmptyState message="Nenhuma cor cadastrada para esta marca. Você pode prosseguir." />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {colors.map((c) => {
                  const isSel = data.colorId === c.id;
                  const hasImage = !!c.image_url;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleColorPick(c.id)}
                      className={`group relative w-full rounded-2xl border transition-all duration-200 overflow-hidden
                        ${
                          isSel
                            ? "border-primary ring-2 ring-primary/30 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:ring-2 hover:ring-primary/15"
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1.5 px-2 py-3">
                        {hasImage ? (
                          <span
                            className="inline-block h-14 w-14 rounded-full border border-border/80 shadow-inner overflow-hidden bg-muted/30"
                            aria-hidden
                          >
                            <img
                              src={c.image_url!}
                              alt={c.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </span>
                        ) : (
                          <span
                            className="inline-block h-14 w-14 rounded-full border border-border/80 shadow-inner"
                            style={{ backgroundColor: c.hex_code || "transparent" }}
                            aria-hidden
                          />
                        )}
                        <span className="text-xs font-medium text-foreground line-clamp-1 text-center">
                          {c.name}
                        </span>
                      </div>
                      {isSel && (
                        <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedDevice && (
              <div
                className={`mt-6 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-fast ${
                  showBasePrice
                    ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 shadow-md ring-1 ring-primary/10"
                    : "bg-primary/5 border border-primary/15"
                }`}
              >
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    {showBasePrice && <Sparkles className="h-3 w-3" />}
                    {showBasePrice ? "Oferta especial" : "Selecionado"}
                  </p>
                  <p className="text-sm md:text-base font-semibold text-foreground">
                    {selectedDevice.brand} {selectedDevice.model} · {selectedDevice.storage}
                    {selectedColor ? ` · ${selectedColor.name}` : ""}
                  </p>
                </div>
                {showBasePrice && (
                  <p className="text-xl font-bold text-primary">
                    R$ {selectedDevice.base_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="w-full sm:flex-1 h-12 rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="w-full sm:flex-1 h-12 rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          Próximo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* ── Confirmation modal: changing device wipes the answers ── */}
      <AlertDialog
        open={!!pendingChange}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar seleção?</AlertDialogTitle>
            <AlertDialogDescription>
              Você já respondeu parte da avaliação. Trocar
              {pendingChange?.kind === "brand"
                ? " a marca"
                : pendingChange?.kind === "model"
                ? " o modelo"
                : " o armazenamento"}{" "}
              vai apagar as respostas para garantir o preço correto. Quer continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter respostas</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingChange) applyChange(pendingChange);
                setPendingChange(null);
              }}
            >
              Sim, alterar e reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- subcomponents ---------- */

function PhaseGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
}

function SelectionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-2xl border p-5 text-center transition-all duration-200 min-h-[88px] flex items-center justify-center
        ${
          selected
            ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
            : "border-border bg-card hover:border-primary/40 hover:ring-2 hover:ring-primary/15 hover:shadow-sm"
        }`}
    >
      <span className="text-sm md:text-base font-semibold text-foreground">{label}</span>
      {selected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

/**
 * Brand selection card — shows the uploaded logo when available, otherwise
 * falls back to the brand name as text. The brand name is always shown as a
 * small caption underneath when a logo is present, for clarity.
 */
function BrandCard({
  label,
  logoUrl,
  selected,
  onClick,
}: {
  label: string;
  logoUrl: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative rounded-2xl border p-4 text-center transition-all duration-200 min-h-[112px] flex flex-col items-center justify-center gap-2
        ${
          selected
            ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm"
            : "border-border bg-card hover:border-primary/40 hover:ring-2 hover:ring-primary/15 hover:shadow-sm"
        }`}
      aria-label={label}
    >
      {logoUrl ? (
        <>
          <img
            src={logoUrl}
            alt={label}
            loading="lazy"
            className="h-12 md:h-14 max-w-[80%] object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </>
      ) : (
        <span className="text-base md:text-lg font-semibold text-foreground">{label}</span>
      )}
      {selected && (
        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function Crumb({
  label,
  active,
  done,
  onClick,
}: {
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!done && !active}
      className={`px-3 py-1 rounded-full transition-colors ${
        active
          ? "bg-primary text-primary-foreground font-medium"
          : done
          ? "bg-muted text-foreground hover:bg-muted/80"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
    >
      <ArrowLeft className="h-3 w-3" /> {label}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full text-center text-sm text-muted-foreground py-8">{message}</div>
  );
}

/**
 * Visual model card for the calculator: square aspect ratio, photo fills the
 * card, name floats over a gradient at the bottom. On hover/touch the photo
 * gently zooms and the name scales up — mobile-first and highly responsive.
 */
function ModelCard({
  name,
  imageUrl,
  selected,
  onClick,
}: {
  name: string;
  imageUrl: string | null;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl border-2 bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40
        ${
          selected
            ? "border-primary shadow-md ring-1 ring-primary/30"
            : "border-border hover:border-primary/50"
        }`}
      aria-pressed={selected}
    >
      {/* Image (or placeholder) */}
      <div className="relative flex-1 w-full overflow-hidden rounded-xl bg-muted/20">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Smartphone
              className="h-10 w-10 text-muted-foreground/50 transition-transform duration-500 group-hover:scale-110"
              aria-hidden
            />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="mt-2 px-1 text-center text-sm md:text-[15px] font-semibold leading-tight text-foreground">
        {name}
      </p>

      {selected && (
        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}
