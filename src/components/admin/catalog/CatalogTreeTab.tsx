import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CATALOG_TREE_KEY,
  useAllStorages,
  useCatalogTree,
  type CatalogModel,
} from "@/hooks/use-catalog-tree";
import { ModelStorageRow } from "./ModelStorageRow";

function ModelNode({ brandId, model }: { brandId: string; model: CatalogModel }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [storageId, setStorageId] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const { data: allStorages } = useAllStorages();

  const usedStorageIds = useMemo(
    () => new Set(model.storages.map((s) => s.storage_id)),
    [model.storages],
  );
  const availableStorages = useMemo(
    () => (allStorages || []).filter((s) => !usedStorageIds.has(s.id)),
    [allStorages, usedStorageIds],
  );

  const addStorage = useMutation({
    mutationFn: async () => {
      if (!storageId) throw new Error("Selecione uma capacidade");
      const { error } = await supabase.from("model_storages").insert({
        model_id: model.model_id,
        storage_id: storageId,
        base_price: price,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      setStorageId("");
      setPrice(0);
      setPopoverOpen(false);
      toast({ title: "Capacidade adicionada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-2 pl-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold hover:text-primary"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {model.model_name}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({model.storages.length})
          </span>
        </button>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 px-2 text-xs">
              <Plus className="h-3 w-3" /> Capacidade
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Capacidade</Label>
              <Select value={storageId} onValueChange={setStorageId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {availableStorages.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Sem capacidades disponíveis
                    </div>
                  )}
                  {availableStorages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.capacity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preço base</Label>
              <CurrencyInput value={price} onValueChange={setPrice} className="h-9" />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => addStorage.mutate()}
              disabled={!storageId || addStorage.isPending}
            >
              Adicionar
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {expanded && (
        <div className="space-y-1.5 pl-5">
          {model.storages.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma capacidade cadastrada.</p>
          ) : (
            model.storages.map((s) => (
              <ModelStorageRow key={s.model_storage_id} brandId={brandId} storage={s} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function CatalogTreeTab() {
  const { data, isLoading, error } = useCatalogTree();
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({});

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando catálogo…</p>;
  if (error) return <p className="text-sm text-destructive">Erro ao carregar catálogo.</p>;
  if (!data || data.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma marca cadastrada. Cadastre uma marca na aba "Marcas".
      </p>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Estrutura hierárquica: <strong>Marca → Modelo → Capacidade → Cor</strong>. Capacidades e cores
        precisam estar previamente cadastradas em suas abas auxiliares.
      </p>

      <div className="space-y-3">
        {data.map((brand) => {
          const isOpen = openBrands[brand.brand_id] ?? true;
          return (
            <div key={brand.brand_id} className="rounded-lg border border-border bg-card p-3">
              <button
                type="button"
                onClick={() =>
                  setOpenBrands((prev) => ({ ...prev, [brand.brand_id]: !isOpen }))
                }
                className="flex w-full items-center gap-2 text-left text-base font-bold hover:text-primary"
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {brand.brand_name}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({brand.models.length} modelos)
                </span>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-3">
                  {brand.models.length === 0 ? (
                    <p className="pl-4 text-xs text-muted-foreground">
                      Nenhum modelo cadastrado para esta marca.
                    </p>
                  ) : (
                    brand.models.map((m) => (
                      <ModelNode key={m.model_id} brandId={brand.brand_id} model={m} />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
