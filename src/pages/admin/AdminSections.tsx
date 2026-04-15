import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Pencil, X, Check, Eye, EyeOff, Upload, Plus, Trash2,
  Image, Type, Palette, Video, HelpCircle, MessageSquare, LayoutGrid, Link2, ArrowLeft,
  ArrowUp, ArrowDown, Star,
  Smartphone, ClipboardCheck, CreditCard, Gift, Shield, Zap, ThumbsUp, Banknote,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

// --- Icon map shared with landing page components ---
const availableIcons: Record<string, { label: string; icon: React.ReactNode }> = {
  smartphone: { label: "Smartphone", icon: <Smartphone className="h-4 w-4" /> },
  clipboard: { label: "Checklist", icon: <ClipboardCheck className="h-4 w-4" /> },
  "credit-card": { label: "Cartão", icon: <CreditCard className="h-4 w-4" /> },
  gift: { label: "Presente", icon: <Gift className="h-4 w-4" /> },
  shield: { label: "Segurança", icon: <Shield className="h-4 w-4" /> },
  zap: { label: "Rapidez", icon: <Zap className="h-4 w-4" /> },
  "thumbs-up": { label: "Aprovado", icon: <ThumbsUp className="h-4 w-4" /> },
  banknote: { label: "Dinheiro", icon: <Banknote className="h-4 w-4" /> },
  heart: { label: "Coração", icon: <Heart className="h-4 w-4" /> },
  award: { label: "Prêmio", icon: <Award className="h-4 w-4" /> },
  clock: { label: "Relógio", icon: <Clock className="h-4 w-4" /> },
  "check-circle": { label: "Verificado", icon: <CheckCircle className="h-4 w-4" /> },
  rocket: { label: "Foguete", icon: <Rocket className="h-4 w-4" /> },
  target: { label: "Alvo", icon: <Target className="h-4 w-4" /> },
  users: { label: "Pessoas", icon: <Users className="h-4 w-4" /> },
  globe: { label: "Global", icon: <Globe className="h-4 w-4" /> },
  lock: { label: "Cadeado", icon: <Lock className="h-4 w-4" /> },
  sparkles: { label: "Brilho", icon: <Sparkles className="h-4 w-4" /> },
};

const iconComponentMap: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-8 w-8" />,
  clipboard: <ClipboardCheck className="h-8 w-8" />,
  "credit-card": <CreditCard className="h-8 w-8" />,
  gift: <Gift className="h-8 w-8" />,
  shield: <Shield className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  "thumbs-up": <ThumbsUp className="h-6 w-6" />,
  banknote: <Banknote className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  award: <Award className="h-6 w-6" />,
  clock: <Clock className="h-6 w-6" />,
  "check-circle": <CheckCircle className="h-6 w-6" />,
  rocket: <Rocket className="h-6 w-6" />,
  target: <Target className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  globe: <Globe className="h-6 w-6" />,
  lock: <Lock className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
};

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
  "how-to-sell": "Dois quadros comparativos lado a lado (ex: Prós vs Contras, Nós vs Concorrente). Até 6 tópicos por quadro com ícones.",
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

// --- Helpers ---
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

