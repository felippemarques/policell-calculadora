import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronRight,
  Percent, DollarSign, Ban, ShieldAlert, Copy, Upload, ImageIcon, GitBranch, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { OrderArrows } from "@/components/admin/catalog/OrderArrows";
import { ModelMultiSelect } from "@/components/admin/catalog/ModelMultiSelect";
import { YouTubeUrlInput } from "@/components/admin/catalog/YouTubeUrlInput";
import { DiscountImpactSimulator } from "@/components/admin/catalog/DiscountImpactSimulator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DiscountMode } from "@/lib/trade-in-pricing";
import { toast } from "sonner";

type DamageOption = {
  id: string;
  damage_category_id: string;
  option_name: string;
  deduction_value: number;
  deduction_percent: number;
  deduction_mode: DiscountMode;
  is_rejected: boolean;
  display_order: number;
};

type DamageCategory = {
  id: string;
  name: string;
  help_text: string | null;
  help_image_url: string | null;
  is_required: boolean;
  parent_id: string | null;
  parent_option_id: string | null;
  display_order: number;
  brand_ids: string[];
  model_ids: string[];
  youtube_url: string | null;
};

type Brand = { id: string; name: string };

const BUCKET = "lp-images";
const STORAGE_FOLDER = "damage-categories";

