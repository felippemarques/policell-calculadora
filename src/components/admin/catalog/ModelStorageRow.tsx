import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Check, Pencil, Trash2, X, ArrowRightLeft, Banknote, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
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
  const [tradeDraft, setTradeDraft] = useState(storage.trade_price ?? storage.base_price);
  const [saleDraft, setSaleDraft] = useState(storage.sale_price ?? storage.base_price);

  const updatePrice = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("model_storages")
        .update({
          trade_price: tradeDraft,
          sale_price: saleDraft,
          // Keep legacy base_price aligned with the higher of the two so
          // anything that still reads it has a sensible value.
          base_price: Math.max(tradeDraft, saleDraft),
        })
        .eq("id", storage.model_storage_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      setEditing(false);
      toast({ title: "Preços atualizados" });
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

  const tradePrice = storage.trade_price ?? storage.base_price;
  const salePrice = storage.sale_price ?? storage.base_price;

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
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px] text-primary flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" /> Troca
              </Label>
              <CurrencyInput
                value={tradeDraft}
                onValueChange={setTradeDraft}
                className="h-8 w-32 text-sm"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-accent-foreground flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Venda
              </Label>
              <CurrencyInput
                value={saleDraft}
                onValueChange={setSaleDraft}
                className="h-8 w-32 text-sm"
              />
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updatePrice.mutate()}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setTradeDraft(tradePrice);
                setSaleDraft(salePrice);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary"
              title="Preço pago ao cliente que TROCA o aparelho usado por um novo"
            >
              <ArrowRightLeft className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Troca</span>
              <span className="font-bold tabular-nums">{formatBRLWithSymbol(tradePrice)}</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-success"
              title="Preço de VENDA do aparelho na loja (sem troca)"
            >
              <Banknote className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Venda</span>
              <span className="font-bold tabular-nums">{formatBRLWithSymbol(salePrice)}</span>
            </span>
          </div>
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
