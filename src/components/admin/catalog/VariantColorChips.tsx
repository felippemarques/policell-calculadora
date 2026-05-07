import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { CATALOG_TREE_KEY, useAllColors, type CatalogColor } from "@/hooks/use-catalog-tree";

interface Props {
  modelStorageId: string;
  brandId: string;
  colors: CatalogColor[];
}

export function VariantColorChips({ modelStorageId, brandId, colors }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: allColors } = useAllColors();
  const [open, setOpen] = useState(false);

  const usedIds = useMemo(() => new Set(colors.map((c) => c.color_id)), [colors]);

  const available = useMemo(() => {
    return (allColors || [])
      .filter((c) => !usedIds.has(c.id))
      .filter(
        (c) =>
          !c.brand_ids || c.brand_ids.length === 0 || c.brand_ids.includes(brandId),
      );
  }, [allColors, usedIds, brandId]);

  const addColor = useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await supabase
        .from("variant_colors")
        .insert({ model_storage_id: modelStorageId, color_id: colorId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeColor = useMutation({
    mutationFn: async (variantColorId: string) => {
      const { error } = await supabase.from("variant_colors").delete().eq("id", variantColorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleColorVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("variant_colors")
        .update({ is_visible: !is_visible })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.length === 0 && (
        <span className="text-xs text-muted-foreground">Nenhuma cor cadastrada</span>
      )}
      {colors.map((c) => (
        <Badge
          key={c.variant_color_id}
          variant="secondary"
          className={`gap-1.5 pr-1 ${c.is_visible ? "" : "opacity-50 line-through"}`}
        >
          {c.image_url ? (
            <span className="inline-flex h-5 w-5 overflow-hidden rounded border border-border bg-muted/30">
              <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
            </span>
          ) : c.hex_code && (
            <span
              className="inline-block h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: c.hex_code }}
            />
          )}
          <span>{c.name}</span>
          <button
            type="button"
            onClick={() =>
              toggleColorVisibility.mutate({ id: c.variant_color_id, is_visible: c.is_visible })
            }
            className="ml-0.5 rounded-sm p-0.5 hover:bg-foreground/10"
            aria-label={c.is_visible ? `Ocultar ${c.name}` : `Mostrar ${c.name}`}
            title={c.is_visible ? "Ocultar do cliente" : "Mostrar ao cliente"}
          >
            {c.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => removeColor.mutate(c.variant_color_id)}
            className="ml-0.5 rounded-sm p-0.5 hover:bg-destructive/20"
            aria-label={`Remover ${c.name}`}
            title="Remover cor"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
            <Plus className="h-3 w-3" /> Cor
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          {available.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Sem cores disponíveis
            </div>
          ) : (
            available.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => addColor.mutate(c.id)}>
                {(c as any).image_url ? (
                  <span className="mr-2 inline-flex h-5 w-5 overflow-hidden rounded border border-border bg-muted/30">
                    <img src={(c as any).image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                  </span>
                ) : c.hex_code && (
                  <span
                    className="mr-2 inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: c.hex_code }}
                  />
                )}
                {c.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
