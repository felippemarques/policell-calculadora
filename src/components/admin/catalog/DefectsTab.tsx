import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function DefectsTab() {
  const queryClient = useQueryClient();
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [catForm, setCatForm] = useState({ name: "" });

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["admin-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: deductions } = useQuery({
    queryKey: ["admin-damage-deductions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_deductions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const invalidateCats = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-damage-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-damage-deductions"] });
  };

  const saveCatMutation = useMutation({
    mutationFn: async ({ id, name }: { id?: string; name: string }) => {
      if (id) {
        const { error } = await supabase.from("damage_categories").update({ name }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_categories").insert({ name });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateCats(); setEditingCatId(null); setShowNewCat(false); setNewCatName(""); toast.success("Salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: delDed } = await supabase.from("damage_deductions").delete().eq("damage_category_id", id);
      if (delDed) throw delDed;
      const { error } = await supabase.from("damage_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateCats(); toast.success("Removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const saveDeductionMutation = useMutation({
    mutationFn: async ({ catId, value }: { catId: string; value: number }) => {
      const existing = deductions?.find((d: any) => d.damage_category_id === catId);
      if (existing) {
        const { error } = await supabase.from("damage_deductions").update({ deduction_value: value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_deductions").insert({ damage_category_id: catId, deduction_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateCats(); toast.success("Valor salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const getDeduction = (catId: string) => deductions?.find((d: any) => d.damage_category_id === catId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Categorias de defeitos e valores de dedução (R$)</p>
        <Button onClick={() => setShowNewCat(true)} disabled={showNewCat}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {showNewCat && (
        <div className="bg-card border rounded-lg p-4 flex items-end gap-3">
          <div className="flex-1">
            <Label>Nome da categoria</Label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ex: Display" className="mt-1" />
          </div>
          <Button onClick={() => saveCatMutation.mutate({ name: newCatName })} disabled={!newCatName || saveCatMutation.isPending}>
            <Check className="mr-2 h-4 w-4" /> Criar
          </Button>
          <Button variant="outline" onClick={() => { setShowNewCat(false); setNewCatName(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loadingCats ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2">
          {categories?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma categoria de defeito cadastrada.</p>
          )}
          {categories?.map((cat: any) => {
            const ded = getDeduction(cat.id);
            const isEditing = editingCatId === cat.id;
            return (
              <div key={cat.id} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input value={catForm.name} onChange={(e) => setCatForm({ name: e.target.value })} className="text-sm" />
                  ) : (
                    <h4 className="font-medium text-foreground">{cat.name}</h4>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Dedução R$</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="w-24 text-sm"
                    defaultValue={ded?.deduction_value || 0}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (ded?.deduction_value !== val) {
                        saveDeductionMutation.mutate({ catId: cat.id, value: val });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => saveCatMutation.mutate({ id: cat.id, name: catForm.name })}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCatId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setCatForm({ name: cat.name }); setEditingCatId(cat.id); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                        if (confirm("Remover esta categoria e suas deduções?")) deleteCatMutation.mutate(cat.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
