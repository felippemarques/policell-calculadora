import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Check, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatBRLWithSymbol } from "@/lib/currency";
import { CATALOG_TREE_KEY, type CatalogStorage } from "@/hooks/use-catalog-tree";
import { VariantColorChips } from "./VariantColorChips";

interface Props {
  brandId: string;
  storage: CatalogStorage;
}

export function ModelStorageRow({ brandId, storage }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [priceDraft, setPriceDraft] = useState(storage.base_price);

  const updatePrice = useMutation({
    mutationFn: async (newPrice: number) => {
      const { error } = await supabase
        .from("model_storages")
        .update({ base_price: newPrice })
        .eq("id", storage.model_storage_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      setEditing(false);
      toast({ title: "Preço atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("model_storages")
        .delete()
        .eq("id", storage.model_storage_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Capacidade removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-md border border-border bg-card/50">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-sm font-medium hover:text-primary"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {storage.capacity}
        </button>

        <span className="text-muted-foreground">·</span>

        {editing ? (
          <div className="flex items-center gap-1">
            <CurrencyInput
              value={priceDraft}
              onValueChange={setPriceDraft}
              className="h-8 w-32 text-sm"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updatePrice.mutate(priceDraft)}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setPriceDraft(storage.base_price);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {formatBRLWithSymbol(storage.base_price)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!editing && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover capacidade {storage.capacity}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá também todas as cores vinculadas e o aparelho correspondente da calculadora pública.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => remove.mutate()}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-3 py-2">
          <VariantColorChips
            modelStorageId={storage.model_storage_id}
            brandId={brandId}
            colors={storage.colors}
          />
        </div>
      )}
    </div>
  );
}