function FieldHint({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground mt-1">{text}</p>;
}

function CharCount({ current, max }: { current: number; max: number }) {
  const over = current > max;
  return (
    <span className={`text-[11px] ${over ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {current}/{max}
    </span>
  );
}

function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-xs">{hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="w-full mt-0.5 text-sm">
        <SelectValue placeholder="Selecione um ícone">
          {value && availableIcons[value] ? (
            <span className="flex items-center gap-2">{availableIcons[value].icon} {availableIcons[value].label}</span>
          ) : "Selecione"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(availableIcons).map(([key, { label, icon }]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-2">{icon} {label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("embed")) return url;
  const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

function isValidUrl(url: string) {
  try { new URL(url); return url.startsWith("http"); } catch { return false; }
}

// ========== MAIN COMPONENT ==========
const AdminSections = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);

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

    // Detect dimensions
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;

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
    setImgDimensions(null);
  };

  const handleSave = () => {
    const sType = editingSection?.section_type;

    // Validate video URL for benefits
    if (sType === "benefits" && form.video_url) {
      if (!form.video_url.includes("youtube.com") && !form.video_url.includes("youtu.be")) {
        toast.error("URL do vídeo inválida. Use um link do YouTube."); return;
      }
    }

    // Validate content arrays
    if (sType && ["steps", "benefits", "testimonials", "faq"].includes(sType)) {
      const items = getContentArray();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (sType === "steps" && (!item.title?.trim())) { toast.error(`Passo ${i + 1}: título obrigatório`); return; }
        if (sType === "benefits" && (!item.title?.trim())) { toast.error(`Card ${i + 1}: título obrigatório`); return; }
        if (sType === "testimonials") {
          if (!item.name?.trim()) { toast.error(`Depoimento ${i + 1}: nome obrigatório`); return; }
          if (!item.text?.trim()) { toast.error(`Depoimento ${i + 1}: texto obrigatório`); return; }
          if (item.photo && !isValidUrl(item.photo)) { toast.error(`Depoimento ${i + 1}: URL da foto inválida`); return; }
        }
        if (sType === "faq") {
          if (!item.question?.trim()) { toast.error(`FAQ ${i + 1}: pergunta obrigatória`); return; }
          if (!item.answer?.trim()) { toast.error(`FAQ ${i + 1}: resposta obrigatória`); return; }
        }
      }
    }

    // Validate how-to-sell cards
    if (sType === "how-to-sell") {
      try {
        const parsed = form.content ? JSON.parse(form.content) : {};
        const cards = parsed.cards || [];
        for (let c = 0; c < cards.length; c++) {
          if (!cards[c].title?.trim()) { toast.error(`Quadro ${c + 1}: título obrigatório`); return; }
        }
      } catch {}
    }

    // Validate mega-footer links
    if (sType === "mega-footer") {
      const cols = getContentArray();
      for (let i = 0; i < cols.length; i++) {
        if (!cols[i].title?.trim()) { toast.error(`Coluna ${i + 1}: título obrigatório`); return; }
        for (let j = 0; j < (cols[i].links?.length || 0); j++) {
          const link = cols[i].links[j];
          if (link.url && link.url !== "#" && !isValidUrl(link.url)) {
            toast.error(`Coluna ${i + 1}, link ${j + 1}: URL inválida (use https://)`); return;
          }
        }
      }
    }

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
                    <Switch checked={section.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: section.id, is_active: checked })} />
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
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{sectionIcons[editingSection.section_type]}</div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground leading-tight">{sectionLabels[editingSection.section_type]}</h3>
                  <p className="text-xs text-muted-foreground">{sectionDescriptions[editingSection.section_type]}</p>
                </div>
              </div>
            </div>

            {/* Aparência */}
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
              <div className="mt-2 rounded-lg p-3 border text-center text-sm" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
                Pré-visualização das cores
              </div>
            </SectionCard>

            {/* Title */}
            {editingSection.section_type !== "mega-footer" && editingSection.section_type !== "footer" && (
              <SectionCard icon={<Type className="h-4 w-4" />} title="Título da Seção" description="Texto principal exibido no topo desta seção">
                <div>
                  <LabelWithHint label="Título" hint="Título em destaque da seção. Mantenha curto e direto." />
                  <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Ex: Venda seu iPhone usado" maxLength={60} />
                  <div className="flex justify-between mt-1">
                    <FieldHint text="Título principal da seção na landing page" />
                    <CharCount current={(form.title || "").length} max={60} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Section-specific editors */}
            {editingSection.section_type === "hero" && <HeroEditor form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} />}
            {editingSection.section_type === "steps" && <StepsEditor items={getContentArray()} setItems={setContentArray} form={form} />}
            {editingSection.section_type === "how-to-sell" && <HowToSellEditor form={form} setForm={setForm} />}
            {editingSection.section_type === "benefits" && <BenefitsEditor items={getContentArray()} setItems={setContentArray} form={form} setForm={setForm} />}
            {editingSection.section_type === "testimonials" && <TestimonialsEditor items={getContentArray()} setItems={setContentArray} form={form} />}
            {editingSection.section_type === "faq" && <FaqEditor items={getContentArray()} setItems={setContentArray} form={form} />}
            {editingSection.section_type === "mega-footer" && <MegaFooterEditor items={getContentArray()} setItems={setContentArray} form={form} />}
            {editingSection.section_type === "footer" && <FooterEditor form={form} setForm={setForm} />}

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

