import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Check, ArrowUp, ArrowDown, Eye, EyeOff, Upload, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SectionForm {
  title: string;
  content: string;
  image_url: string;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  layout: string;
  section_type: string;
  cta_text: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_border_radius: number;
}

const emptySectionForm: SectionForm = {
  title: "",
  content: "",
  image_url: "",
  bg_color: "#ffffff",
  text_color: "#000000",
  is_active: true,
  layout: "text-image",
  section_type: "section",
  cta_text: "Avaliar meu aparelho",
  cta_bg_color: "#7c3aed",
  cta_text_color: "#ffffff",
  cta_border_radius: 8,
};

const layoutOptions = [
  { value: "text-image", label: "Texto | Imagem" },
  { value: "image-text", label: "Imagem | Texto" },
  { value: "text-only", label: "Somente Texto" },
];

const AdminSections = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SectionForm>(emptySectionForm);
  const [uploading, setUploading] = useState(false);

  const { data: allSections, isLoading } = useQuery({
    queryKey: ["admin-lp-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_sections")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const heroSection = allSections?.find((s: any) => s.section_type === "hero");
  const sections = allSections?.filter((s: any) => s.section_type !== "hero") ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-lp-sections"] });

  const addMutation = useMutation({
    mutationFn: async (form: SectionForm) => {
      const maxOrder = sections.length ? Math.max(...sections.map((s) => s.display_order)) + 1 : 0;
      const { error } = await supabase.from("lp_sections").insert({
        ...form,
        display_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setShowAdd(false); setForm(emptySectionForm); toast.success("Seção criada!"); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: Partial<SectionForm> }) => {
      const { error } = await supabase.from("lp_sections").update(form).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); setForm(emptySectionForm); toast.success("Salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lp_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Seção removida!"); },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase.from("lp_sections").update({ display_order: newOrder }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `sections/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lp-images").upload(path, file);
    if (error) { toast.error("Erro ao fazer upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleEdit = (section: any) => {
    setForm({
      title: section.title,
      content: section.content || "",
      image_url: section.image_url || "",
      bg_color: section.bg_color || "#ffffff",
      text_color: section.text_color || "#000000",
      is_active: section.is_active,
      layout: section.layout || "text-image",
      section_type: section.section_type || "section",
      cta_text: section.cta_text || "Avaliar meu aparelho",
      cta_bg_color: section.cta_bg_color || "#7c3aed",
      cta_text_color: section.cta_text_color || "#ffffff",
      cta_border_radius: section.cta_border_radius ?? 8,
    });
    setEditingId(section.id);
    setShowAdd(false);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const current = sections[index];
    const prev = sections[index - 1];
    reorderMutation.mutate({ id: current.id, newOrder: prev.display_order });
    reorderMutation.mutate({ id: prev.id, newOrder: current.display_order });
  };

  const handleMoveDown = (index: number) => {
    if (index >= sections.length - 1) return;
    const current = sections[index];
    const next = sections[index + 1];
    reorderMutation.mutate({ id: current.id, newOrder: next.display_order });
    reorderMutation.mutate({ id: next.id, newOrder: current.display_order });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, form });
    } else {
      addMutation.mutate(form);
    }
  };

  const isEditing = showAdd || editingId;
  const isEditingHero = editingId && heroSection && editingId === heroSection.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Seções da Landing Page</h2>
          <p className="text-sm text-muted-foreground">{sections.length} seções + hero</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptySectionForm); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Seção
        </Button>
      </div>

      {/* Hero Card */}
      {heroSection && (
        <div className="bg-card border-2 border-primary/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Hero Principal</h3>
                <p className="text-xs text-muted-foreground">{heroSection.title}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleEdit(heroSection)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar Hero
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {isEditing && (
        <div className="bg-card border border-primary/30 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {isEditingHero ? "Editar Hero Principal" : editingId ? "Editar Seção" : "Nova Seção"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Benefícios do Trade-in" className="mt-1" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Cor de Fundo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-10 rounded border border-input cursor-pointer" />
                  <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div className="flex-1">
                <Label>Cor do Texto</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="w-10 h-10 rounded border border-input cursor-pointer" />
                  <Input value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Conteúdo</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Texto da seção..." rows={4} className="mt-1" />
          </div>

          {/* Layout selector — only for non-hero */}
          {!isEditingHero && form.section_type !== "hero" && (
            <div>
              <Label>Layout</Label>
              <div className="flex gap-2 mt-1">
                {layoutOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, layout: opt.value })}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.layout === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image upload — show for non text-only and hero */}
          {(form.layout !== "text-only" || isEditingHero) && (
            <div>
              <Label>Imagem {isEditingHero && "(opcional — aparece no fundo)"}</Label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Enviando..." : "Upload"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {form.image_url && (
                  <div className="flex items-center gap-2">
                    <img src={form.image_url} alt="" className="h-10 w-10 rounded object-cover border" />
                    <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive hover:underline">Remover</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isEditingHero && (
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Seção ativa</Label>
            </div>
          )}

          {/* Preview */}
          <div>
            <Label className="text-xs text-muted-foreground">Preview</Label>
            {isEditingHero ? (
              <div className="mt-1 rounded-lg p-8 border text-center relative overflow-hidden" style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                {form.image_url && <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                <div className="relative">
                  <h3 className="text-2xl font-bold">{form.title || "Título do Hero"}</h3>
                  <p className="mt-2 opacity-80">{form.content || "Subtítulo..."}</p>
                  <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Avaliar meu aparelho</div>
                </div>
              </div>
            ) : (
              <div className="mt-1 rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                <div className={`p-6 flex ${form.layout === "text-only" ? "justify-center" : ""} ${form.layout === "image-text" ? "flex-row-reverse" : "flex-row"} gap-6 items-center`}>
                  {form.layout !== "text-only" && (
                    <div className="flex-1">
                      {form.image_url ? (
                        <img src={form.image_url} alt="" className="rounded-lg max-h-32 object-cover w-full" />
                      ) : (
                        <div className="h-24 rounded-lg bg-black/10 flex items-center justify-center text-xs opacity-50">Imagem</div>
                      )}
                    </div>
                  )}
                  <div className={`flex-1 ${form.layout === "text-only" ? "text-center" : ""}`}>
                    <h3 className="text-lg font-bold">{form.title || "Título"}</h3>
                    <p className="mt-1 text-sm opacity-80">{form.content || "Conteúdo..."}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending}>
              <Check className="mr-2 h-4 w-4" /> {editingId ? "Salvar" : "Adicionar"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptySectionForm); }}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-2">
        {sections.map((section: any, index: number) => (
          <div key={section.id} className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-opacity ${!section.is_active ? "opacity-50" : ""}`}>
            <div className="flex flex-col gap-1">
              <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 rounded hover:bg-accent/50 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <button onClick={() => handleMoveDown(index)} disabled={index === sections.length - 1} className="p-1 rounded hover:bg-accent/50 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </div>

            <div className="w-12 h-12 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: section.bg_color }}>
              {section.image_url ? <img src={section.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs" style={{ color: section.text_color }}>Aa</span>}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{section.title}</h4>
              <p className="text-xs text-muted-foreground">
                {section.layout === "text-image" ? "Texto | Imagem" : section.layout === "image-text" ? "Imagem | Texto" : "Somente Texto"}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {section.is_active ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              <button onClick={() => handleEdit(section)} className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (confirm("Remover esta seção?")) deleteMutation.mutate(section.id); }} className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}

        {sections.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma seção cadastrada. Clique em "Nova Seção" para começar.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSections;
