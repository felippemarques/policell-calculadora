import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronRight, Percent, DollarSign, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function DefectsTab() {
  const qc = useQueryClient();

  // ── State ──
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "" });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [showNewCondition, setShowNewCondition] = useState(false);
  const [condForm, setCondForm] = useState({ condition_name: "", discount_percentage: 0, is_rejected: false });
  const [editingCondId, setEditingCondId] = useState<string | null>(null);
  const [editCondForm, setEditCondForm] = useState({ condition_name: "", discount_percentage: 0, is_rejected: false });

  // ── Queries ──
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ["admin-damage-deductions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_deductions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: conditions = [] } = useQuery({
    queryKey: ["admin-condition-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("condition_discounts").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-damage-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-damage-deductions"] });
    qc.invalidateQueries({ queryKey: ["admin-condition-discounts"] });
  };

  // ── Category mutations ──
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
    onSuccess: () => { invalidateAll(); setEditingCatId(null); setShowNewCat(false); setNewCatName(""); toast.success("Salvo!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("damage_deductions").delete().eq("damage_category_id", id);
      const { error } = await supabase.from("damage_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Deduction mutation (inline save on blur) ──
  const saveDeductionMutation = useMutation({
    mutationFn: async ({ catId, value }: { catId: string; value: number }) => {
      const existing = deductions.find((d) => d.damage_category_id === catId);
      if (existing) {
        const { error } = await supabase.from("damage_deductions").update({ deduction_value: value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_deductions").insert({ damage_category_id: catId, deduction_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); toast.success("Dedução salva!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Condition mutations ──
  const saveCondMutation = useMutation({
    mutationFn: async (data: { id?: string; condition_name: string; discount_percentage: number; is_rejected: boolean }) => {
      if (data.id) {
        const { error } = await supabase.from("condition_discounts").update({
          condition_name: data.condition_name,
          discount_percentage: data.discount_percentage,
          is_rejected: data.is_rejected,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder = conditions.length > 0 ? Math.max(...conditions.map((c) => c.display_order)) + 1 : 0;
        const { error } = await supabase.from("condition_discounts").insert({
          condition_name: data.condition_name,
          discount_percentage: data.discount_percentage,
          is_rejected: data.is_rejected,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewCondition(false);
      setEditingCondId(null);
      setCondForm({ condition_name: "", discount_percentage: 0, is_rejected: false });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCondMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("condition_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const getDeduction = (catId: string) => deductions.find((d) => d.damage_category_id === catId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════
          SEÇÃO 1: Condições do Aparelho (percentuais)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" /> Condições do Aparelho
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Descontos percentuais aplicados ao preço base conforme a condição geral.</p>
          </div>
          <Button size="sm" onClick={() => { setShowNewCondition(true); setEditingCondId(null); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Condição
          </Button>
        </div>

        {/* New condition form */}
        {showNewCondition && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Nome</Label>
                <Input value={condForm.condition_name} onChange={(e) => setCondForm({ ...condForm, condition_name: e.target.value })} placeholder="Ex: EXCELENTE" className="mt-1" autoFocus />
              </div>
              <div>
                <Label className="text-sm">Desconto (%)</Label>
                <Input type="number" min={0} step={0.1} value={condForm.discount_percentage} onChange={(e) => setCondForm({ ...condForm, discount_percentage: Number(e.target.value) })} className="mt-1" />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2 pb-1">
                  <Switch checked={condForm.is_rejected} onCheckedChange={(v) => setCondForm({ ...condForm, is_rejected: v })} />
                  <Label className="text-sm text-destructive">Rejeitar</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveCondMutation.mutate(condForm)} disabled={!condForm.condition_name || saveCondMutation.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewCondition(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Conditions list */}
        <div className="border rounded-lg overflow-hidden divide-y">
          {conditions.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma condição cadastrada.</p>
          )}
          {conditions.map((cond) => {
            const isEditing = editingCondId === cond.id;
            return (
              <div key={cond.id} className="flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                {isEditing ? (
                  <>
                    <Input value={editCondForm.condition_name} onChange={(e) => setEditCondForm({ ...editCondForm, condition_name: e.target.value })} className="h-8 text-sm flex-1" autoFocus />
                    <Input type="number" min={0} step={0.1} value={editCondForm.discount_percentage} onChange={(e) => setEditCondForm({ ...editCondForm, discount_percentage: Number(e.target.value) })} className="h-8 text-sm w-24" />
                    <div className="flex items-center gap-1.5">
                      <Switch checked={editCondForm.is_rejected} onCheckedChange={(v) => setEditCondForm({ ...editCondForm, is_rejected: v })} />
                      <span className="text-xs text-muted-foreground">Rejeitar</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => saveCondMutation.mutate({ id: cond.id, ...editCondForm })}><Check className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingCondId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground flex-1">{cond.condition_name}</span>
                    {cond.is_rejected ? (
                      <Badge variant="destructive" className="text-xs"><Ban className="h-3 w-3 mr-1" />Rejeitado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs"><Percent className="h-3 w-3 mr-1" />{cond.discount_percentage}%</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCondId(cond.id); setEditCondForm({ condition_name: cond.condition_name, discount_percentage: cond.discount_percentage, is_rejected: cond.is_rejected }); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Remover "${cond.condition_name}"?`)) deleteCondMutation.mutate(cond.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SEÇÃO 2: Categorias de Defeitos (deduções fixas)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" /> Categorias de Defeitos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Deduções fixas em R$ subtraídas do valor quando o defeito é identificado. Clique para expandir.</p>
          </div>
          <Button size="sm" onClick={() => setShowNewCat(true)} disabled={showNewCat}>
            <Plus className="h-4 w-4 mr-1" /> Nova Categoria
          </Button>
        </div>

        {/* New category form */}
        {showNewCat && (
          <div className="bg-card border rounded-lg p-4 flex items-end gap-3">
            <div className="flex-1">
              <Label>Nome da categoria</Label>
              <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ex: Display" className="mt-1" autoFocus />
            </div>
            <Button onClick={() => saveCatMutation.mutate({ name: newCatName })} disabled={!newCatName || saveCatMutation.isPending}>
              <Check className="mr-1 h-4 w-4" /> Criar
            </Button>
            <Button variant="outline" onClick={() => { setShowNewCat(false); setNewCatName(""); }}><X className="h-4 w-4" /></Button>
          </div>
        )}

        {/* Categories accordion */}
        <div className="border rounded-lg overflow-hidden divide-y">
          {categories.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma categoria cadastrada.</p>
          )}
          {categories.map((cat) => {
            const ded = getDeduction(cat.id);
            const isExpanded = expandedCat === cat.id;
            const isEditing = editingCatId === cat.id;

            return (
              <div key={cat.id} className="bg-card">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />

                  {isEditing ? (
                    <Input
                      value={catForm.name}
                      onChange={(e) => setCatForm({ name: e.target.value })}
                      className="h-8 text-sm flex-1"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-foreground flex-1">{cat.name}</span>
                  )}

                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    R$ {ded?.deduction_value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                  </Badge>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => saveCatMutation.mutate({ id: cat.id, name: catForm.name })}><Check className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingCatId(null)}><X className="h-3.5 w-3.5" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setCatForm({ name: cat.name }); setEditingCatId(cat.id); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                          if (confirm(`Remover "${cat.name}" e suas deduções?`)) deleteCatMutation.mutate(cat.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 ml-7 border-t border-dashed space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">Valor da dedução fixa (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="mt-1"
                          defaultValue={ded?.deduction_value || 0}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (ded?.deduction_value !== val) {
                              saveDeductionMutation.mutate({ catId: cat.id, value: val });
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Subtraído diretamente do valor final quando este defeito é marcado.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
