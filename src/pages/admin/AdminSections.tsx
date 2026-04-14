import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, X, Check, Eye, EyeOff, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const sectionLabels: Record<string, string> = {
  hero: "Hero Banner",
  steps: "Passo a Passo",
  "how-to-sell": "Como Vender",
  benefits: "Benefícios / Facilidades",
  testimonials: "Depoimentos",
  faq: "Dúvidas Frequentes",
  "mega-footer": "Mega Footer",
  footer: "Footer",
};

const AdminSections = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-lp-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lp_sections").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-lp-sections"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("lp_sections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setEditingId(null); toast.success("Salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("lp_sections").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e.message),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `sections/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lp-images").upload(path, file);
    if (error) { toast.error("Erro: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleEdit = (section: any) => {
    setForm({ ...section });
    setEditingId(section.id);
  };

  const handleSave = () => {
    const { id, created_at, updated_at, ...updates } = form;
    updateMutation.mutate({ id: editingId!, updates });
  };

  // JSON helpers
  const getContentArray = (): any[] => {
    try { return form.content ? JSON.parse(form.content) : []; } catch { return []; }
  };
  const setContentArray = (arr: any[]) => setForm({ ...form, content: JSON.stringify(arr) });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const editingSection = sections?.find((s) => s.id === editingId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Seções da Landing Page</h2>
        <p className="text-sm text-muted-foreground">8 seções fixas — edite e ative/desative cada uma</p>
      </div>

      {/* Section List */}
      {!editingId && (
        <div className="space-y-2">
          {sections?.map((section: any) => (
            <div key={section.id} className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-opacity ${!section.is_active ? "opacity-50" : ""}`}>
              <div className="w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold" style={{ backgroundColor: section.bg_color, color: section.text_color }}>
                {section.display_order}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{sectionLabels[section.section_type] || section.section_type}</h4>
                <p className="text-xs text-muted-foreground truncate">{section.title || "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={section.is_active}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: section.id, is_active: checked })}
                />
                {section.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <Button variant="outline" size="sm" onClick={() => handleEdit(section)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Form */}
      {editingId && editingSection && (
        <div className="bg-card border rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Editando: {sectionLabels[editingSection.section_type]}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Common fields: title, colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingSection.section_type !== "mega-footer" && editingSection.section_type !== "footer" && (
              <div>
                <Label>Título</Label>
                <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Cor de Fundo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.bg_color || "#ffffff"} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.bg_color || ""} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div className="flex-1">
                <Label>Cor do Texto</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.text_color || "#000000"} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.text_color || ""} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Section-specific editors */}
          {editingSection.section_type === "hero" && <HeroEditor form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} />}
          {editingSection.section_type === "steps" && <ListEditor items={getContentArray()} setItems={setContentArray} fields={["icon", "title", "description"]} label="Passo" />}
          {editingSection.section_type === "how-to-sell" && (
            <>
              <ListEditor items={getContentArray()} setItems={setContentArray} fields={["title", "description"]} label="Item" />
              <ImageUploader form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} label="Imagem lateral" />
            </>
          )}
          {editingSection.section_type === "benefits" && (
            <>
              <div>
                <Label>URL do vídeo YouTube</Label>
                <Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="mt-1" />
              </div>
              <ListEditor items={getContentArray()} setItems={setContentArray} fields={["icon", "title", "description"]} label="Card" maxItems={4} />
            </>
          )}
          {editingSection.section_type === "testimonials" && <ListEditor items={getContentArray()} setItems={setContentArray} fields={["name", "city", "text", "photo"]} label="Depoimento" />}
          {editingSection.section_type === "faq" && <ListEditor items={getContentArray()} setItems={setContentArray} fields={["question", "answer"]} label="Pergunta" />}
          {editingSection.section_type === "mega-footer" && <ColumnsEditor items={getContentArray()} setItems={setContentArray} />}
          {editingSection.section_type === "footer" && (
            <div>
              <Label>Texto de copyright</Label>
              <Input value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1" />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
            <Label>Seção ativa</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Check className="mr-2 h-4 w-4" /> Salvar
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

function HeroEditor({ form, setForm, onUpload, uploading }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Subtítulo</Label>
        <Textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} className="mt-1" />
      </div>
      <ImageUploader form={form} setForm={setForm} onUpload={onUpload} uploading={uploading} label="Imagem de fundo" />
      <div className="border-t pt-4">
        <Label className="text-sm font-semibold">Botão CTA</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Label>Texto do botão</Label>
            <Input value={form.cta_text || ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Border Radius (px)</Label>
            <Input type="number" min={0} max={50} value={form.cta_border_radius ?? 8} onChange={(e) => setForm({ ...form, cta_border_radius: Number(e.target.value) })} className="mt-1" />
          </div>
          <div>
            <Label>Cor de fundo do botão</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_bg_color || "#7c3aed"} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_bg_color || ""} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} className="flex-1" />
            </div>
          </div>
          <div>
            <Label>Cor do texto do botão</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_text_color || "#ffffff"} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_text_color || ""} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageUploader({ form, setForm, onUpload, uploading, label }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-3 mt-1">
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
        {form.image_url && (
          <div className="flex items-center gap-2">
            <img src={form.image_url} alt="" className="h-10 w-10 rounded object-cover border" />
            <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive hover:underline">Remover</button>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabels: Record<string, string> = {
  icon: "Ícone",
  title: "Título",
  description: "Descrição",
  name: "Nome",
  city: "Cidade",
  text: "Texto",
  photo: "URL da foto",
  question: "Pergunta",
  answer: "Resposta",
};

function ListEditor({ items, setItems, fields, label, maxItems }: { items: any[]; setItems: (arr: any[]) => void; fields: string[]; label: string; maxItems?: number }) {
  const addItem = () => {
    if (maxItems && items.length >= maxItems) { toast.error(`Máximo de ${maxItems} itens`); return; }
    const newItem: any = {};
    fields.forEach((f) => (newItem[f] = ""));
    setItems([...items, newItem]);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Itens ({items.length}{maxItems ? `/${maxItems}` : ""})</Label>
        <Button variant="outline" size="sm" onClick={addItem} disabled={!!maxItems && items.length >= maxItems}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {label}
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{label} {i + 1}</span>
            <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {fields.map((field) => (
              <div key={field}>
                <Label className="text-xs">{fieldLabels[field] || field}</Label>
                {field === "answer" || field === "text" || field === "description" ? (
                  <Textarea value={item[field] || ""} onChange={(e) => updateItem(i, field, e.target.value)} rows={2} className="mt-0.5 text-sm" />
                ) : (
                  <Input value={item[field] || ""} onChange={(e) => updateItem(i, field, e.target.value)} className="mt-0.5 text-sm" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">Nenhum item. Clique em "+ {label}" para adicionar.</p>
      )}
    </div>
  );
}

function ColumnsEditor({ items, setItems }: { items: any[]; setItems: (arr: any[]) => void }) {
  const addColumn = () => setItems([...items, { title: "Nova coluna", links: [] }]);
  const removeColumn = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateColumnTitle = (i: number, title: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], title };
    setItems(updated);
  };
  const addLink = (colIdx: number) => {
    const updated = [...items];
    updated[colIdx] = { ...updated[colIdx], links: [...(updated[colIdx].links || []), { label: "", url: "#" }] };
    setItems(updated);
  };
  const removeLink = (colIdx: number, linkIdx: number) => {
    const updated = [...items];
    updated[colIdx] = { ...updated[colIdx], links: updated[colIdx].links.filter((_: any, j: number) => j !== linkIdx) };
    setItems(updated);
  };
  const updateLink = (colIdx: number, linkIdx: number, field: string, value: string) => {
    const updated = [...items];
    const links = [...updated[colIdx].links];
    links[linkIdx] = { ...links[linkIdx], [field]: value };
    updated[colIdx] = { ...updated[colIdx], links };
    setItems(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Colunas de links ({items.length})</Label>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Coluna
        </Button>
      </div>
      {items.map((col, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <Input value={col.title || ""} onChange={(e) => updateColumnTitle(i, e.target.value)} className="text-sm font-medium" placeholder="Título da coluna" />
            <button onClick={() => removeColumn(i)} className="text-destructive hover:text-destructive/80 flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {col.links?.map((link: any, j: number) => (
            <div key={j} className="flex gap-2 items-center">
              <Input value={link.label || ""} onChange={(e) => updateLink(i, j, "label", e.target.value)} placeholder="Texto" className="flex-1 text-sm" />
              <Input value={link.url || ""} onChange={(e) => updateLink(i, j, "url", e.target.value)} placeholder="URL" className="flex-1 text-sm" />
              <button onClick={() => removeLink(i, j)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => addLink(i)} className="text-xs">
            <Plus className="mr-1 h-3 w-3" /> Link
          </Button>
        </div>
      ))}
    </div>
  );
}

export default AdminSections;
