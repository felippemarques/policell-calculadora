import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface OrderableRow {
  id: string;
  display_order: number;
}

interface OrderArrowsProps<T extends OrderableRow> {
  table: "brands" | "device_models" | "storages" | "colors" | "damage_categories" | "damage_deductions";
  rows: T[];
  currentId: string;
  queryKey: readonly unknown[];
}

/**
 * Pequenos botões ⬆️ ⬇️ que trocam o display_order com o vizinho.
 * Faz 2 updates no banco (swap) e invalida a query.
 */
export function OrderArrows<T extends OrderableRow>({
  table,
  rows,
  currentId,
  queryKey,
}: OrderArrowsProps<T>) {
  const qc = useQueryClient();

  const sorted = [...rows].sort((a, b) => a.display_order - b.display_order);
  const idx = sorted.findIndex((r) => r.id === currentId);
  const isFirst = idx <= 0;
  const isLast = idx === -1 || idx >= sorted.length - 1;

  const swapMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      const current = sorted[idx];
      const neighbor = direction === "up" ? sorted[idx - 1] : sorted[idx + 1];
      if (!current || !neighbor) return;

      // Swap dos display_order
      const { error: e1 } = await supabase
        .from(table)
        .update({ display_order: neighbor.display_order })
        .eq("id", current.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from(table)
        .update({ display_order: current.display_order })
        .eq("id", neighbor.id);
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="inline-flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isFirst || swapMutation.isPending}
        onClick={() => swapMutation.mutate("up")}
        title="Subir"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={isLast || swapMutation.isPending}
        onClick={() => swapMutation.mutate("down")}
        title="Descer"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
