import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Pencil, X, Check, Eye, EyeOff, Upload, Plus, Trash2,
  Image, Type, Palette, Video, HelpCircle, MessageSquare, LayoutGrid, Link2, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const sectionDescriptions: Record<string, string> = {
  hero: "Banner principal no topo da página. Inclui título, subtítulo, imagem de fundo e botão CTA.",
  steps: "Seção que mostra o passo a passo do processo de venda. Cada item tem ícone, título e descrição.",
  "how-to-sell": "Explica como vender o aparelho. Inclui lista de itens e uma imagem lateral.",
  benefits: "Cards com as vantagens/facilidades e um vídeo do YouTube opcional.",
  testimonials: "Depoimentos de clientes com nome, cidade, texto e foto.",
  faq: "Perguntas e respostas frequentes exibidas em accordion.",
  "mega-footer": "Rodapé com colunas de links organizados por categoria.",
  footer: "Rodapé final com texto de copyright.",
};

const sectionIcons: Record<string, React.ReactNode> = {
  hero: <Image className="h-4 w-4" />,
  steps: <LayoutGrid className="h-4 w-4" />,
  "how-to-sell": <Type className="h-4 w-4" />,
  benefits: <Video className="h-4 w-4" />,
  testimonials: <MessageSquare className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  "mega-footer": <Link2 className="h-4 w-4" />,
  footer: <Type className="h-4 w-4" />,
};