export function DefectsTab() {
  const qc = useQueryClient();

  // ── Categories state ──
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set());
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    help_text: "",
    help_image_url: "",
    is_required: true,
    brand_ids: [] as string[],
    model_ids: [] as string[],
    youtube_url: "",
  });
  // String forms:
  //   "__root__"         → new top-level category
  //   "<categoryId>"     → new subcategory under a parent category
  //   "option:<optId>"   → new conditional subcategory triggered by a damage option
  const [showNewCatForParent, setShowNewCatForParent] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({
    name: "",
    help_text: "",
    help_image_url: "",
    is_required: true,
    brand_ids: [] as string[],
    model_ids: [] as string[],
    youtube_url: "",
  });
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  // ── Damage option state (per-category) ──
  const [newOptionByCat, setNewOptionByCat] = useState<
    Record<string, { option_name: string; deduction_value: number; deduction_percent: number; deduction_mode: DiscountMode; is_rejected: boolean }>
  >({});
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editOptForm, setEditOptForm] = useState({
    option_name: "",
    deduction_value: 0,
    deduction_percent: 0,
    deduction_mode: "fixed" as DiscountMode,
    is_rejected: false,
  });

  // ── Condition (normal) state ──
  const [showNewCondition, setShowNewCondition] = useState(false);
  const [condForm, setCondForm] = useState({
    condition_name: "",
    discount_percentage: 0,
    discount_fixed: 0,
    discount_mode: "percent" as DiscountMode,
    help_text: "",
    is_required: true,
    model_ids: [] as string[],
    youtube_url: "",
  });
  const [editingCondId, setEditingCondId] = useState<string | null>(null);
  const [editCondForm, setEditCondForm] = useState({
    condition_name: "",
    discount_percentage: 0,
    discount_fixed: 0,
    discount_mode: "percent" as DiscountMode,
    help_text: "",
    is_required: true,
    model_ids: [] as string[],
    youtube_url: "",
  });

  // ── Rejection reason state ──
  const [showNewRejection, setShowNewRejection] = useState(false);
  const [rejectionName, setRejectionName] = useState("");
  const [rejectionModelIds, setRejectionModelIds] = useState<string[]>([]);
  const [rejectionYoutube, setRejectionYoutube] = useState("");
  const [editingRejId, setEditingRejId] = useState<string | null>(null);
  const [editRejName, setEditRejName] = useState("");
  const [editRejModelIds, setEditRejModelIds] = useState<string[]>([]);
  const [editRejYoutube, setEditRejYoutube] = useState("");

  // ── Queries ──
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        brand_ids: Array.isArray(c.brand_ids) ? c.brand_ids : [],
      })) as DamageCategory[];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-brands-for-defects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("display_order");
      if (error) throw error;
      return (data || []) as Brand[];
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

  const toggleExpanded = (id: string) => {
    setExpandedCat((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Image upload helper ──
  const uploadImage = async (file: File, contextId: string): Promise<string | null> => {
    setUploadingFor(contextId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${STORAGE_FOLDER}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return pub.publicUrl;
    } catch (e: any) {
      toast.error(`Falha ao enviar imagem: ${e.message}`);
      return null;
    } finally {
      setUploadingFor(null);
    }
  };

  // ── Category mutations ──
  const saveCatMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      help_text: string;
      help_image_url: string;
      is_required: boolean;
      brand_ids?: string[];
      model_ids?: string[];
      youtube_url?: string;
      parent_id?: string | null;
      parent_option_id?: string | null;
    }) => {
      const isRoot = (data.parent_id ?? null) === null && (data.parent_option_id ?? null) === null;
      const payload: any = {
        name: data.name,
        help_text: data.help_text?.trim() || null,
        help_image_url: data.help_image_url?.trim() || null,
        is_required: data.is_required,
        // brand_ids only meaningful for root categories
        brand_ids: isRoot ? data.brand_ids ?? [] : [],
        model_ids: data.model_ids ?? [],
        youtube_url: data.youtube_url?.trim() || null,
      };
      if (data.id) {
        const { error } = await supabase
          .from("damage_categories")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Compute display_order = max+1 within siblings of same scope
        const siblings = categories.filter((c) => {
          if (data.parent_option_id) return c.parent_option_id === data.parent_option_id;
          return (c.parent_id ?? null) === (data.parent_id ?? null) && !c.parent_option_id;
        });
        const maxOrder = siblings.length ? Math.max(...siblings.map((s) => s.display_order)) + 1 : 0;
        const { error } = await supabase.from("damage_categories").insert({
          ...payload,
          parent_id: data.parent_id ?? null,
          parent_option_id: data.parent_option_id ?? null,
          display_order: maxOrder,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setEditingCatId(null);
      setShowNewCatForParent(null);
      setNewCat({ name: "", help_text: "", help_image_url: "", is_required: true, brand_ids: [], model_ids: [], youtube_url: "" });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      // Recursively collect ids: this category + its descendants
      const collect = (rootId: string): string[] => {
        const children = categories.filter((c) => c.parent_id === rootId).map((c) => c.id);
        return [rootId, ...children.flatMap(collect)];
      };
      const idsToDelete = collect(id);
      // Delete options first
      await supabase.from("damage_deductions").delete().in("damage_category_id", idsToDelete);
      // Delete categories (children first to be safe even though FK is set null in our schema)
      // Order: deepest first — reverse list works since we collected DFS root-first
      const reversed = [...idsToDelete].reverse();
      for (const cid of reversed) {
        const { error } = await supabase.from("damage_categories").delete().eq("id", cid);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Duplicate: copia categoria + opções (sem subcategorias para evitar surpresas)
  const duplicateCatMutation = useMutation({
    mutationFn: async (cat: DamageCategory) => {
      const siblings = categories.filter((c) => (c.parent_id ?? null) === (cat.parent_id ?? null));
      const maxOrder = siblings.length ? Math.max(...siblings.map((s) => s.display_order)) + 1 : 0;
      const { data: inserted, error } = await supabase
        .from("damage_categories")
        .insert({
          name: `${cat.name} (Cópia)`,
          help_text: cat.help_text,
          help_image_url: cat.help_image_url,
          is_required: cat.is_required,
          parent_id: cat.parent_id,
          display_order: maxOrder,
          brand_ids: cat.parent_id === null ? cat.brand_ids ?? [] : [],
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      const newId = inserted.id as string;

      const opts = deductions.filter((d) => d.damage_category_id === cat.id);
      if (opts.length) {
        const { error: e2 } = await supabase.from("damage_deductions").insert(
          opts.map((o) => ({
            damage_category_id: newId,
            option_name: o.option_name,
            deduction_value: o.deduction_value,
            is_rejected: o.is_rejected,
            display_order: o.display_order,
          })),
        );
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Categoria duplicada!");
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
      deduction_percent: number;
      deduction_mode: DiscountMode;
      is_rejected: boolean;
    }) => {
      const payload: any = {
        option_name: data.option_name,
        deduction_value: data.deduction_mode === "fixed" ? data.deduction_value : 0,
        deduction_percent: data.deduction_mode === "percent" ? data.deduction_percent : 0,
        deduction_mode: data.deduction_mode,
        is_rejected: data.is_rejected,
      };
      if (data.id) {
        const { error } = await supabase
          .from("damage_deductions")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const catOptions = deductions.filter((d) => d.damage_category_id === data.damage_category_id);
        const maxOrder =
          catOptions.length > 0 ? Math.max(...catOptions.map((o) => o.display_order)) + 1 : 0;
        const { error } = await supabase.from("damage_deductions").insert({
          ...payload,
          damage_category_id: data.damage_category_id,
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
        [vars.damage_category_id]: { option_name: "", deduction_value: 0, deduction_percent: 0, deduction_mode: "fixed", is_rejected: false },
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
      discount_fixed: number;
      discount_mode: DiscountMode;
      help_text: string;
      is_required: boolean;
      model_ids: string[];
      youtube_url: string;
    }) => {
      const payload: any = {
        condition_name: data.condition_name,
        discount_percentage: data.discount_mode === "percent" ? data.discount_percentage : 0,
        discount_fixed: data.discount_mode === "fixed" ? data.discount_fixed : 0,
        discount_mode: data.discount_mode,
        is_rejected: false,
        help_text: data.help_text?.trim() || null,
        is_required: data.is_required,
        model_ids: data.model_ids ?? [],
        youtube_url: data.youtube_url?.trim() || null,
      };
      if (data.id) {
        const { error } = await supabase
          .from("condition_discounts")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder =
          conditions.length > 0 ? Math.max(...conditions.map((c) => c.display_order)) + 1 : 0;
        const { error } = await supabase
          .from("condition_discounts")
          .insert({ ...payload, display_order: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewCondition(false);
      setEditingCondId(null);
      setCondForm({ condition_name: "", discount_percentage: 0, discount_fixed: 0, discount_mode: "percent", help_text: "", is_required: true, model_ids: [], youtube_url: "" });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Rejection mutations ──
  const saveRejectionMutation = useMutation({
    mutationFn: async (data: { id?: string; condition_name: string; model_ids: string[]; youtube_url: string }) => {
      const base: any = {
        condition_name: data.condition_name,
        discount_percentage: 100,
        is_rejected: true,
        model_ids: data.model_ids ?? [],
        youtube_url: data.youtube_url?.trim() || null,
      };
      if (data.id) {
        const { error } = await supabase
          .from("condition_discounts")
          .update(base)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder =
          conditions.length > 0 ? Math.max(...conditions.map((c) => c.display_order)) + 1 : 0;
        const { error } = await supabase.from("condition_discounts").insert({
          ...base,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setShowNewRejection(false);
      setRejectionName("");
      setRejectionModelIds([]);
      setRejectionYoutube("");
      setEditingRejId(null);
      setEditRejName("");
      setEditRejModelIds([]);
      setEditRejYoutube("");
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

  // Toggle is_active for any of the 3 evaluation tables (item-level visibility on calculator)
  const toggleActiveMutation = useMutation({
    mutationFn: async (params: {
      table: "damage_categories" | "condition_discounts";
      id: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from(params.table)
        .update({ is_active: params.is_active })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateAll();
      toast.success(vars.is_active ? "Visível na calculadora" : "Oculto da calculadora");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getOptionsForCat = (catId: string) =>
    deductions.filter((d) => d.damage_category_id === catId);

  const getNewOptionDraft = (catId: string) =>
    newOptionByCat[catId] || { option_name: "", deduction_value: 0, deduction_percent: 0, deduction_mode: "fixed" as DiscountMode, is_rejected: false };

  const updateNewOptionDraft = (
    catId: string,
    patch: Partial<{ option_name: string; deduction_value: number; deduction_percent: number; deduction_mode: DiscountMode; is_rejected: boolean }>,
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

  // Helper: render new-category form (shared between root, per-parent, and per-option contexts)
  const renderNewCatForm = (
    parentId: string | null,
    parentOptionId: string | null = null,
  ) => {
    const isOptionTriggered = !!parentOptionId;
    return (
      <div
        className={`bg-card border rounded-lg p-4 space-y-3 ${
          isOptionTriggered ? "border-primary/40 bg-primary/5" : ""
        }`}
      >
        <div>
          <Label>
            {isOptionTriggered
              ? "Nome da sub-pergunta condicional"
              : parentId
                ? "Nome da subcategoria"
                : "Nome da categoria"}
          </Label>
          <Input
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            placeholder={
              isOptionTriggered
                ? 'Ex: "Quantos riscos?", "É original?"'
                : parentId
                  ? 'Ex: "É Tela Original?"'
                  : "Ex: Bateria, Tela, Carcaça"
            }
            className="mt-1"
            autoFocus
          />
          {isOptionTriggered && (
            <p className="text-[11px] text-primary mt-1.5">
              Esta pergunta só aparecerá ao cliente quando ele selecionar a opção acima.
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm">Observação / Explicação (opcional)</Label>
          <Textarea
            value={newCat.help_text}
            onChange={(e) => setNewCat({ ...newCat, help_text: e.target.value })}
            placeholder='Ex: "Alto-falante baixo" significa volume reduzido perceptível.'
            className="mt-1 text-sm"
            rows={2}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Exibido como tooltip "?" ao lado do nome no formulário do cliente.
          </p>
        </div>
        <ImageUploadField
          value={newCat.help_image_url}
          uploading={uploadingFor === "__new__"}
          onUpload={async (file) => {
            const url = await uploadImage(file, "__new__");
            if (url) setNewCat((p) => ({ ...p, help_image_url: url }));
          }}
          onClear={() => setNewCat((p) => ({ ...p, help_image_url: "" }))}
        />
        {parentId === null && !isOptionTriggered && (
          <BrandsMultiSelect
            brands={brands}
            selected={newCat.brand_ids}
            onChange={(ids) => setNewCat({ ...newCat, brand_ids: ids })}
          />
        )}
        <ModelMultiSelect
          selected={newCat.model_ids}
          onChange={(ids) => setNewCat({ ...newCat, model_ids: ids })}
          label="Modelos aplicáveis (opcional)"
          compact
        />
        <YouTubeUrlInput
          value={newCat.youtube_url}
          onChange={(v) => setNewCat({ ...newCat, youtube_url: v })}
        />
        <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
          <Checkbox
            checked={newCat.is_required}
            onCheckedChange={(v) => setNewCat({ ...newCat, is_required: v === true })}
          />
          <span>Obrigatório (cliente precisa responder antes de avançar)</span>
        </label>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              saveCatMutation.mutate({
                ...newCat,
                parent_id: parentId,
                parent_option_id: parentOptionId,
              })
            }
            disabled={!newCat.name || saveCatMutation.isPending}
          >
            <Check className="mr-1 h-4 w-4" /> Criar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowNewCatForParent(null);
              setNewCat({ name: "", help_text: "", help_image_url: "", is_required: true, brand_ids: [], model_ids: [], youtube_url: "" });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Recursive render of a category and its children
  const renderCategoryNode = (cat: DamageCategory, depth: number) => {
    const options = getOptionsForCat(cat.id);
    const isExpanded = expandedCat.has(cat.id);
    const isEditing = editingCatId === cat.id;
    const draft = getNewOptionDraft(cat.id);
    const children = categories
      .filter((c) => c.parent_id === cat.id && !c.parent_option_id)
      .sort((a, b) => a.display_order - b.display_order);
    const siblings = categories.filter((c) => (c.parent_id ?? null) === (cat.parent_id ?? null) && !c.parent_option_id);

    return (
      <div key={cat.id} className="bg-card">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          style={{ paddingLeft: 16 + depth * 24 }}
          onClick={() => toggleExpanded(cat.id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {depth > 0 ? (
            <GitBranch className="h-4 w-4 text-primary/70 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}

          {isEditing ? (
            <Input
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="h-8 text-sm flex-1"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{cat.name}</span>
                {depth > 0 && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    sub
                  </Badge>
                )}
                {cat.is_required === false ? (
                  <Badge variant="outline" className="text-[10px]">opcional</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                    obrigatório
                  </Badge>
                )}
                {cat.help_image_url && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <ImageIcon className="h-2.5 w-2.5" /> imagem
                  </Badge>
                )}
                {!cat.parent_id && cat.brand_ids && cat.brand_ids.length > 0 && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {cat.brand_ids.length === 1 ? "1 marca" : `${cat.brand_ids.length} marcas`}
                  </Badge>
                )}
              </div>
              {cat.help_text && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {cat.help_text}
                </p>
              )}
            </div>
          )}

          <Badge variant="secondary" className="text-xs flex-shrink-0">
            {options.length} {options.length === 1 ? "opção" : "opções"}
          </Badge>

          <div
            className="flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!isEditing && (
              <OrderArrows
                table="damage_categories"
                rows={siblings}
                currentId={cat.id}
                queryKey={["admin-damage-categories"]}
              />
            )}
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => saveCatMutation.mutate({ id: cat.id, ...catForm })}
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
                  title="Duplicar categoria"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateCatMutation.mutate(cat);
                  }}
                  disabled={duplicateCatMutation.isPending}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Editar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatForm({
                      name: cat.name,
                      help_text: cat.help_text ?? "",
                      help_image_url: cat.help_image_url ?? "",
                      is_required: cat.is_required !== false,
                      brand_ids: Array.isArray(cat.brand_ids) ? cat.brand_ids : [],
                      model_ids: Array.isArray((cat as any).model_ids) ? (cat as any).model_ids : [],
                      youtube_url: (cat as any).youtube_url ?? "",
                    });
                    setEditingCatId(cat.id);
                    setExpandedCat((prev) => new Set(prev).add(cat.id));
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  title="Remover"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Remover "${cat.name}"${
                          children.length ? ` e ${children.length} subcategoria(s)` : ""
                        } e todas as opções?`,
                      )
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

        {/* Edit panel (image + help_text shown on edit) */}
        {isEditing && (
          <div
            className="px-4 pb-4 pt-2 border-t border-dashed space-y-3 bg-muted/20"
            style={{ paddingLeft: 16 + depth * 24 + 28 }}
          >
            <div>
              <Label className="text-sm">Observação / Explicação</Label>
              <Textarea
                value={catForm.help_text}
                onChange={(e) => setCatForm({ ...catForm, help_text: e.target.value })}
                placeholder="Ex: Detalhes que o cliente precisa saber sobre este critério."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
            <ImageUploadField
              value={catForm.help_image_url}
              uploading={uploadingFor === cat.id}
              onUpload={async (file) => {
                const url = await uploadImage(file, cat.id);
                if (url) setCatForm((p) => ({ ...p, help_image_url: url }));
              }}
              onClear={() => setCatForm((p) => ({ ...p, help_image_url: "" }))}
            />
            {!cat.parent_id && (
              <BrandsMultiSelect
                brands={brands}
                selected={catForm.brand_ids}
                onChange={(ids) => setCatForm({ ...catForm, brand_ids: ids })}
              />
            )}
            <ModelMultiSelect
              selected={catForm.model_ids}
              onChange={(ids) => setCatForm({ ...catForm, model_ids: ids })}
              label="Modelos aplicáveis (opcional)"
              compact
            />
            <YouTubeUrlInput
              value={catForm.youtube_url}
              onChange={(v) => setCatForm({ ...catForm, youtube_url: v })}
            />
            <label className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <Checkbox
                checked={catForm.is_required}
                onCheckedChange={(v) => setCatForm({ ...catForm, is_required: v === true })}
              />
              <span>Obrigatório</span>
            </label>
          </div>
        )}

        {/* Expanded panel — options + subcategory area */}
        {isExpanded && !isEditing && (
          <div
            className="px-4 pb-4 pt-2 border-t border-dashed space-y-4 bg-muted/10"
            style={{ paddingLeft: 16 + depth * 24 + 28 }}
          >
            {/* Help image preview */}
            {cat.help_image_url && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Imagem explicativa
                </Label>
                <img
                  src={cat.help_image_url}
                  alt={cat.name}
                  className="max-h-40 rounded-md border bg-background object-contain"
                />
              </div>
            )}

            {/* Options list */}
            <div className="space-y-2">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Opções de resposta
              </Label>
              {options.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2">
                  Nenhuma opção cadastrada.
                </p>
              )}
              {options.map((opt) => {
                const isOptEditing = editingOptId === opt.id;
                const optChildren = categories
                  .filter((c) => c.parent_option_id === opt.id)
                  .sort((a, b) => a.display_order - b.display_order);
                return (
                  <div key={opt.id} className="space-y-2">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                        opt.is_rejected
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-card border-transparent"
                      }`}
                    >
                      {isOptEditing ? (
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Input
                              value={editOptForm.option_name}
                              onChange={(e) =>
                                setEditOptForm({ ...editOptForm, option_name: e.target.value })
                              }
                              className="h-8 text-sm flex-1 min-w-[140px]"
                              placeholder="Nome da opção"
                              autoFocus
                            />
                            <ToggleGroup
                              type="single"
                              size="sm"
                              value={editOptForm.deduction_mode}
                              onValueChange={(v) =>
                                v && setEditOptForm({ ...editOptForm, deduction_mode: v as DiscountMode })
                              }
                              className="h-8"
                            >
                              <ToggleGroupItem value="fixed" className="h-8 px-2 text-xs">R$</ToggleGroupItem>
                              <ToggleGroupItem value="percent" className="h-8 px-2 text-xs">%</ToggleGroupItem>
                            </ToggleGroup>
                            {editOptForm.deduction_mode === "fixed" ? (
                              <CurrencyInput
                                value={editOptForm.deduction_value}
                                onValueChange={(v) =>
                                  setEditOptForm({ ...editOptForm, deduction_value: v })
                                }
                                className="h-8 text-sm w-32"
                                disabled={editOptForm.is_rejected}
                              />
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                step={0.1}
                                value={editOptForm.deduction_percent}
                                onChange={(e) =>
                                  setEditOptForm({ ...editOptForm, deduction_percent: Number(e.target.value) })
                                }
                                className="h-8 text-sm w-24"
                                placeholder="%"
                                disabled={editOptForm.is_rejected}
                              />
                            )}
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
                            <Button variant="ghost" size="sm" onClick={() => setEditingOptId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {!editOptForm.is_rejected && (
                            <DiscountImpactSimulator
                              mode={editOptForm.deduction_mode}
                              value={
                                editOptForm.deduction_mode === "fixed"
                                  ? editOptForm.deduction_value
                                  : editOptForm.deduction_percent
                              }
                              title="Impacto da opção"
                            />
                          )}
                        </div>
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
                          {optChildren.length > 0 && (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1">
                              <GitBranch className="h-2.5 w-2.5" />
                              {optChildren.length} sub
                            </Badge>
                          )}
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
                          {!opt.is_rejected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Adicionar sub-pergunta condicional para esta opção"
                              className="text-primary hover:text-primary"
                              onClick={() => {
                                setNewCat({
                                  name: "",
                                  help_text: "",
                                  help_image_url: "",
                                  is_required: true,
                                  brand_ids: [], model_ids: [], youtube_url: "",
                                });
                                setShowNewCatForParent(`option:${opt.id}`);
                              }}
                              disabled={showNewCatForParent === `option:${opt.id}`}
                            >
                              <GitBranch className="h-3.5 w-3.5 mr-1" />
                              <span className="text-[11px]">Sub-pergunta</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingOptId(opt.id);
                              setEditOptForm({
                                option_name: opt.option_name,
                                deduction_value: Number(opt.deduction_value) || 0,
                                deduction_percent: Number((opt as any).deduction_percent) || 0,
                                deduction_mode: ((opt as any).deduction_mode as DiscountMode) || "fixed",
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

                    {/* Conditional sub-questions triggered by THIS option */}
                    {showNewCatForParent === `option:${opt.id}` && (
                      <div className="ml-6 border-l-2 border-primary/30 pl-3">
                        {renderNewCatForm(null, opt.id)}
                      </div>
                    )}
                    {optChildren.length > 0 && (
                      <div className="ml-6 border-l-2 border-primary/30 pl-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
                          ↳ Sub-perguntas (aparecem se "{opt.option_name}" for selecionada)
                        </p>
                        <div className="border rounded-md overflow-hidden divide-y bg-card">
                          {optChildren.map((child) => renderCategoryNode(child, depth + 1))}
                        </div>
                      </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_140px_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da opção</Label>
                  <Input
                    value={draft.option_name}
                    onChange={(e) =>
                      updateNewOptionDraft(cat.id, { option_name: e.target.value })
                    }
                    placeholder="Ex: Sim, Não, 91-100%, Trinco leve..."
                    className="mt-1 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <ToggleGroup
                    type="single"
                    size="sm"
                    value={draft.deduction_mode}
                    onValueChange={(v) =>
                      v && updateNewOptionDraft(cat.id, { deduction_mode: v as DiscountMode })
                    }
                    className="mt-1 h-9"
                  >
                    <ToggleGroupItem value="fixed" className="h-9 px-3 text-xs">R$</ToggleGroupItem>
                    <ToggleGroupItem value="percent" className="h-9 px-3 text-xs">%</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {draft.deduction_mode === "fixed" ? "Dedução (R$)" : "Dedução (%)"}
                  </Label>
                  {draft.deduction_mode === "fixed" ? (
                    <CurrencyInput
                      value={draft.deduction_value}
                      onValueChange={(v) =>
                        updateNewOptionDraft(cat.id, { deduction_value: v })
                      }
                      disabled={draft.is_rejected}
                      className="mt-1 h-9 text-sm"
                    />
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={draft.deduction_percent}
                      onChange={(e) =>
                        updateNewOptionDraft(cat.id, { deduction_percent: Number(e.target.value) })
                      }
                      disabled={draft.is_rejected}
                      className="mt-1 h-9 text-sm"
                      placeholder="%"
                    />
                  )}
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
              {!draft.is_rejected && (
                <DiscountImpactSimulator
                  mode={draft.deduction_mode}
                  value={
                    draft.deduction_mode === "fixed"
                      ? draft.deduction_value
                      : draft.deduction_percent
                  }
                  title="Impacto desta opção"
                />
              )}
              <Button
                size="sm"
                onClick={() =>
                  saveOptionMutation.mutate({
                    damage_category_id: cat.id,
                    option_name: draft.option_name.trim(),
                    deduction_value: draft.is_rejected ? 0 : draft.deduction_value,
                    deduction_percent: draft.is_rejected ? 0 : draft.deduction_percent,
                    deduction_mode: draft.deduction_mode,
                    is_rejected: draft.is_rejected,
                  })
                }
                disabled={!draft.option_name.trim() || saveOptionMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar opção
              </Button>
            </div>

            {/* Subcategory area */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" /> Subcategorias
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewCat({ name: "", help_text: "", help_image_url: "", is_required: true, brand_ids: [], model_ids: [], youtube_url: "" });
                    setShowNewCatForParent(cat.id);
                  }}
                  disabled={showNewCatForParent === cat.id}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nova subcategoria
                </Button>
              </div>
              {showNewCatForParent === cat.id && renderNewCatForm(cat.id)}
              {children.length > 0 && (
                <div className="border rounded-md overflow-hidden divide-y">
                  {children.map((child) => renderCategoryNode(child, depth + 1))}
                </div>
              )}
              {children.length === 0 && showNewCatForParent !== cat.id && (
                <p className="text-xs text-muted-foreground italic py-1">
                  Sem subcategorias. Use para criar regras dependentes (ex: "É Tela Original?").
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootCategories = categories
    .filter((c) => c.parent_id === null && !c.parent_option_id)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-10">
      {/* ═══════════════════════════════════════════════
          SEÇÃO 1: Condições do Aparelho (% normais)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" /> Categorias de Defeitos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Itens com desconto fixo ou percentual aplicados ao preço base.
            </p>
          </div>
          <Button size="sm" onClick={() => { setShowNewCondition(true); setEditingCondId(null); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Condição
          </Button>
        </div>

        {showNewCondition && (
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_180px] gap-3 items-end">
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
                <Label className="text-sm">Tipo</Label>
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={condForm.discount_mode}
                  onValueChange={(v) =>
                    v && setCondForm({ ...condForm, discount_mode: v as DiscountMode })
                  }
                  className="mt-1 h-10"
                >
                  <ToggleGroupItem value="percent" className="h-10 px-3 text-xs">%</ToggleGroupItem>
                  <ToggleGroupItem value="fixed" className="h-10 px-3 text-xs">R$</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="text-sm">
                  {condForm.discount_mode === "percent" ? "Desconto (%)" : "Desconto (R$)"}
                </Label>
                {condForm.discount_mode === "percent" ? (
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
                ) : (
                  <CurrencyInput
                    value={condForm.discount_fixed}
                    onValueChange={(v) => setCondForm({ ...condForm, discount_fixed: v })}
                    className="mt-1"
                  />
                )}
              </div>
            </div>
            <DiscountImpactSimulator
              mode={condForm.discount_mode}
              value={
                condForm.discount_mode === "percent"
                  ? condForm.discount_percentage
                  : condForm.discount_fixed
              }
            />
            <div>
              <Label className="text-sm">Texto de ajuda (opcional)</Label>
              <Textarea
                value={condForm.help_text}
                onChange={(e) => setCondForm({ ...condForm, help_text: e.target.value })}
                placeholder="Ex: Sem riscos visíveis, todas as funções operando perfeitamente."
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModelMultiSelect
                selected={condForm.model_ids}
                onChange={(ids) => setCondForm({ ...condForm, model_ids: ids })}
              />
              <YouTubeUrlInput
                value={condForm.youtube_url}
                onChange={(v) => setCondForm({ ...condForm, youtube_url: v })}
              />
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

        <div className="border rounded-lg overflow-hidden divide-y">
          {normalConditions.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhuma condição cadastrada.
            </p>
          )}
          {normalConditions.map((cond) => {
            const isEditing = editingCondId === cond.id;
            return (
              <div key={cond.id} className="px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        value={editCondForm.condition_name}
                        onChange={(e) =>
                          setEditCondForm({ ...editCondForm, condition_name: e.target.value })
                        }
                        className="h-8 text-sm flex-1 min-w-[140px]"
                        autoFocus
                      />
                      <ToggleGroup
                        type="single"
                        size="sm"
                        value={editCondForm.discount_mode}
                        onValueChange={(v) =>
                          v && setEditCondForm({ ...editCondForm, discount_mode: v as DiscountMode })
                        }
                        className="h-8"
                      >
                        <ToggleGroupItem value="percent" className="h-8 px-2 text-xs">%</ToggleGroupItem>
                        <ToggleGroupItem value="fixed" className="h-8 px-2 text-xs">R$</ToggleGroupItem>
                      </ToggleGroup>
                      {editCondForm.discount_mode === "percent" ? (
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
                      ) : (
                        <CurrencyInput
                          value={editCondForm.discount_fixed}
                          onValueChange={(v) =>
                            setEditCondForm({ ...editCondForm, discount_fixed: v })
                          }
                          className="h-8 text-sm w-32"
                        />
                      )}
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
                    <DiscountImpactSimulator
                      mode={editCondForm.discount_mode}
                      value={
                        editCondForm.discount_mode === "percent"
                          ? editCondForm.discount_percentage
                          : editCondForm.discount_fixed
                      }
                    />
                    <Textarea
                      value={editCondForm.help_text}
                      onChange={(e) =>
                        setEditCondForm({ ...editCondForm, help_text: e.target.value })
                      }
                      placeholder="Texto de ajuda (opcional)"
                      className="text-sm"
                      rows={2}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ModelMultiSelect
                        selected={editCondForm.model_ids}
                        onChange={(ids) => setEditCondForm({ ...editCondForm, model_ids: ids })}
                      />
                      <YouTubeUrlInput
                        value={editCondForm.youtube_url}
                        onChange={(v) => setEditCondForm({ ...editCondForm, youtube_url: v })}
                      />
                    </div>
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
                    {((cond as any).discount_mode === "fixed") ? (
                      <Badge variant="secondary" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        R$ {Number((cond as any).discount_fixed || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Percent className="h-3 w-3 mr-1" />
                        {cond.discount_percentage}%
                      </Badge>
                    )}
                    {Array.isArray((cond as any).model_ids) && (cond as any).model_ids.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {(cond as any).model_ids.length} modelo(s)
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCondId(cond.id);
                        setEditCondForm({
                          condition_name: cond.condition_name,
                          discount_percentage: cond.discount_percentage,
                          discount_fixed: Number((cond as any).discount_fixed) || 0,
                          discount_mode: ((cond as any).discount_mode as DiscountMode) || "percent",
                          help_text: (cond as any).help_text ?? "",
                          is_required: (cond as any).is_required !== false,
                          model_ids: Array.isArray((cond as any).model_ids) ? (cond as any).model_ids : [],
                          youtube_url: (cond as any).youtube_url ?? "",
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
          SEÇÃO 2: Categorias de Defeitos (com subcategorias)
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" /> Condições do Aparelho
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada categoria pode ter opções de resposta e subcategorias (ex: "É Tela Original?").
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setNewCat({ name: "", help_text: "", help_image_url: "", is_required: true, brand_ids: [], model_ids: [], youtube_url: "" });
              setShowNewCatForParent("__root__");
            }}
            disabled={showNewCatForParent === "__root__"}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Categoria
          </Button>
        </div>

        {showNewCatForParent === "__root__" && renderNewCatForm(null)}

        <div className="border rounded-lg overflow-hidden divide-y">
          {rootCategories.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhuma categoria cadastrada.
            </p>
          )}
          {rootCategories.map((cat) => renderCategoryNode(cat, 0))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SEÇÃO 3: Motivos de Rejeição
         ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Motivos de Rejeição
              <span className="text-xs font-normal text-muted-foreground">(Não comprar se...)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Condições gerais que bloqueiam imediatamente a compra.
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
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModelMultiSelect
                selected={rejectionModelIds}
                onChange={setRejectionModelIds}
              />
              <YouTubeUrlInput
                value={rejectionYoutube}
                onChange={setRejectionYoutube}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  saveRejectionMutation.mutate({ condition_name: rejectionName.trim(), model_ids: rejectionModelIds, youtube_url: rejectionYoutube })
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
                  setRejectionModelIds([]);
                  setRejectionYoutube("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

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
                className="px-4 py-3 bg-destructive/5 hover:bg-destructive/10 transition-colors"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
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
                            model_ids: editRejModelIds,
                            youtube_url: editRejYoutube,
                          })
                        }
                        disabled={!editRejName.trim()}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingRejId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                      <ModelMultiSelect
                        selected={editRejModelIds}
                        onChange={setEditRejModelIds}
                      />
                      <YouTubeUrlInput
                        value={editRejYoutube}
                        onChange={setEditRejYoutube}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="font-medium text-foreground flex-1">{rej.condition_name}</span>
                    {Array.isArray((rej as any).model_ids) && (rej as any).model_ids.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {(rej as any).model_ids.length} modelo(s)
                      </Badge>
                    )}
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
                        setEditRejModelIds(Array.isArray((rej as any).model_ids) ? (rej as any).model_ids : []);
                        setEditRejYoutube((rej as any).youtube_url ?? "");
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

// ─────────────────────────────────────────────────────
// Image upload reusable field
// ─────────────────────────────────────────────────────
function ImageUploadField({
  value,
  uploading,
  onUpload,
  onClear,
}: {
  value: string;
  uploading: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-sm flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" /> Imagem explicativa (opcional)
      </Label>
      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt="Pré-visualização"
            className="h-24 w-24 rounded-md border object-cover bg-background"
          />
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Enviando…</>
              ) : (
                <><Upload className="h-3.5 w-3.5 mr-1" /> Trocar</>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Enviando…</>
          ) : (
            <><Upload className="h-3.5 w-3.5 mr-1" /> Enviar imagem</>
          )}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-muted-foreground">
        Mostrada para o cliente como referência visual ao avaliar este critério.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Brands multi-select (used only for ROOT damage categories)
// ─────────────────────────────────────────────────────
function BrandsMultiSelect({
  brands,
  selected,
  onChange,
}: {
  brands: Brand[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  const isGlobal = selected.length === 0;

  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Marcas em que esta categoria aparece</Label>
        {isGlobal ? (
          <Badge variant="secondary" className="text-[10px]">
            Todas as marcas (global)
          </Badge>
        ) : (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Limpar (tornar global)
          </button>
        )}
      </div>
      {brands.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma marca cadastrada. Cadastre marcas na aba "Marcas".
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {brands.map((b) => {
            const checked = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {checked && <Check className="h-3 w-3" />}
                {b.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Se nenhuma marca for selecionada, a categoria aparece para qualquer aparelho.
      </p>
    </div>
  );
}

