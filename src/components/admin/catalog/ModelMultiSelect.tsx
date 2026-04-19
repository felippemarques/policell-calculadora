import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface BrandRow {
  id: string;
  name: string;
  display_order: number;
}
interface ModelRow {
  id: string;
  name: string;
  brand_id: string;
  display_order: number;
}

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Optional label rendered above the trigger */
  label?: string;
  /** Compact UI (smaller trigger) */
  compact?: boolean;
}

/**
 * Multi-select for device models, grouped by brand.
 * Empty selection = applies to all models (global rule).
 */
export function ModelMultiSelect({ selected, onChange, label = "Modelos aplicáveis", compact }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands-for-model-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, display_order")
        .order("display_order");
      if (error) throw error;
      return (data || []) as BrandRow[];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ["admin-models-for-model-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_models")
        .select("id, name, brand_id, display_order")
        .order("display_order");
      if (error) throw error;
      return (data || []) as ModelRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { brand: BrandRow; models: ModelRow[] }>();
    for (const b of brands) map.set(b.id, { brand: b, models: [] });
    for (const m of models) {
      const g = map.get(m.brand_id);
      if (g) g.models.push(m);
    }
    const arr = [...map.values()].filter((g) => g.models.length > 0);
    if (!search.trim()) return arr;
    const q = search.toLowerCase();
    return arr
      .map((g) => ({
        brand: g.brand,
        models: g.models.filter(
          (m) => m.name.toLowerCase().includes(q) || g.brand.name.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.models.length > 0);
  }, [brands, models, search]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const clear = () => onChange([]);

  const summary =
    selected.length === 0
      ? "Todos os modelos"
      : selected.length === 1
        ? models.find((m) => m.id === selected[0])?.name ?? "1 modelo"
        : `${selected.length} modelos`;

  // Quick chips of selected models (max 3 visible)
  const selectedModels = selected
    .map((id) => models.find((m) => m.id === id))
    .filter(Boolean) as ModelRow[];

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" /> {label}
          {selected.length === 0 && (
            <Badge variant="outline" className="text-[10px] ml-1">global</Badge>
          )}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              compact ? "h-9 text-sm" : "",
              selected.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">{summary}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar modelo ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-[280px] overflow-auto">
            {grouped.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                Nenhum modelo encontrado.
              </p>
            )}
            {grouped.map((g) => (
              <div key={g.brand.id} className="border-b last:border-b-0">
                <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.brand.name}
                </div>
                {g.models.map((m) => {
                  const checked = selectedSet.has(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/30 transition-colors text-left"
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <span className="flex-1 truncate">{m.name}</span>
                      {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {selected.length === 0 ? "Aplica a todos" : `${selected.length} selecionado(s)`}
            </span>
            <div className="flex gap-1">
              {selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
                  Limpar
                </Button>
              )}
              <Button size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedModels.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selectedModels.slice(0, 6).map((m) => (
            <Badge key={m.id} variant="secondary" className="text-[10px] gap-1 pr-1">
              {m.name}
              <button
                type="button"
                onClick={() => toggle(m.id)}
                className="rounded-full hover:bg-background/60 p-0.5"
                aria-label={`Remover ${m.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {selectedModels.length > 6 && (
            <Badge variant="outline" className="text-[10px]">
              +{selectedModels.length - 6}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