// --- Helper: Section Card ---
function SectionCard({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// --- Helper: Field hint ---
function FieldHint({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground mt-1">{text}</p>;
}

// --- Helper: Label with tooltip ---
function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {hint}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

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
    <TooltipProvider delayDuration={200}>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Seções da Landing Page</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as 8 seções fixas da sua landing page. Ative, desative e personalize cada uma.
          </p>
        </div>

        {/* Section List */}
        {!editingId && (
          <div className="space-y-2">
            {sections?.map((section: any) => (
              <div key={section.id} className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-sm ${!section.is_active ? "opacity-50" : ""}`}>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  {sectionIcons[section.section_type] || <Type className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{sectionLabels[section.section_type] || section.section_type}</h4>
                  <p className="text-xs text-muted-foreground truncate">{sectionDescriptions[section.section_type] || "—"}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: section.id, is_active: checked })}
                    />
                    {section.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </div>
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
          <div className="space-y-5">
            {/* Top bar */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  {sectionIcons[editingSection.section_type]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {sectionLabels[editingSection.section_type]}
                  </h3>
                  <p className="text-xs text-muted-foreground">{sectionDescriptions[editingSection.section_type]}</p>
                </div>
              </div>
            </div>

            {/* Aparência — colors */}
            <SectionCard icon={<Palette className="h-4 w-4" />} title="Aparência" description="Cores de fundo e texto desta seção na landing page">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <LabelWithHint label="Cor de Fundo" hint="Cor de fundo da seção inteira. Use HEX (#ffffff) ou escolha no seletor." />
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.bg_color || "#ffffff"} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={form.bg_color || ""} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} placeholder="#ffffff" />
                  </div>
                </div>
                <div>
                  <LabelWithHint label="Cor do Texto" hint="Cor principal dos textos (títulos e parágrafos) desta seção." />
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.text_color || "#000000"} onChange={(e) => setForm({ ...form, text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={form.text_color || ""} onChange={(e) => setForm({ ...form, text_color: e.target.value })} placeholder="#000000" />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="mt-2 rounded-lg p-3 border text-center text-sm" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
                Pré-visualização das cores
              </div>
            </SectionCard>

            {/* Title — when applicable */}
            {editingSection.section_type !== "mega-footer" && editingSection.section_type !== "footer" && (
              <SectionCard icon={<Type className="h-4 w-4" />} title="Título da Seção" description="Texto principal exibido no topo desta seção">
                <div>
                  <LabelWithHint label="Título" hint="Título em destaque da seção. Mantenha curto e direto (máx. ~60 caracteres)." />
                  <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Ex: Venda seu iPhone usado" />
                  <FieldHint text={`${(form.title || "").length}/60 caracteres`} />
                </div>
              </SectionCard>
            )}

            {/* Section-specific editors */}
            {editingSection.section_type === "hero" && <HeroEditor form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} />}
            {editingSection.section_type === "steps" && (
              <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Passos" description="Cada passo mostra um ícone (emoji ou texto curto), título e descrição">
                <ListEditor items={getContentArray()} setItems={setContentArray} fields={["icon", "title", "description"]} label="Passo" />
              </SectionCard>
            )}
            {editingSection.section_type === "how-to-sell" && (
              <>
                <SectionCard icon={<Type className="h-4 w-4" />} title="Itens informativos" description="Lista de informações sobre como vender o aparelho">
                  <ListEditor items={getContentArray()} setItems={setContentArray} fields={["title", "description"]} label="Item" />
                </SectionCard>
                <SectionCard icon={<Image className="h-4 w-4" />} title="Imagem lateral" description="Imagem exibida ao lado do texto. Recomendado: 600×800px, formato PNG ou JPG.">
                  <ImageUploader form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} label="Imagem" recommendedSize="600×800px" />
                </SectionCard>
              </>
            )}
            {editingSection.section_type === "benefits" && (
              <>
                <SectionCard icon={<Video className="h-4 w-4" />} title="Vídeo" description="Vídeo do YouTube exibido nesta seção (opcional)">
                  <div>
                    <LabelWithHint label="URL do vídeo YouTube" hint="Cole a URL completa do YouTube. Ex: https://www.youtube.com/watch?v=abc123" />
                    <Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="mt-1" />
                    {form.video_url && !form.video_url.includes("youtube.com") && !form.video_url.includes("youtu.be") && (
                      <p className="text-xs text-destructive mt-1">⚠ URL não parece ser do YouTube</p>
                    )}
                  </div>
                </SectionCard>
                <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Cards de benefícios" description="Até 4 cards com ícone, título e descrição curta">
                  <ListEditor items={getContentArray()} setItems={setContentArray} fields={["icon", "title", "description"]} label="Card" maxItems={4} />
                </SectionCard>
              </>
            )}
            {editingSection.section_type === "testimonials" && (
              <SectionCard icon={<MessageSquare className="h-4 w-4" />} title="Depoimentos" description="Cada depoimento precisa de nome, cidade, texto e URL de foto do cliente">
                <ListEditor items={getContentArray()} setItems={setContentArray} fields={["name", "city", "text", "photo"]} label="Depoimento" />
              </SectionCard>
            )}
            {editingSection.section_type === "faq" && (
              <SectionCard icon={<HelpCircle className="h-4 w-4" />} title="Perguntas Frequentes" description="Pares de pergunta e resposta exibidos em accordion">
                <ListEditor items={getContentArray()} setItems={setContentArray} fields={["question", "answer"]} label="Pergunta" />
              </SectionCard>
            )}
            {editingSection.section_type === "mega-footer" && (
              <SectionCard icon={<Link2 className="h-4 w-4" />} title="Colunas de Links" description="Organize links em colunas. Cada coluna tem um título e lista de links com texto e URL.">
                <ColumnsEditor items={getContentArray()} setItems={setContentArray} />
              </SectionCard>
            )}
            {editingSection.section_type === "footer" && (
              <SectionCard icon={<Type className="h-4 w-4" />} title="Copyright" description="Texto exibido no rodapé final da página">
                <div>
                  <LabelWithHint label="Texto de copyright" hint="Ex: © 2026 Pollicell. Todos os direitos reservados." />
                  <Input value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1" placeholder="© 2026 Sua Empresa" />
                </div>
              </SectionCard>
            )}

            {/* Visibility */}
            <SectionCard icon={<Eye className="h-4 w-4" />} title="Visibilidade" description="Controle se esta seção aparece na landing page">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                <Label>{form.is_active ? "Seção ativa — visível na landing page" : "Seção desativada — oculta da landing page"}</Label>
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Check className="mr-2 h-4 w-4" /> Salvar alterações
              </Button>
              <Button variant="outline" onClick={() => setEditingId(null)}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// --- Sub-components ---

function HeroEditor({ form, setForm, onUpload, uploading }: any) {
  return (
    <>
      <SectionCard icon={<Type className="h-4 w-4" />} title="Subtítulo" description="Texto secundário exibido abaixo do título principal do hero">
        <div>
          <LabelWithHint label="Subtítulo" hint="Texto de apoio abaixo do título. Ideal: 1-2 linhas, até 120 caracteres." />
          <Textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} className="mt-1" placeholder="Ex: Receba uma oferta justa pelo seu aparelho em minutos" />
          <FieldHint text={`${(form.content || "").length}/120 caracteres`} />
        </div>
      </SectionCard>

      <SectionCard icon={<Image className="h-4 w-4" />} title="Imagem de Fundo" description="Imagem de fundo do banner hero. Recomendado: 1920×800px, JPG, máx. 500KB.">
        <ImageUploader form={form} setForm={setForm} onUpload={onUpload} uploading={uploading} label="Imagem de fundo" recommendedSize="1920×800px" />
      </SectionCard>

      <SectionCard icon={<Palette className="h-4 w-4" />} title="Botão CTA (Call to Action)" description="Botão principal que leva o visitante à calculadora. Personalize texto, cores e arredondamento.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelWithHint label="Texto do botão" hint="Texto curto e direto. Ex: 'Calcular agora', 'Vender meu celular'" />
            <Input value={form.cta_text || ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="mt-1" placeholder="Ex: Calcular agora" />
          </div>
          <div>
            <LabelWithHint label="Border Radius (px)" hint="Arredondamento dos cantos do botão. 0 = quadrado, 25 = arredondado, 50 = pílula." />
            <Input type="number" min={0} max={50} value={form.cta_border_radius ?? 8} onChange={(e) => setForm({ ...form, cta_border_radius: Number(e.target.value) })} className="mt-1" />
          </div>
          <div>
            <LabelWithHint label="Cor de fundo do botão" hint="Cor de fundo do CTA. Escolha uma cor que contraste com o fundo do hero." />
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_bg_color || "#7c3aed"} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_bg_color || ""} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} />
            </div>
          </div>
          <div>
            <LabelWithHint label="Cor do texto do botão" hint="Cor do texto dentro do botão CTA. Use branco sobre cores escuras." />
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_text_color || "#ffffff"} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_text_color || ""} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} />
            </div>
          </div>
        </div>
        {/* CTA Preview */}
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização do botão:</p>
          <button
            className="px-6 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: form.cta_bg_color || "#7c3aed",
              color: form.cta_text_color || "#ffffff",
              borderRadius: `${form.cta_border_radius ?? 8}px`,
            }}
          >
            {form.cta_text || "Botão CTA"}
          </button>
        </div>
      </SectionCard>
    </>
  );
}

function ImageUploader({ form, setForm, onUpload, uploading, label, recommendedSize }: any) {
  return (
    <div>
      <LabelWithHint label={label} hint={recommendedSize ? `Tamanho recomendado: ${recommendedSize}. Formatos: JPG, PNG, WebP.` : "Formatos aceitos: JPG, PNG, WebP."} />
      <div className="flex items-center gap-3 mt-2">
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Fazer upload"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
        {form.image_url && (
          <div className="flex items-center gap-2">
            <img src={form.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border" />
            <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive hover:underline">Remover</button>
          </div>
        )}
      </div>
      {recommendedSize && (
        <FieldHint text={`📐 Recomendado: ${recommendedSize} | Formatos: JPG, PNG ou WebP | Máx: 2MB`} />
      )}
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

const fieldHints: Record<string, string> = {
  icon: "Emoji ou texto curto (ex: 📱, 1️⃣, ✅)",
  title: "Título curto e objetivo",
  description: "Breve descrição de apoio",
  name: "Nome completo do cliente",
  city: "Cidade e estado (ex: São Paulo, SP)",
  text: "Texto do depoimento do cliente",
  photo: "URL da foto do cliente. Recomendado: 100×100px, quadrada.",
  question: "Pergunta que os clientes costumam fazer",
  answer: "Resposta clara e objetiva",
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
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar {label}
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{label} {i + 1}</span>
            <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((field) => (
              <div key={field} className={field === "answer" || field === "text" || field === "description" ? "md:col-span-2" : ""}>
                <Label className="text-xs">{fieldLabels[field] || field}</Label>
                {field === "answer" || field === "text" || field === "description" ? (
                  <Textarea value={item[field] || ""} onChange={(e) => updateItem(i, field, e.target.value)} rows={2} className="mt-0.5 text-sm" placeholder={fieldHints[field]} />
                ) : (
                  <Input value={item[field] || ""} onChange={(e) => updateItem(i, field, e.target.value)} className="mt-0.5 text-sm" placeholder={fieldHints[field]} />
                )}
                {fieldHints[field] && <FieldHint text={fieldHints[field]} />}
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={addItem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar primeiro {label.toLowerCase()}
          </Button>
        </div>
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
        <Label className="text-sm font-semibold">Colunas ({items.length})</Label>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Coluna
        </Button>
      </div>
      {items.map((col, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <Label className="text-xs">Título da coluna</Label>
              <Input value={col.title || ""} onChange={(e) => updateColumnTitle(i, e.target.value)} className="mt-0.5 text-sm font-medium" placeholder="Ex: Institucional" />
            </div>
            <button onClick={() => removeColumn(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors flex-shrink-0 mt-4">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-muted">
            {col.links?.map((link: any, j: number) => (
              <div key={j} className="flex gap-2 items-center">
                <Input value={link.label || ""} onChange={(e) => updateLink(i, j, "label", e.target.value)} placeholder="Texto do link" className="flex-1 text-sm" />
                <Input value={link.url || ""} onChange={(e) => updateLink(i, j, "url", e.target.value)} placeholder="https://..." className="flex-1 text-sm" />
                <button onClick={() => removeLink(i, j)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => addLink(i)} className="text-xs">
              <Plus className="mr-1 h-3 w-3" /> Adicionar link
            </Button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">Nenhuma coluna adicionada.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={addColumn}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar primeira coluna
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdminSections;
