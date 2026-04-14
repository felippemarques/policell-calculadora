import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Check, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type AttributeField = "brand" | "model" | "storage" | "colors";

interface AttributeTabProps {
  field: AttributeField;
  label: string;
  description: string;
}

export function AttributeTab({ field, label, description }: AttributeTabProps) {
  const queryClient = useQueryClient();
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");

  const { data: devices, isLoading } = useQuery({
    queryKey: ["admin-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*").order("brand").order("model");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-devices"] });

  // Extract unique values with count
  const uniqueValues = useMemo(() => {
    if (!devices) return [];
    if (field === "colors") {
      const colorMap = new Map<string, number>();
      devices.forEach((d) => {
        (d.colors || "").split(",").map((c) => c.trim()).filter(Boolean).forEach((c) => {
          colorMap.set(c, (colorMap.get(c) || 0) + 1);
        });
      });
      return Array.from(colorMap.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
    }
    const map = new Map<string, number>();
    devices.forEach((d) => {
      const val = d[field] as string;
      if (val) map.set(val, (map.get(val) || 0) + 1);
    });
    return Array.from(map.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));
  }, [devices, field]);

  const renameMutation = useMutation({
    mutationFn: async ({ oldValue, newVal }: { oldValue: string; newVal: string }) => {
      if (!devices) return;
      if (field === "colors") {
        // Update each device that has this color
        const affected = devices.filter((d) => (d.colors || "").split(",").map((c) => c.trim()).includes(oldValue));
        for (const dev of affected) {
          const updatedColors = (dev.colors || "").split(",").map((c) => c.trim()).map((c) => c === oldValue ? newVal : c).join(", ");
          const { error } = await supabase.from("devices").update({ colors: updatedColors }).eq("id", dev.id);
          if (error) throw error;
        }
      } else {
        const updateObj = { [field]: newVal } as any;
        const { error } = await supabase.from("devices").update(updateObj).eq(field as any, oldValue);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); setEditingValue(null); setNewValue(""); toast.success("Renomeado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (value: string) => {
      if (!devices) return;
      if (field === "colors") {
        const affected = devices.filter((d) => (d.colors || "").split(",").map((c) => c.trim()).includes(value));
        for (const dev of affected) {
          const updatedColors = (dev.colors || "").split(",").map((c) => c.trim()).filter((c) => c !== value).join(", ");
          const { error } = await supabase.from("devices").update({ colors: updatedColors || null }).eq("id", dev.id);
          if (error) throw error;
        }
      } else {
        // Can't delete brand/model/storage — it's required. Instead show warning.
        toast.error(`Não é possível remover ${label.toLowerCase()}. Edite os aparelhos diretamente.`);
        return;
      }
    },
    onSuccess: () => { invalidate(); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2">
          {uniqueValues.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum valor encontrado.</p>
          )}
          {uniqueValues.map(({ value, count }) => {
            const isEditing = editingValue === value;
            return (
              <div key={value} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newValue) renameMutation.mutate({ oldValue: value, newVal: newValue });
                        if (e.key === "Escape") setEditingValue(null);
                      }}
                    />
                  ) : (
                    <h4 className="font-medium text-foreground">{value}</h4>
                  )}
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                  {count} aparelho(s)
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => renameMutation.mutate({ oldValue: value, newVal: newValue })} disabled={!newValue || renameMutation.isPending}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingValue(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingValue(value); setNewValue(value); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {field === "colors" && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                          if (confirm(`Remover a cor "${value}" de ${count} aparelho(s)?`)) deleteMutation.mutate(value);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
