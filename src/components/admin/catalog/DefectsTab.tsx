import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronRight,
  Percent, DollarSign, Ban, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type DamageOption = {
  id: string;
  damage_category_id: string;
  option_name: string;
  deduction_value: number;
  is_rejected: boolean;
  display_order: number;
};

export function DefectsTab() {
  const qc = useQueryClient();

  // ── Categories state ──
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", help_text: "", is_required: true });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", help_text: "", is_required: true });

  // ── Damage option state (per-category) ──
  const [newOptionByCat, setNewOptionByCat] = useState<
    Record<string, { option_name: string; deduction_value: number; is_rejected: boolean }>
  >({});
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editOptForm, setEditOptForm] = useState({
    option_name: "",
    deduction_value: 0,
    is_rejected: false,
  });

  // ── Condition (normal) state ──
  const [showNewCondition, setShowNewCondition] = useState(false);
  const [condForm, setCondForm] = useState({
    condition_name: "",
    discount_percentage: 0,
    help_text: "",
    is_required: true,
  });
  const [editingCondId, setEditingCondId] = useState<string | null>(null);
  const [editCondForm, setEditCondForm] = useState({
    condition_name: "",
    discount_percentage: 0,
    help_text: "",
    is_required: true,
  });

  // ── Rejection reason state ──
  const [showNewRejection, setShowNewRejection] = useState(false);
  const [rejectionName, setRejectionName] = useState("");
  const [editingRejId, setEditingRejId] = useState<string | null>(null);
  const [editRejName, setEditRejName] = useState("");

  // ── Queries ──
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ["admin-damage-deductions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_deductions")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []) as unknown as DamageOption[];
    },
  });

  const { data: conditions = [] } = useQuery({
    queryKey: ["admin-condition-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condition_discounts")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const normalConditions = conditions.filter((c) => !c.is_rejected);
  const rejectionReasons = conditions.filter((c) => c.is_rejected);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-damage-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-damage-deductions"] });
    qc.invalidateQueries({ queryKey: ["admin-condition-discounts"] });
  };

  // ── Category mutations ──
  const saveCatMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; help_text: string; is_required: boolean }) => {
      const payload = {
        name: data.name,
        help_text: data.help_text?.trim() || null,
        is_required: data.is_required,
      };
      if (data.id) {
        const { error } = await supabase
          .from("damage_categories")
          .update(payload as any)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_categories").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setEditingCatId(null);
      setShowNewCat(false);
      setNewCat({ name: "", help_text: "", is_required: true });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("damage_deductions").delete().eq("damage_category_id", id);
      const { error } = await supabase.from("damage_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Damage option mutations ──
  const saveOptionMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      damage_category_id: string;
      option_name: string;
      deduction_value: number;
      is_rejected: boolean;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("damage_deductions")
          .update({
            option_name: data.option_name,
            deduction_value: data.deduction_value,
            is_rejected: data.is_rejected,
          } as any)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const catOptions = deductions.filter((d) => d.damage_category_id === data.damage_category_id);
        const maxOrder =
          catOptions.length > 0 ? Math.max(...catOptions.map((o) => o.display_order)) + 1 : 0;
        const { error } = await supabase.from("damage_deductions").insert({
          damage_category_id: data.damage_category_id,
          option_name: data.option_name,
          deduction_value: data.deduction_value,
          is_rejected: data.is_rejected,
          display_order: maxOrder,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      invalidateAll();
      setEditingOptId(null);
      setNewOptionByCat((prev) => ({
        ...prev,
        [vars.damage_category_id]: { option_name: "", deduction_value: 0, is_rejected: false },
      }));
      toast.success("Opção salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("damage_deductions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Opção removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Condition (normal) mutations ──
  const saveCondMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      condition_name: string;
      discount_percentage: number;
      help_text: string;
      is_required: boolean;
    }) => {
      const payload = {
        condition_name: data.condition_name,
        discount_percentage: data.discount_percentage,
        is_rejected: false,
        help_text: data.help_text?.trim() || null,
        is_required: data.is_required,
      };
      if (data.id) {
        const { error } = await supabase
          .from("condition_discounts")
          .update(payload as any)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder =
          conditions.length > 0 ? Math.max(...conditions.map((c) => c.display_order)) + 1 : 0;
        const { error } = await supabase
          .from("condition_discounts")
          .insert({ ...payload, display_order: maxOrder } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewCondition(false);
      setEditingCondId(null);
      setCondForm({ condition_name: "", discount_percentage: 0, help_text: "", is_required: true });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Rejection mutations ──
  const saveRejectionMutation = useMutation({
    mutationFn: async (data: { id?: string; condition_name: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("condition_discounts")
          .update({
            condition_name: data.condition_name,
            discount_percentage: 100,
            is_rejected: true,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder =
          conditions.length > 0 ? Math.max(...conditions.map((c) => c.display_order)) + 1 : 0;
        const { error } = await supabase.from("condition_discounts").insert({
          condition_name: data.condition_name,
          discount_percentage: 100,
          is_rejected: true,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewRejection(false);
      setRejectionName("");
      setEditingRejId(null);
      setEditRejName("");
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCondMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("condition_discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getOptionsForCat = (catId: string) =>
    deductions.filter((d) => d.damage_category_id === catId);

  const getNewOptionDraft = (catId: string) =>
    newOptionByCat[catId] || { option_name: "", deduction_value: 0, is_rejected: false };

  const updateNewOptionDraft = (
    catId: string,
    patch: Partial<{ option_name: string; deduction_value: number; is_rejected: boolean }>,
  ) => {
    setNewOptionByCat((prev) => ({
      ...prev,
      [catId]: { ...getNewOptionDraft(catId), ...patch },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════
          SEÇÃO 1: Condições do Aparelho (% normais)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" /> Condições do Aparelho
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Descontos percentuais aplicados ao preço base conforme a condição geral.
            </p>
          </div>
          <Button size="sm" onClick={() => { setShowNewCondition(true); setEditingCondId(null); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Condição
          </Button>
        </div>

        {/* New condition form */}
        {showNewCondition && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Nome</Label>
                <Input
                  value={condForm.condition_name}
                  onChange={(e) => setCondForm({ ...condForm, condition_name: e.target.value })}
                  placeholder="Ex: EXCELENTE"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-sm">Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={condForm.discount_percentage}
                  onChange={(e) =>
                    setCondForm({ ...condForm, discount_percentage: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Texto de ajuda (opcional)</Label>
              <Textarea
                value={condForm.help_text}
                onChange={(e) => setCondForm({ ...condForm, help_text: e.target.value })}
                placeholder="Ex: Sem riscos visíveis, todas as funções operando perfeitamente."
                className="mt-1 text-sm"
                rows={2}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Exibido como tooltip "?" para o cliente entender o que essa condição significa.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <Checkbox
                checked={condForm.is_required}
                onCheckedChange={(v) => setCondForm({ ...condForm, is_required: v === true })}
              />
              <span>Obrigatório (cliente precisa escolher uma condição para avançar)</span>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => saveCondMutation.mutate(condForm)}
                disabled={!condForm.condition_name || saveCondMutation.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewCondition(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Conditions list */}
        <div className="border rounded-lg overflow-hidden divide-y">
          {normalConditions.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhuma condição cadastrada.
            </p>
          )}
          {normalConditions.map((cond) => {
            const isEditing = editingCondId === cond.id;
            return (
              <div
                key={cond.id}
                className="px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editCondForm.condition_name}
                        onChange={(e) =>
                          setEditCondForm({ ...editCondForm, condition_name: e.target.value })
                        }
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={editCondForm.discount_percentage}
                        onChange={(e) =>
                          setEditCondForm({
                            ...editCondForm,
                            discount_percentage: Number(e.target.value),
                          })
                        }
                        className="h-8 text-sm w-24"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveCondMutation.mutate({ id: cond.id, ...editCondForm })}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCondId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={editCondForm.help_text}
                      onChange={(e) =>
                        setEditCondForm({ ...editCondForm, help_text: e.target.value })
                      }
                      placeholder="Texto de ajuda (opcional)"
                      className="text-sm"
                      rows={2}
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
                      <Checkbox
                        checked={editCondForm.is_required}
                        onCheckedChange={(v) =>
                          setEditCondForm({ ...editCondForm, is_required: v === true })
                        }
                      />
                      <span>Obrigatório</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{cond.condition_name}</span>
                        {cond.is_required === false ? (
                          <Badge variant="outline" className="text-[10px]">opcional</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                            obrigatório
                          </Badge>
                        )}
                      </div>
                      {cond.help_text && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {cond.help_text}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <Percent className="h-3 w-3 mr-1" />
                      {cond.discount_percentage}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCondId(cond.id);
                        setEditCondForm({
                          condition_name: cond.condition_name,
                          discount_percentage: cond.discount_percentage,
                          help_text: (cond as any).help_text ?? "",
                          is_required: (cond as any).is_required !== false,
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover "${cond.condition_name}"?`))
                          deleteCondMutation.mutate(cond.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SEÇÃO 2: Categorias de Defeitos (1:N opções)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" /> Categorias de Defeitos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada categoria pode ter várias opções de resposta. Cada opção define uma dedução em
              R$ ou inviabiliza a compra.
            </p>
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
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Bateria, Tela, Carcaça"
                className="mt-1"
                autoFocus
              />
            </div>
            <Button
              onClick={() => saveCatMutation.mutate({ name: newCatName })}
              disabled={!newCatName || saveCatMutation.isPending}
            >
              <Check className="mr-1 h-4 w-4" /> Criar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCat(false);
                setNewCatName("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Categories accordion */}
        <div className="border rounded-lg overflow-hidden divide-y">
          {categories.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhuma categoria cadastrada.
            </p>
          )}
          {categories.map((cat) => {
            const options = getOptionsForCat(cat.id);
            const isExpanded = expandedCat === cat.id;
            const isEditing = editingCatId === cat.id;
            const draft = getNewOptionDraft(cat.id);

            return (
              <div key={cat.id} className="bg-card">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
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
                    {options.length} {options.length === 1 ? "opção" : "opções"}
                  </Badge>

                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveCatMutation.mutate({ id: cat.id, name: catForm.name })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingCatId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCatForm({ name: cat.name });
                            setEditingCatId(cat.id);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (
                              confirm(`Remover "${cat.name}" e todas as suas opções?`)
                            )
                              deleteCatMutation.mutate(cat.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 ml-7 border-t border-dashed space-y-4">
                    {/* Options list */}
                    <div className="space-y-2">
                      {options.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-2">
                          Nenhuma opção cadastrada. Adicione opções abaixo.
                        </p>
                      )}
                      {options.map((opt) => {
                        const isOptEditing = editingOptId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                              opt.is_rejected
                                ? "bg-destructive/5 border-destructive/20"
                                : "bg-muted/30 border-transparent"
                            }`}
                          >
                            {isOptEditing ? (
                              <>
                                <Input
                                  value={editOptForm.option_name}
                                  onChange={(e) =>
                                    setEditOptForm({ ...editOptForm, option_name: e.target.value })
                                  }
                                  className="h-8 text-sm flex-1"
                                  placeholder="Nome da opção"
                                  autoFocus
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={editOptForm.deduction_value}
                                  onChange={(e) =>
                                    setEditOptForm({
                                      ...editOptForm,
                                      deduction_value: Number(e.target.value),
                                    })
                                  }
                                  className="h-8 text-sm w-24"
                                  disabled={editOptForm.is_rejected}
                                />
                                <div className="flex items-center gap-1.5 px-2">
                                  <Switch
                                    checked={editOptForm.is_rejected}
                                    onCheckedChange={(v) =>
                                      setEditOptForm({ ...editOptForm, is_rejected: v })
                                    }
                                  />
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    Inviabiliza
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    saveOptionMutation.mutate({
                                      id: opt.id,
                                      damage_category_id: cat.id,
                                      ...editOptForm,
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingOptId(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {opt.is_rejected ? (
                                  <Ban className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                ) : (
                                  <DollarSign className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-foreground flex-1">
                                  {opt.option_name}
                                </span>
                                {opt.is_rejected ? (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Inviabiliza
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    R${" "}
                                    {opt.deduction_value?.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOptId(opt.id);
                                    setEditOptForm({
                                      option_name: opt.option_name,
                                      deduction_value: Number(opt.deduction_value) || 0,
                                      is_rejected: opt.is_rejected,
                                    });
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Remover opção "${opt.option_name}"?`))
                                      deleteOptionMutation.mutate(opt.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* New option inline form */}
                    <div className="bg-background border border-dashed rounded-md p-3 space-y-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Adicionar nova opção
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Nome da opção</Label>
                          <Input
                            value={draft.option_name}
                            onChange={(e) =>
                              updateNewOptionDraft(cat.id, { option_name: e.target.value })
                            }
                            placeholder="Ex: 91-100%, Trinco leve..."
                            className="mt-1 h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Dedução (R$)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={draft.deduction_value}
                            onChange={(e) =>
                              updateNewOptionDraft(cat.id, {
                                deduction_value: Number(e.target.value),
                              })
                            }
                            disabled={draft.is_rejected}
                            className="mt-1 h-9 text-sm"
                          />
                        </div>
                        <div className="flex flex-col items-start sm:items-center justify-end gap-1 sm:pb-1">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">
                            Inviabiliza compra
                          </Label>
                          <Switch
                            checked={draft.is_rejected}
                            onCheckedChange={(v) =>
                              updateNewOptionDraft(cat.id, { is_rejected: v })
                            }
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          saveOptionMutation.mutate({
                            damage_category_id: cat.id,
                            option_name: draft.option_name.trim(),
                            deduction_value: draft.is_rejected ? 0 : draft.deduction_value,
                            is_rejected: draft.is_rejected,
                          })
                        }
                        disabled={!draft.option_name.trim() || saveOptionMutation.isPending}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar opção
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SEÇÃO 3: Motivos de Rejeição (Hard Stops globais)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Motivos de Rejeição
              <span className="text-xs font-normal text-muted-foreground">(Não comprar se...)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Condições gerais que bloqueiam imediatamente a compra. Ao selecionar uma destas
              opções, o cliente é informado que o aparelho não pode ser adquirido.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowNewRejection(true)}
            disabled={showNewRejection}
          >
            <Plus className="h-4 w-4 mr-1" /> Novo Motivo
          </Button>
        </div>

        {/* New rejection form */}
        {showNewRejection && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-sm">Nome do motivo</Label>
              <Input
                value={rejectionName}
                onChange={(e) => setRejectionName(e.target.value)}
                placeholder='Ex: "Não estiver ligando", "Estiver bloqueado"'
                className="mt-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && rejectionName.trim()) {
                    saveRejectionMutation.mutate({ condition_name: rejectionName.trim() });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Salvo automaticamente como rejeição (100% de bloqueio).
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  saveRejectionMutation.mutate({ condition_name: rejectionName.trim() })
                }
                disabled={!rejectionName.trim() || saveRejectionMutation.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowNewRejection(false);
                  setRejectionName("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Rejection list */}
        <div className="border border-destructive/20 rounded-lg overflow-hidden divide-y divide-destructive/10">
          {rejectionReasons.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum motivo de rejeição cadastrado.
            </p>
          )}
          {rejectionReasons.map((rej) => {
            const isEditing = editingRejId === rej.id;
            return (
              <div
                key={rej.id}
                className="flex items-center gap-3 px-4 py-3 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
                {isEditing ? (
                  <>
                    <Input
                      value={editRejName}
                      onChange={(e) => setEditRejName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        saveRejectionMutation.mutate({
                          id: rej.id,
                          condition_name: editRejName.trim(),
                        })
                      }
                      disabled={!editRejName.trim()}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingRejId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground flex-1">{rej.condition_name}</span>
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Hard Stop
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRejId(rej.id);
                        setEditRejName(rej.condition_name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover "${rej.condition_name}"?`))
                          deleteCondMutation.mutate(rej.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