// ========== REUSABLE: List with reorder ==========
function ReorderableList({ items, setItems, renderItem, label, maxItems }: {
  items: any[]; setItems: (arr: any[]) => void; renderItem: (item: any, i: number, update: (field: string, value: string) => void) => React.ReactNode; label: string; maxItems?: number;
}) {
  const addItem = () => {
    if (maxItems && items.length >= maxItems) { toast.error(`Máximo de ${maxItems} itens`); return; }
    setItems([...items, { icon: "smartphone" }]);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const moveItem = (i: number, dir: "up" | "down") => {
    const arr = [...items];
    const target = dir === "up" ? i - 1 : i + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[i], arr[target]] = [arr[target], arr[i]];
    setItems(arr);
  };
  const updateItem = (i: number) => (field: string, value: string) => {
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
            <div className="flex items-center gap-1">
              <button onClick={() => moveItem(i, "up")} disabled={i === 0} className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Mover para cima">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => moveItem(i, "down")} disabled={i === items.length - 1} className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Mover para baixo">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {renderItem(item, i, updateItem(i))}
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

// ========== STEPS EDITOR ==========
function StepsEditor({ items, setItems, form }: { items: any[]; setItems: (arr: any[]) => void; form: any }) {
  return (
    <>
      <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Passos do Processo" description="Cada passo exibe um ícone, título curto e descrição. Recomendado: 8 passos (2 fileiras de 4).">
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Passo"
          maxItems={8}
          renderItem={(item, _i, update) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithHint label="Ícone" hint="Selecione um ícone visual para este passo." />
                <IconPicker value={item.icon || ""} onChange={(v) => update("icon", v)} />
              </div>
              <div>
                <LabelWithHint label="Título" hint="Título curto do passo. Ex: 'Escolha seu aparelho'" />
                <Input value={item.title || ""} onChange={(e) => update("title", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: Escolha seu aparelho" maxLength={30} />
                <CharCount current={(item.title || "").length} max={30} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Descrição" hint="Texto de apoio curto explicando este passo." />
                <Textarea value={item.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="mt-0.5 text-sm" placeholder="Ex: Selecione o modelo e armazenamento do seu dispositivo." maxLength={80} />
                <CharCount current={(item.description || "").length} max={80} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Steps Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como esta seção aparecerá na landing page">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Como funciona"}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(items.length > 0 ? items : [{ icon: "", title: "Passo", description: "Descrição" }]).map((step: any, i: number) => (
                <div key={i} className="text-center space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {iconComponentMap[step.icon] ? <span className="scale-50">{iconComponentMap[step.icon]}</span> : <span className="text-sm font-bold">{i + 1}</span>}
                  </div>
                  <p className="font-semibold text-xs">{step.title || "Título"}</p>
                  <p className="text-[10px] opacity-70">{step.description || "Descrição"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== HOW TO SELL EDITOR ==========
function HowToSellEditor({ form, setForm }: any) {
  const getCards = (): any[] => {
    try {
      const parsed = form.content ? JSON.parse(form.content) : {};
      return parsed.cards || [
        { title: "OPÇÃO 1", subtitle: "Subtítulo do quadro 1", items: [] },
        { title: "OPÇÃO 2", subtitle: "Subtítulo do quadro 2", items: [] },
      ];
    } catch { return [{ title: "OPÇÃO 1", subtitle: "", items: [] }, { title: "OPÇÃO 2", subtitle: "", items: [] }]; }
  };
  const setCards = (cards: any[]) => setForm({ ...form, content: JSON.stringify({ cards }) });
  const cards = getCards();

  const updateCard = (cardIdx: number, field: string, value: string) => {
    const updated = [...cards];
    updated[cardIdx] = { ...updated[cardIdx], [field]: value };
    setCards(updated);
  };
  const addItem = (cardIdx: number) => {
    if ((cards[cardIdx].items?.length || 0) >= 6) { toast.error("Máximo de 6 tópicos por quadro"); return; }
    const updated = [...cards];
    updated[cardIdx] = { ...updated[cardIdx], items: [...(updated[cardIdx].items || []), { icon: "check-circle", text: "" }] };
    setCards(updated);
  };
  const removeItem = (cardIdx: number, itemIdx: number) => {
    const updated = [...cards];
    updated[cardIdx] = { ...updated[cardIdx], items: updated[cardIdx].items.filter((_: any, j: number) => j !== itemIdx) };
    setCards(updated);
  };
  const updateItem = (cardIdx: number, itemIdx: number, field: string, value: string) => {
    const updated = [...cards];
    const items = [...updated[cardIdx].items];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    updated[cardIdx] = { ...updated[cardIdx], items };
    setCards(updated);
  };

  return (
    <>
      {cards.map((card: any, cardIdx: number) => (
        <SectionCard key={cardIdx} icon={<LayoutGrid className="h-4 w-4" />} title={`Quadro ${cardIdx + 1}`} description={`Configure título, subtítulo e até 6 tópicos com ícones.`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithHint label="Título do quadro" hint="Título em destaque no topo do card. Ex: VENDA AGORA" />
                <Input value={card.title || ""} onChange={(e) => updateCard(cardIdx, "title", e.target.value)} className="mt-0.5 text-sm font-semibold" placeholder="Ex: VENDA AGORA" maxLength={30} />
                <CharCount current={(card.title || "").length} max={30} />
              </div>
              <div>
                <LabelWithHint label="Subtítulo" hint="Texto descritivo abaixo do título. Ex: IDEAL PARA QUEM QUER VENDER RÁPIDO" />
                <Input value={card.subtitle || ""} onChange={(e) => updateCard(cardIdx, "subtitle", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: Ideal para quem quer vender rápido" maxLength={80} />
                <CharCount current={(card.subtitle || "").length} max={80} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Tópicos ({card.items?.length || 0}/6)</Label>
                <Button variant="outline" size="sm" onClick={() => addItem(cardIdx)} disabled={(card.items?.length || 0) >= 6}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar tópico
                </Button>
              </div>
              {card.items?.map((item: any, itemIdx: number) => (
                <div key={itemIdx} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/30">
                  <Select value={item.icon || "check-circle"} onValueChange={(v) => updateItem(cardIdx, itemIdx, "icon", v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableIcons).map(([key, { label, icon }]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-1.5">{icon} {label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={item.text || ""} onChange={(e) => updateItem(cardIdx, itemIdx, "text", e.target.value)} className="flex-1 text-sm h-8" placeholder="Texto do tópico" maxLength={80} />
                  <button onClick={() => removeItem(cardIdx, itemIdx)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {(!card.items || card.items.length === 0) && (
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">Nenhum tópico adicionado.</p>
                  <Button variant="ghost" size="sm" className="mt-1" onClick={() => addItem(cardIdx)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar primeiro tópico
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      ))}

      {/* Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como os dois quadros aparecerão na landing page">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#f5f5f5", color: form.text_color || "#000000" }}>
          <div className="p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-center font-bold text-sm mb-4">{form.title || "Saiba como vender"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card: any, cardIdx: number) => (
                  <div key={cardIdx} className="rounded-xl border p-5 md:p-6 space-y-4 h-full" style={{ backgroundColor: "rgba(255,255,255,0.8)" }}>
                    <div className="text-center">
                      <p className="text-xs font-bold text-orange-500">{card.title || `QUADRO ${cardIdx + 1}`}</p>
                      <p className="text-[10px] font-semibold mt-0.5 opacity-80">{card.subtitle || "Subtítulo"}</p>
                    </div>
                    <div className="space-y-2.5">
                      {(card.items?.length > 0 ? card.items : [{ icon: "check-circle", text: "Tópico de exemplo" }]).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-primary flex-shrink-0 mt-0.5">{iconComponentMap[item.icon] ? <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{availableIcons[item.icon]?.icon}</span> : <CheckCircle className="h-3.5 w-3.5" />}</span>
                          <p className="text-[10px]">{item.text || "Tópico"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== BENEFITS EDITOR ==========
function BenefitsEditor({ items, setItems, form, setForm }: any) {
  const embedUrl = getYoutubeEmbedUrl(form.video_url || "");
  const isYoutubeValid = form.video_url && (form.video_url.includes("youtube.com") || form.video_url.includes("youtu.be"));

  return (
    <>
      <SectionCard icon={<Video className="h-4 w-4" />} title="Vídeo do YouTube (opcional)" description="Vídeo exibido acima dos cards de benefícios. Aparece na landing page apenas se preenchido.">
        <div>
          <LabelWithHint label="URL do vídeo YouTube" hint="Cole a URL completa do YouTube. Ex: https://www.youtube.com/watch?v=abc123" />
          <Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." className="mt-1" />
          {form.video_url && !isYoutubeValid && (
            <p className="text-xs text-destructive mt-1">⚠ URL não parece ser do YouTube. Use o formato: https://www.youtube.com/watch?v=...</p>
          )}
          {form.video_url && isYoutubeValid && embedUrl && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização do vídeo:</p>
              <div className="aspect-video rounded-lg overflow-hidden border max-w-md">
                <iframe src={embedUrl} title="Preview" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Cards de Benefícios" description="Até 4 cards com ícone, título e descrição curta. Cada card aparece com destaque na landing page.">
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Card"
          maxItems={4}
          renderItem={(item, _i, update) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithHint label="Ícone" hint="Selecione um ícone visual para este benefício." />
                <IconPicker value={item.icon || ""} onChange={(v) => update("icon", v)} />
              </div>
              <div>
                <LabelWithHint label="Título" hint="Nome do benefício. Ex: 'Segurança'" />
                <Input value={item.title || ""} onChange={(e) => update("title", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: Segurança" maxLength={25} />
                <CharCount current={(item.title || "").length} max={25} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Descrição" hint="Texto curto explicando o benefício." />
                <Textarea value={item.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="mt-0.5 text-sm" placeholder="Ex: Processo 100% seguro e transparente." maxLength={80} />
                <CharCount current={(item.description || "").length} max={80} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Benefits Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como os cards aparecerão na landing page">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Nunca foi tão fácil"}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(items.length > 0 ? items : [{ icon: "shield", title: "Benefício", description: "Descrição" }]).map((card: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 text-center space-y-1.5" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                  <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {iconComponentMap[card.icon] ? <span className="scale-50">{iconComponentMap[card.icon]}</span> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <p className="font-semibold text-xs">{card.title || "Título"}</p>
                  <p className="text-[10px] opacity-70">{card.description || "Descrição"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== TESTIMONIALS EDITOR ==========
function TestimonialsEditor({ items, setItems, form }: any) {
  return (
    <>
      <SectionCard icon={<MessageSquare className="h-4 w-4" />} title="Depoimentos de Clientes" description="Cada depoimento inclui nome, cidade, texto e foto (opcional). Recomendado: 3 depoimentos.">
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Depoimento"
          maxItems={6}
          renderItem={(item, _i, update) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithHint label="Nome" hint="Nome do cliente. Ex: Maria S." />
                <Input value={item.name || ""} onChange={(e) => update("name", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: Maria S." maxLength={30} />
                <CharCount current={(item.name || "").length} max={30} />
              </div>
              <div>
                <LabelWithHint label="Cidade" hint="Cidade e estado do cliente." />
                <Input value={item.city || ""} onChange={(e) => update("city", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: São Paulo, SP" maxLength={30} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Depoimento" hint="Texto do depoimento. Mantenha autêntico e direto." />
                <Textarea value={item.text || ""} onChange={(e) => update("text", e.target.value)} rows={3} className="mt-0.5 text-sm" placeholder="Ex: Processo super rápido e recebi um valor justo!" maxLength={200} />
                <CharCount current={(item.text || "").length} max={200} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="URL da Foto (opcional)" hint="Link direto para a foto do cliente. Use https://. Recomendado: 100×100px, quadrada." />
                <Input value={item.photo || ""} onChange={(e) => update("photo", e.target.value)} className="mt-0.5 text-sm" placeholder="https://exemplo.com/foto.jpg" />
                {item.photo && !isValidUrl(item.photo) && <p className="text-xs text-destructive mt-1">⚠ URL inválida. Use https://</p>}
                {item.photo && isValidUrl(item.photo) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={item.photo} alt="" className="w-10 h-10 rounded-full object-cover border" />
                    <span className="text-[11px] text-muted-foreground">Preview da foto</span>
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Testimonials Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como os depoimentos aparecerão na landing page">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "O que nossos clientes dizem"}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(items.length > 0 ? items : [{ name: "Nome", city: "Cidade", text: "Depoimento do cliente" }]).map((t: any, i: number) => (
                <div key={i} className="rounded-lg border p-3 space-y-2" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex gap-0.5 text-yellow-500">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-3 w-3 fill-current" />)}
                  </div>
                  <p className="text-[10px] opacity-80 italic">"{t.text || "Depoimento"}"</p>
                  <div className="flex items-center gap-2">
                    {t.photo ? (
                      <img src={t.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">{(t.name || "?").charAt(0)}</div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold">{t.name || "Nome"}</p>
                      {t.city && <p className="text-[8px] opacity-60">{t.city}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== FAQ EDITOR ==========
function FaqEditor({ items, setItems, form }: any) {
  return (
    <>
      <SectionCard icon={<HelpCircle className="h-4 w-4" />} title="Perguntas Frequentes" description="Pares de pergunta e resposta exibidos em accordion. Recomendado: 4–6 perguntas.">
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Pergunta"
          maxItems={10}
          renderItem={(item, _i, update) => (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <LabelWithHint label="Pergunta" hint="Pergunta que os clientes costumam fazer." />
                <Input value={item.question || ""} onChange={(e) => update("question", e.target.value)} className="mt-0.5 text-sm" placeholder="Ex: Como funciona o trade-in?" maxLength={80} />
                <CharCount current={(item.question || "").length} max={80} />
              </div>
              <div>
                <LabelWithHint label="Resposta" hint="Resposta clara e objetiva. Pode ser mais detalhada." />
                <Textarea value={item.answer || ""} onChange={(e) => update("answer", e.target.value)} rows={3} className="mt-0.5 text-sm" placeholder="Ex: Você avalia o estado do seu aparelho, recebe uma oferta e pode usar o valor como crédito." maxLength={300} />
                <CharCount current={(item.answer || "").length} max={300} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* FAQ Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como o FAQ aparecerá na landing page (accordion funcional)">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}>
          <div className="p-6 max-w-lg mx-auto">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Dúvidas frequentes"}</p>
            <Accordion type="single" collapsible className="space-y-1">
              {(items.length > 0 ? items : [{ question: "Pergunta de exemplo?", answer: "Resposta de exemplo." }]).map((faq: any, i: number) => (
                <AccordionItem key={i} value={`preview-${i}`} className="border rounded-md px-3">
                  <AccordionTrigger className="text-xs text-left font-medium py-2">{faq.question || "Pergunta"}</AccordionTrigger>
                  <AccordionContent className="text-[10px] opacity-80 pb-2">{faq.answer || "Resposta"}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== MEGA FOOTER EDITOR ==========
function MegaFooterEditor({ items, setItems, form }: any) {
  const addColumn = () => {
    if (items.length >= 4) { toast.error("Máximo de 4 colunas"); return; }
    setItems([...items, { title: "Nova coluna", links: [] }]);
  };
  const removeColumn = (i: number) => setItems(items.filter((_: any, idx: number) => idx !== i));
  const updateColumnTitle = (i: number, title: string) => {
    const updated = [...items]; updated[i] = { ...updated[i], title }; setItems(updated);
  };
  const addLink = (colIdx: number) => {
    if ((items[colIdx].links?.length || 0) >= 6) { toast.error("Máximo de 6 links por coluna"); return; }
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
    <>
      <SectionCard icon={<Link2 className="h-4 w-4" />} title="Colunas de Links" description="Organize links em colunas. Máximo: 4 colunas, 6 links por coluna.">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Colunas ({items.length}/4)</Label>
            <Button variant="outline" size="sm" onClick={addColumn} disabled={items.length >= 4}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar Coluna
            </Button>
          </div>
          {items.map((col: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <LabelWithHint label="Título da coluna" hint="Nome da categoria de links. Ex: Institucional" />
                  <Input value={col.title || ""} onChange={(e) => updateColumnTitle(i, e.target.value)} className="mt-0.5 text-sm font-medium" placeholder="Ex: Institucional" maxLength={25} />
                  <CharCount current={(col.title || "").length} max={25} />
                </div>
                <button onClick={() => removeColumn(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors flex-shrink-0 mt-4">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-muted">
                <p className="text-[11px] text-muted-foreground">Links ({col.links?.length || 0}/6)</p>
                {col.links?.map((link: any, j: number) => (
                  <div key={j} className="flex gap-2 items-center">
                    <Input value={link.label || ""} onChange={(e) => updateLink(i, j, "label", e.target.value)} placeholder="Texto do link" className="flex-1 text-sm" />
                    <Input value={link.url || ""} onChange={(e) => updateLink(i, j, "url", e.target.value)} placeholder="https://..." className="flex-1 text-sm" />
                    <button onClick={() => removeLink(i, j)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {col.links?.some((l: any) => l.url && l.url !== "#" && !isValidUrl(l.url)) && (
                  <p className="text-xs text-destructive">⚠ Algumas URLs são inválidas. Use https://</p>
                )}
                <Button variant="ghost" size="sm" onClick={() => addLink(i)} className="text-xs" disabled={(col.links?.length || 0) >= 6}>
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
      </SectionCard>

      {/* Mega Footer Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como o rodapé aparecerá na landing page">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#1a1a2e", color: form.text_color || "#ffffff" }}>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs font-bold block mb-2">Pollicell</span>
                <p className="text-[9px] opacity-60">Seu aparelho vale mais do que você imagina.</p>
              </div>
              {(items.length > 0 ? items : [{ title: "Coluna", links: [{ label: "Link", url: "#" }] }]).map((col: any, i: number) => (
                <div key={i}>
                  <p className="text-[10px] font-semibold mb-1.5">{col.title}</p>
                  <ul className="space-y-1">
                    {col.links?.map((link: any, j: number) => (
                      <li key={j} className="text-[9px] opacity-60">{link.label || "Link"}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== FOOTER EDITOR ==========
function FooterEditor({ form, setForm }: any) {
  const year = new Date().getFullYear();
  return (
    <>
      <SectionCard icon={<Type className="h-4 w-4" />} title="Copyright" description="Texto exibido no rodapé final da página. Use o ano atual para manter atualizado.">
        <div>
          <LabelWithHint label="Texto de copyright" hint={`Ex: © ${year} Pollicell. Todos os direitos reservados.`} />
          <Input value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-1" placeholder={`© ${year} Sua Empresa. Todos os direitos reservados.`} maxLength={100} />
          <div className="flex justify-between mt-1">
            <FieldHint text="Aparece centralizado no fundo da página" />
            <CharCount current={(form.content || "").length} max={100} />
          </div>
        </div>
      </SectionCard>

      {/* Footer Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como o rodapé aparecerá">
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: form.bg_color || "#111111", color: form.text_color || "#999999" }}>
          <div className="px-4 py-3 text-center text-[11px] opacity-70">
            {form.content || `© ${year} Pollicell. Todos os direitos reservados.`}
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== HERO EDITOR (preserved from before) ==========
function HeroEditor({ form, setForm, onUpload, uploading }: any) {
  const layoutData = (() => {
    try { return form.layout ? JSON.parse(form.layout) : {}; } catch { return {}; }
  })();
  const setLayoutField = (key: string, value: string) => {
    const updated = { ...layoutData, [key]: value };
    setForm({ ...form, layout: JSON.stringify(updated) });
  };

  const vAlign = layoutData.vAlign || "center";
  const hAlign = layoutData.hAlign || "center";
  const textAlign = layoutData.textAlign || "center";

  const vOptions = [
    { value: "top", label: "⬆ Topo" },
    { value: "center", label: "⬌ Centro" },
    { value: "bottom", label: "⬇ Baixo" },
  ];
  const hOptions = [
    { value: "left", label: "◀ Esquerda" },
    { value: "center", label: "⬌ Centro" },
    { value: "right", label: "▶ Direita" },
  ];
  const tOptions = [
    { value: "left", label: "Esquerda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Direita" },
  ];

  return (
    <>
      <SectionCard icon={<Type className="h-4 w-4" />} title="Subtítulo" description="Texto secundário exibido abaixo do título principal do hero">
        <div>
          <LabelWithHint label="Subtítulo" hint="Texto de apoio abaixo do título. Ideal: 1-2 linhas, até 120 caracteres." />
          <Textarea value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} className="mt-1" placeholder="Ex: Receba uma oferta justa pelo seu aparelho em minutos" maxLength={120} />
          <div className="flex justify-between mt-1">
            <FieldHint text="Texto de apoio abaixo do título" />
            <CharCount current={(form.content || "").length} max={120} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Image className="h-4 w-4" />} title="Imagem de Fundo" description="Imagem de fundo do banner hero. Recomendado: 1920×800px, JPG, máx. 500KB.">
        <ImageUploader form={form} setForm={setForm} onUpload={onUpload} uploading={uploading} label="Imagem de fundo" recommendedSize="1920×800px" />
      </SectionCard>

      <SectionCard icon={<LayoutGrid className="h-4 w-4" />} title="Posição do Conteúdo" description="Ajuste onde o título, subtítulo e botão aparecem sobre o banner.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Alinhamento Vertical", hint: "Topo, centro ou parte inferior do banner.", options: vOptions, value: vAlign, key: "vAlign" },
            { label: "Alinhamento Horizontal", hint: "Esquerda, centro ou direita do banner.", options: hOptions, value: hAlign, key: "hAlign" },
            { label: "Alinhamento do Texto", hint: "Alinha o texto dentro do bloco.", options: tOptions, value: textAlign, key: "textAlign" },
          ].map((group) => (
            <div key={group.key}>
              <LabelWithHint label={group.label} hint={group.hint} />
              <div className="flex gap-1 mt-1.5">
                {group.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLayoutField(group.key, opt.value)}
                    className={`flex-1 text-xs py-2 px-1 rounded-md border transition-colors ${
                      group.value === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização da posição:</p>
          <div className="relative border rounded-lg overflow-hidden h-32" style={{ backgroundColor: form.bg_color || "#1a1a2e" }}>
            {form.image_url && <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
            <div
              className="relative w-full h-full flex p-3"
              style={{
                justifyContent: hAlign === "left" ? "flex-start" : hAlign === "right" ? "flex-end" : "center",
                alignItems: vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center",
                textAlign: textAlign as any,
              }}
            >
              <div className="max-w-[60%]" style={{ textAlign: textAlign as any }}>
                <div className="text-xs font-bold text-white truncate">{form.title || "Título"}</div>
                <div className="text-[10px] text-white/70 truncate mt-0.5">{form.content || "Subtítulo"}</div>
                <div
                  className="inline-block mt-1 px-2 py-0.5 text-[9px] font-medium rounded"
                  style={{
                    backgroundColor: form.cta_bg_color || "#7c3aed",
                    color: form.cta_text_color || "#fff",
                    borderRadius: `${Math.min(form.cta_border_radius ?? 8, 12)}px`,
                  }}
                >
                  {form.cta_text || "CTA"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<Palette className="h-4 w-4" />} title="Botão CTA (Call to Action)" description="Botão principal que leva o visitante à calculadora.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelWithHint label="Texto do botão" hint="Texto curto e direto. Ex: 'Calcular agora'" />
            <Input value={form.cta_text || ""} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="mt-1" placeholder="Ex: Calcular agora" />
          </div>
          <div>
            <LabelWithHint label="Border Radius (px)" hint="0 = quadrado, 25 = arredondado, 50 = pílula." />
            <Input type="number" min={0} max={50} value={form.cta_border_radius ?? 8} onChange={(e) => setForm({ ...form, cta_border_radius: Number(e.target.value) })} className="mt-1" />
          </div>
          <div>
            <LabelWithHint label="Cor de fundo do botão" hint="Cor que contraste com o fundo do hero." />
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_bg_color || "#7c3aed"} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_bg_color || ""} onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })} />
            </div>
          </div>
          <div>
            <LabelWithHint label="Cor do texto do botão" hint="Use branco sobre cores escuras." />
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={form.cta_text_color || "#ffffff"} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.cta_text_color || ""} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} />
            </div>
          </div>
        </div>
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

// ========== IMAGE UPLOADER ==========
function ImageUploader({ form, setForm, onUpload, uploading, label, recommendedSize, imgDimensions }: any) {
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
      {imgDimensions && (
        <p className="text-[11px] text-muted-foreground mt-1">📐 Dimensões detectadas: {imgDimensions.w}×{imgDimensions.h}px</p>
      )}
      {recommendedSize && (
        <FieldHint text={`📐 Recomendado: ${recommendedSize} | Formatos: JPG, PNG ou WebP | Máx: 2MB`} />
      )}
    </div>
  );
}

export default AdminSections;
