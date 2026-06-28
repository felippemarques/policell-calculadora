import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Upload,
  Plus,
  Trash2,
  Image,
  Type,
  Palette,
  Video,
  HelpCircle,
  MessageSquare,
  LayoutGrid,
  Link2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Star,
  MousePointerClick,
  Smartphone,
  ClipboardCheck,
  CreditCard,
  Gift,
  Shield,
  Zap,
  ThumbsUp,
  Banknote,
  Heart,
  Award,
  Clock,
  CheckCircle,
  Rocket,
  Target,
  Users,
  Globe,
  Lock,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  Truck,
  Camera,
  Wifi,
  Settings,
  Package,
  Send,
  Bell,
  Calendar,
  FileText,
  Home,
  Search,
  Play,
  Headphones,
  Monitor,
  Wrench,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import HeroSection from "@/components/landing/HeroSection";
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
  star: { label: "Estrela", icon: <Star className="h-4 w-4" /> },
  mail: { label: "Email", icon: <Mail className="h-4 w-4" /> },
  phone: { label: "Telefone", icon: <Phone className="h-4 w-4" /> },
  "map-pin": { label: "Localização", icon: <MapPin className="h-4 w-4" /> },
  "shopping-cart": { label: "Carrinho", icon: <ShoppingCart className="h-4 w-4" /> },
  truck: { label: "Entrega", icon: <Truck className="h-4 w-4" /> },
  camera: { label: "Câmera", icon: <Camera className="h-4 w-4" /> },
  wifi: { label: "Wi-Fi", icon: <Wifi className="h-4 w-4" /> },
  settings: { label: "Config.", icon: <Settings className="h-4 w-4" /> },
  package: { label: "Pacote", icon: <Package className="h-4 w-4" /> },
  send: { label: "Enviar", icon: <Send className="h-4 w-4" /> },
  bell: { label: "Notificação", icon: <Bell className="h-4 w-4" /> },
  calendar: { label: "Calendário", icon: <Calendar className="h-4 w-4" /> },
  "file-text": { label: "Documento", icon: <FileText className="h-4 w-4" /> },
  home: { label: "Casa", icon: <Home className="h-4 w-4" /> },
  search: { label: "Busca", icon: <Search className="h-4 w-4" /> },
  play: { label: "Play", icon: <Play className="h-4 w-4" /> },
  headphones: { label: "Fone", icon: <Headphones className="h-4 w-4" /> },
  monitor: { label: "Monitor", icon: <Monitor className="h-4 w-4" /> },
  wrench: { label: "Ferramenta", icon: <Wrench className="h-4 w-4" /> },
  lightbulb: { label: "Ideia", icon: <Lightbulb className="h-4 w-4" /> },
};

const iconComponentMap: Record<string, React.ReactNode> = Object.fromEntries(
  Object.entries(availableIcons).map(([key, { icon }]) => {
    // Clone the icon element with larger size for previews
    const el = icon as React.ReactElement<any>;
    return [key, React.cloneElement(el, { key, className: "h-6 w-6" })];
  }),
);

const sectionLabels: Record<string, string> = {
  hero: "Hero Banner",
  steps: "Passo a Passo",
  "how-to-sell": "Como Vender",
  benefits: "Benefícios / Facilidades",
  testimonials: "Depoimentos",
  faq: "Dúvidas Frequentes",
  "cta-banner": "Banner com CTA",
  video: "Vídeo do YouTube",
  "mega-footer": "Mega Footer",
  footer: "Footer",
};

const sectionDescriptions: Record<string, string> = {
  hero: "Banner principal no topo da página. Inclui título, subtítulo, imagem de fundo e botão CTA.",
  steps: "Seção que mostra o passo a passo do processo de venda. Cada item tem ícone, título e descrição.",
  "how-to-sell":
    "Dois quadros comparativos lado a lado (ex: Prós vs Contras, Nós vs Concorrente). Até 6 tópicos por quadro com ícones.",
  benefits: "Cards com as vantagens/facilidades e um vídeo do YouTube opcional.",
  testimonials: "Depoimentos de clientes com nome, cidade, texto e foto.",
  faq: "Perguntas e respostas frequentes exibidas em accordion.",
  "cta-banner": "Banner com imagem de fundo e botão CTA que leva a uma URL externa (ex: WhatsApp, link de compra).",
  video: "Seção dedicada para exibir um vídeo do YouTube com título opcional.",
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
  "cta-banner": <Link2 className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  "mega-footer": <Link2 className="h-4 w-4" />,
  footer: <Type className="h-4 w-4" />,
};

// Sections that cannot be reordered (fixed positions)
const FIXED_SECTIONS = ["hero", "mega-footer", "footer"];

// --- Helpers ---
function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
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
          <TooltipContent side="top" className="max-w-[250px] text-xs">
            {hint}
          </TooltipContent>
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
            <span className="flex items-center gap-2">
              {availableIcons[value].icon} {availableIcons[value].label}
            </span>
          ) : (
            "Selecione"
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(availableIcons).map(([key, { label, icon }]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-2">
              {icon} {label}
            </span>
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
  try {
    new URL(url);
    return url.startsWith("http");
  } catch {
    return false;
  }
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
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Salvo!");
    },
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

  const reorderMutation = useMutation({
    mutationFn: async ({ id1, order1, id2, order2 }: { id1: string; order1: number; id2: string; order2: number }) => {
      const { error: e1 } = await supabase.from("lp_sections").update({ display_order: order1 }).eq("id", id1);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("lp_sections").update({ display_order: order2 }).eq("id", id2);
      if (e2) throw e2;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Ordem atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    if (!sections) return;
    const idx = sections.findIndex((s: any) => s.id === sectionId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const current = sections[idx];
    const target = sections[targetIdx];
    // Don't swap with fixed sections
    if (FIXED_SECTIONS.includes(current.section_type) || FIXED_SECTIONS.includes(target.section_type)) return;
    reorderMutation.mutate({
      id1: current.id,
      order1: target.display_order,
      id2: target.id,
      order2: current.display_order,
    });
  };

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
    if (error) {
      toast.error("Erro: " + error.message);
      setUploading(false);
      return;
    }
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
        toast.error("URL do vídeo inválida. Use um link do YouTube.");
        return;
      }
    }

    // Validate content arrays
    if (sType && ["steps", "benefits", "testimonials", "faq"].includes(sType)) {
      const items = getContentArray();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (sType === "steps" && !item.title?.trim()) {
          toast.error(`Passo ${i + 1}: título obrigatório`);
          return;
        }
        if (sType === "benefits" && !item.title?.trim()) {
          toast.error(`Card ${i + 1}: título obrigatório`);
          return;
        }
        if (sType === "testimonials") {
          if (!item.name?.trim()) {
            toast.error(`Depoimento ${i + 1}: nome obrigatório`);
            return;
          }
          if (!item.text?.trim()) {
            toast.error(`Depoimento ${i + 1}: texto obrigatório`);
            return;
          }
          if (item.photo && !isValidUrl(item.photo)) {
            toast.error(`Depoimento ${i + 1}: URL da foto inválida`);
            return;
          }
        }
        if (sType === "faq") {
          if (!item.question?.trim()) {
            toast.error(`FAQ ${i + 1}: pergunta obrigatória`);
            return;
          }
          if (!item.answer?.trim()) {
            toast.error(`FAQ ${i + 1}: resposta obrigatória`);
            return;
          }
        }
      }
    }

    // Validate how-to-sell cards
    if (sType === "how-to-sell") {
      try {
        const parsed = form.content ? JSON.parse(form.content) : {};
        const cards = parsed.cards || [];
        for (let c = 0; c < cards.length; c++) {
          if (!cards[c].title?.trim()) {
            toast.error(`Quadro ${c + 1}: título obrigatório`);
            return;
          }
        }
      } catch {}
    }

    // Validate mega-footer links
    if (sType === "mega-footer") {
      const cols = getContentArray();
      for (let i = 0; i < cols.length; i++) {
        if (!cols[i].title?.trim()) {
          toast.error(`Coluna ${i + 1}: título obrigatório`);
          return;
        }
        for (let j = 0; j < (cols[i].links?.length || 0); j++) {
          const link = cols[i].links[j];
          if (link.url && link.url !== "#" && !isValidUrl(link.url)) {
            toast.error(`Coluna ${i + 1}, link ${j + 1}: URL inválida (use https://)`);
            return;
          }
        }
      }
    }

    const { id, created_at, updated_at, ...updates } = form;
    updateMutation.mutate({ id: editingId!, updates });
  };

  const getContentArray = (): any[] => {
    try {
      return form.content ? JSON.parse(form.content) : [];
    } catch {
      return [];
    }
  };
  const setContentArray = (arr: any[]) => setForm({ ...form, content: JSON.stringify(arr) });

  const ctaLayoutData = (() => {
    try { return form.layout ? JSON.parse(form.layout) : {}; } catch { return {}; }
  })();
  const setCtaLayoutField = (key: string, value: number) => {
    const updated = { ...ctaLayoutData, [key]: value };
    setForm({ ...form, layout: JSON.stringify(updated) });
  };

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
            Gerencie as seções da sua landing page. Ative, desative, reordene e personalize cada uma.
          </p>
        </div>

        {/* Section List */}
        {!editingId && (
          <div className="space-y-2">
            {sections?.map((section: any, idx: number) => {
              const isFixed = FIXED_SECTIONS.includes(section.section_type);
              const canMoveUp = !isFixed && idx > 0 && !FIXED_SECTIONS.includes(sections[idx - 1]?.section_type);
              const canMoveDown =
                !isFixed && idx < sections.length - 1 && !FIXED_SECTIONS.includes(sections[idx + 1]?.section_type);
              return (
                <div
                  key={section.id}
                  className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-sm ${!section.is_active ? "opacity-50" : ""}`}
                >
                  {!isFixed ? (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveSection(section.id, "up")}
                        disabled={!canMoveUp || reorderMutation.isPending}
                        className="p-1 rounded hover:bg-accent disabled:opacity-20 transition-colors"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(section.id, "down")}
                        disabled={!canMoveDown || reorderMutation.isPending}
                        className="p-1 rounded hover:bg-accent disabled:opacity-20 transition-colors"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-7 flex items-center justify-center" title="Posição fixa">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    {sectionIcons[section.section_type] || <Type className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">
                      {sectionLabels[section.section_type] || section.section_type}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {sectionDescriptions[section.section_type] || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={section.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: section.id, is_active: checked })}
                      />
                      {section.is_active ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(section)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                  </div>
                </div>
              );
            })}
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

            {/* Aparência */}
            <SectionCard
              icon={<Palette className="h-4 w-4" />}
              title="Aparência"
              description="Cores de fundo e texto desta seção na landing page"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <LabelWithHint
                    label="Cor de Fundo"
                    hint="Cor de fundo da seção inteira. Use HEX (#ffffff) ou escolha no seletor."
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={form.bg_color || "#ffffff"}
                      onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={form.bg_color || ""}
                      onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <LabelWithHint
                    label="Cor do Texto"
                    hint="Cor principal dos textos (títulos e parágrafos) desta seção."
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={form.text_color || "#000000"}
                      onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={form.text_color || ""}
                      onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
              <div
                className="mt-2 rounded-lg p-3 border text-center text-sm"
                style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
              >
                Pré-visualização das cores
              </div>
            </SectionCard>

            {/* Title */}
            {editingSection.section_type !== "mega-footer" && editingSection.section_type !== "footer" && (
              <SectionCard
                icon={<Type className="h-4 w-4" />}
                title="Título da Seção"
                description="Texto principal exibido no topo desta seção"
              >
                <div>
                  <LabelWithHint label="Título" hint="Título em destaque da seção. Mantenha curto e direto." />
                  <Input
                    value={form.title || ""}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1"
                    placeholder="Ex: Venda seu iPhone usado"
                    maxLength={60}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldHint text="Título principal da seção na landing page" />
                    <CharCount current={(form.title || "").length} max={60} />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Section-specific editors */}
            {editingSection.section_type === "hero" && (
              <HeroEditor form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} />
            )}
            {editingSection.section_type === "steps" && (
              <StepsEditor items={getContentArray()} setItems={setContentArray} form={form} />
            )}
            {editingSection.section_type === "how-to-sell" && <HowToSellEditor form={form} setForm={setForm} />}
            {editingSection.section_type === "benefits" && (
              <BenefitsEditor items={getContentArray()} setItems={setContentArray} form={form} setForm={setForm} />
            )}
            {editingSection.section_type === "testimonials" && (
              <TestimonialsEditor items={getContentArray()} setItems={setContentArray} form={form} setForm={setForm} />
            )}
            {editingSection.section_type === "faq" && (
              <FaqEditor items={getContentArray()} setItems={setContentArray} form={form} />
            )}
            {editingSection.section_type === "mega-footer" && (
              <MegaFooterEditor items={getContentArray()} setItems={setContentArray} form={form} />
            )}
            {editingSection.section_type === "footer" && <FooterEditor form={form} setForm={setForm} />}
            {editingSection.section_type === "cta-banner" && (
              <CtaBannerEditor form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} />
            )}
            {editingSection.section_type === "video" && <VideoEditor form={form} setForm={setForm} />}

            {/* CTA Button (for applicable sections) */}
            {["steps", "video", "how-to-sell", "cta-banner", "testimonials", "benefits", "faq"].includes(
              editingSection.section_type,
            ) && (
              <SectionCard
                icon={<MousePointerClick className="h-4 w-4" />}
                title="Botão CTA (opcional)"
                description="Adicione um botão que leva o visitante direto à calculadora de trade-in."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <LabelWithHint
                      label="Texto do botão"
                      hint="Texto exibido no botão. Deixe vazio para não exibir o botão."
                    />
                    <Input
                      value={form.cta_text || ""}
                      onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                      className="mt-0.5"
                      placeholder="Ex: Avaliar meu aparelho"
                      maxLength={40}
                    />
                    <CharCount current={(form.cta_text || "").length} max={40} />
                  </div>
                  <div>
                    <LabelWithHint label="Cor do fundo" hint="Cor de fundo do botão CTA." />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.cta_bg_color || "#f97316"}
                        onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.cta_bg_color || ""}
                        onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                        placeholder="#f97316"
                      />
                    </div>
                  </div>
                  <div>
                    <LabelWithHint label="Cor do texto" hint="Cor do texto do botão CTA." />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form.cta_text_color || "#ffffff"}
                        onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={form.cta_text_color || ""}
                        onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div>
                    <LabelWithHint label="Arredondamento" hint="Borda arredondada do botão (em px)." />
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={form.cta_border_radius ?? 8}
                      onChange={(e) => setForm({ ...form, cta_border_radius: parseInt(e.target.value) || 0 })}
                      className="mt-0.5 w-24"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <LabelWithHint
                      label="Margem do botão (px)"
                      hint="Espaçamento externo do botão. Superior controla o espaço entre o conteúdo e o botão."
                    />
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">Superior</Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={ctaLayoutData.cta_margin_top ?? 32}
                          onChange={(e) => setCtaLayoutField("cta_margin_top", parseInt(e.target.value) || 0)}
                          className="mt-0.5 w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Inferior</Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={ctaLayoutData.cta_margin_bottom ?? 0}
                          onChange={(e) => setCtaLayoutField("cta_margin_bottom", parseInt(e.target.value) || 0)}
                          className="mt-0.5 w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Esquerda</Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={ctaLayoutData.cta_margin_left ?? 0}
                          onChange={(e) => setCtaLayoutField("cta_margin_left", parseInt(e.target.value) || 0)}
                          className="mt-0.5 w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Direita</Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={ctaLayoutData.cta_margin_right ?? 0}
                          onChange={(e) => setCtaLayoutField("cta_margin_right", parseInt(e.target.value) || 0)}
                          className="mt-0.5 w-full"
                        />
                      </div>
                    </div>
                    <FieldHint text="Padrão: Superior 32px, demais 0px. Valores em pixels." />
                  </div>
                </div>
                {form.cta_text && (
                  <div className="mt-3 flex justify-center">
                    <span
                      className="inline-block px-6 py-2.5 font-semibold text-sm cursor-default"
                      style={{
                        backgroundColor: form.cta_bg_color || "#f97316",
                        color: form.cta_text_color || "#ffffff",
                        borderRadius: `${form.cta_border_radius ?? 8}px`,
                      }}
                    >
                      {form.cta_text}
                    </span>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Visibility */}
            <SectionCard
              icon={<Eye className="h-4 w-4" />}
              title="Visibilidade"
              description="Controle se esta seção aparece na landing page"
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>
                  {form.is_active
                    ? "Seção ativa — visível na landing page"
                    : "Seção desativada — oculta da landing page"}
                </Label>
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
function ReorderableList({
  items,
  setItems,
  renderItem,
  label,
  maxItems,
  defaultNewItem,
}: {
  items: any[];
  setItems: (arr: any[]) => void;
  renderItem: (item: any, i: number, update: (field: string, value: string) => void) => React.ReactNode;
  label: string;
  maxItems?: number;
  defaultNewItem?: any;
}) {
  const addItem = () => {
    if (maxItems && items.length >= maxItems) {
      toast.error(`Máximo de ${maxItems} itens`);
      return;
    }
    setItems([...items, defaultNewItem || { icon: "smartphone" }]);
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
        <Label className="text-sm font-semibold">
          Itens ({items.length}
          {maxItems ? `/${maxItems}` : ""})
        </Label>
        <Button variant="outline" size="sm" onClick={addItem} disabled={!!maxItems && items.length >= maxItems}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar {label}
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {label} {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveItem(i, "up")}
                disabled={i === 0}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                title="Mover para cima"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => moveItem(i, "down")}
                disabled={i === items.length - 1}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                title="Mover para baixo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => removeItem(i)}
                className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors"
              >
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
      <SectionCard
        icon={<LayoutGrid className="h-4 w-4" />}
        title="Passos do Processo"
        description="Cada passo exibe um ícone, título curto e descrição. Recomendado: 8 passos (2 fileiras de 4)."
      >
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
                <LabelWithHint label="Cor do ícone" hint="Cor do ícone neste passo." />
                <Input
                  type="color"
                  value={item.icon_color || "#f97316"}
                  onChange={(e) => update("icon_color", e.target.value)}
                  className="mt-0.5 h-9 w-16 p-1 cursor-pointer"
                />
              </div>
              <div>
                <LabelWithHint label="Título" hint="Título curto do passo. Ex: 'Escolha seu aparelho'" />
                <Input
                  value={item.title || ""}
                  onChange={(e) => update("title", e.target.value)}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Escolha seu aparelho"
                  maxLength={30}
                />
                <CharCount current={(item.title || "").length} max={30} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Descrição" hint="Texto de apoio curto explicando este passo." />
                <Textarea
                  value={item.description || ""}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Selecione o modelo e armazenamento do seu dispositivo."
                  maxLength={80}
                />
                <CharCount current={(item.description || "").length} max={80} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Steps Preview */}
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como esta seção aparecerá na landing page"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
        >
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Como funciona"}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(items.length > 0 ? items : [{ icon: "", title: "Passo", description: "Descrição" }]).map(
                (step: any, i: number) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {iconComponentMap[step.icon] ? (
                        <span className="scale-50">{iconComponentMap[step.icon]}</span>
                      ) : (
                        <span className="text-sm font-bold">{i + 1}</span>
                      )}
                    </div>
                    <p className="font-semibold text-xs">{step.title || "Título"}</p>
                    <p className="text-[10px] opacity-70">{step.description || "Descrição"}</p>
                  </div>
                ),
              )}
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
      return (
        parsed.cards || [
          { title: "OPÇÃO 1", subtitle: "Subtítulo do quadro 1", items: [] },
          { title: "OPÇÃO 2", subtitle: "Subtítulo do quadro 2", items: [] },
        ]
      );
    } catch {
      return [
        { title: "OPÇÃO 1", subtitle: "", items: [] },
        { title: "OPÇÃO 2", subtitle: "", items: [] },
      ];
    }
  };
  const setCards = (cards: any[]) => setForm({ ...form, content: JSON.stringify({ cards }) });
  const cards = getCards();

  const updateCard = (cardIdx: number, field: string, value: string) => {
    const updated = [...cards];
    updated[cardIdx] = { ...updated[cardIdx], [field]: value };
    setCards(updated);
  };
  const addItem = (cardIdx: number) => {
    if ((cards[cardIdx].items?.length || 0) >= 6) {
      toast.error("Máximo de 6 tópicos por quadro");
      return;
    }
    const updated = [...cards];
    updated[cardIdx] = {
      ...updated[cardIdx],
      items: [...(updated[cardIdx].items || []), { icon: "check-circle", text: "" }],
    };
    setCards(updated);
  };
  const removeItem = (cardIdx: number, itemIdx: number) => {
    const updated = [...cards];
    updated[cardIdx] = {
      ...updated[cardIdx],
      items: updated[cardIdx].items.filter((_: any, j: number) => j !== itemIdx),
    };
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
        <SectionCard
          key={cardIdx}
          icon={<LayoutGrid className="h-4 w-4" />}
          title={`Quadro ${cardIdx + 1}`}
          description={`Configure título, subtítulo e até 6 tópicos com ícones.`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithHint label="Título do quadro" hint="Título em destaque no topo do card. Ex: VENDA AGORA" />
                <Input
                  value={card.title || ""}
                  onChange={(e) => updateCard(cardIdx, "title", e.target.value)}
                  className="mt-0.5 text-sm font-semibold"
                  placeholder="Ex: VENDA AGORA"
                  maxLength={30}
                />
                <CharCount current={(card.title || "").length} max={30} />
              </div>
              <div>
                <LabelWithHint
                  label="Subtítulo"
                  hint="Texto descritivo abaixo do título. Ex: IDEAL PARA QUEM QUER VENDER RÁPIDO"
                />
                <Input
                  value={card.subtitle || ""}
                  onChange={(e) => updateCard(cardIdx, "subtitle", e.target.value)}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Ideal para quem quer vender rápido"
                  maxLength={80}
                />
                <CharCount current={(card.subtitle || "").length} max={80} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Tópicos ({card.items?.length || 0}/6)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(cardIdx)}
                  disabled={(card.items?.length || 0) >= 6}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar tópico
                </Button>
              </div>
              {card.items?.map((item: any, itemIdx: number) => (
                <div key={itemIdx} className="flex gap-2 items-center border rounded-lg p-2 bg-muted/30">
                  <Select
                    value={item.icon || "check-circle"}
                    onValueChange={(v) => updateItem(cardIdx, itemIdx, "icon", v)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableIcons).map(([key, { label, icon }]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-1.5">
                            {icon} {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="color"
                    value={item.icon_color || "#f97316"}
                    onChange={(e) => updateItem(cardIdx, itemIdx, "icon_color", e.target.value)}
                    className="h-8 w-10 p-0.5 cursor-pointer"
                    title="Cor do ícone"
                  />
                  <Input
                    value={item.text || ""}
                    onChange={(e) => updateItem(cardIdx, itemIdx, "text", e.target.value)}
                    className="flex-1 text-sm h-8"
                    placeholder="Texto do tópico"
                    maxLength={80}
                  />
                  <button
                    onClick={() => removeItem(cardIdx, itemIdx)}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como os dois quadros aparecerão na landing page"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#f5f5f5", color: form.text_color || "#000000" }}
        >
          <div className="p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-center font-bold text-sm mb-4">{form.title || "Saiba como vender"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card: any, cardIdx: number) => (
                  <div
                    key={cardIdx}
                    className="rounded-xl border p-5 md:p-6 space-y-4 h-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold text-orange-500">{card.title || `QUADRO ${cardIdx + 1}`}</p>
                      <p className="text-[10px] font-semibold mt-0.5 opacity-80">{card.subtitle || "Subtítulo"}</p>
                    </div>
                    <div className="space-y-2.5">
                      {(card.items?.length > 0
                        ? card.items
                        : [{ icon: "check-circle", text: "Tópico de exemplo" }]
                      ).map((item: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-primary flex-shrink-0 mt-0.5">
                            {iconComponentMap[item.icon] ? (
                              <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{availableIcons[item.icon]?.icon}</span>
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                          </span>
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
  const isYoutubeValid =
    form.video_url && (form.video_url.includes("youtube.com") || form.video_url.includes("youtu.be"));

  return (
    <>
      <SectionCard
        icon={<Video className="h-4 w-4" />}
        title="Vídeo do YouTube (opcional)"
        description="Vídeo exibido acima dos cards de benefícios. Aparece na landing page apenas se preenchido."
      >
        <div>
          <LabelWithHint
            label="URL do vídeo YouTube"
            hint="Cole a URL completa do YouTube. Ex: https://www.youtube.com/watch?v=abc123"
          />
          <Input
            value={form.video_url || ""}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1"
          />
          {form.video_url && !isYoutubeValid && (
            <p className="text-xs text-destructive mt-1">
              ⚠ URL não parece ser do YouTube. Use o formato: https://www.youtube.com/watch?v=...
            </p>
          )}
          {form.video_url && isYoutubeValid && embedUrl && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização do vídeo:</p>
              <div className="aspect-video rounded-lg overflow-hidden border max-w-md">
                <iframe
                  src={embedUrl}
                  title="Preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<LayoutGrid className="h-4 w-4" />}
        title="Cards de Benefícios"
        description="Até 4 cards com ícone, título e descrição curta. Cada card aparece com destaque na landing page."
      >
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
                <LabelWithHint label="Cor do ícone" hint="Cor do ícone neste card." />
                <Input
                  type="color"
                  value={item.icon_color || "#f97316"}
                  onChange={(e) => update("icon_color", e.target.value)}
                  className="mt-0.5 h-9 w-16 p-1 cursor-pointer"
                />
              </div>
              <div>
                <LabelWithHint label="Título" hint="Nome do benefício. Ex: 'Segurança'" />
                <Input
                  value={item.title || ""}
                  onChange={(e) => update("title", e.target.value)}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Segurança"
                  maxLength={25}
                />
                <CharCount current={(item.title || "").length} max={25} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Descrição" hint="Texto curto explicando o benefício." />
                <Textarea
                  value={item.description || ""}
                  onChange={(e) => update("description", e.target.value)}
                  rows={2}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Processo 100% seguro e transparente."
                  maxLength={80}
                />
                <CharCount current={(item.description || "").length} max={80} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Benefits Preview */}
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como os cards aparecerão na landing page"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
        >
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Nunca foi tão fácil"}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(items.length > 0 ? items : [{ icon: "shield", title: "Benefício", description: "Descrição" }]).map(
                (card: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border p-3 text-center space-y-1.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {iconComponentMap[card.icon] ? (
                        <span className="scale-50">{iconComponentMap[card.icon]}</span>
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <p className="font-semibold text-xs">{card.title || "Título"}</p>
                    <p className="text-[10px] opacity-70">{card.description || "Descrição"}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== TESTIMONIALS EDITOR ==========
function TestimonialsEditor({ items, setItems, form, setForm }: any) {
  const testimonialLayoutData = (() => {
    try { return form.layout ? JSON.parse(form.layout) : {}; } catch { return {}; }
  })();
  const setTestimonialsLayoutField = (key: string, value: string) => {
    const updated = { ...testimonialLayoutData, [key]: value };
    setForm({ ...form, layout: JSON.stringify(updated) });
  };

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handlePhotoUpload = async (file: File, idx: number, update: (key: string, val: any) => void) => {
    if (!file) return;
    setUploadingIdx(idx);
    const ext = file.name.split(".").pop();
    const path = `testimonials/${Date.now()}_${idx}.${ext}`;
    const { error } = await supabase.storage.from("lp-images").upload(path, file);
    if (error) {
      toast.error("Erro no upload: " + error.message);
      setUploadingIdx(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    update("photo", urlData.publicUrl);
    setUploadingIdx(null);
    toast.success("Foto enviada!");
  };

  return (
    <>
      <SectionCard
        icon={<Smartphone className="h-4 w-4" />}
        title="Modo de exibição por breakpoint"
        description="Escolha entre carrossel (com setas) ou grade (todos lado a lado) em cada tamanho de tela."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <LabelWithHint
              label="Mobile (< 640px)"
              hint="Carrossel: 1 depoimento por vez com setas. Grade: todos em 2 colunas."
            />
            <Select
              value={(testimonialLayoutData.mobile_layout as string) || 'carousel'}
              onValueChange={(v) => setTestimonialsLayoutField('mobile_layout', v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="grid">Grade (lado a lado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <LabelWithHint
              label="Tablet (640–1023px)"
              hint="Carrossel: 2 depoimentos por vez. Grade: todos em 2 colunas."
            />
            <Select
              value={(testimonialLayoutData.tablet_layout as string) || 'carousel'}
              onValueChange={(v) => setTestimonialsLayoutField('tablet_layout', v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="grid">Grade (lado a lado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <LabelWithHint
              label="Desktop (≥ 1024px)"
              hint="Carrossel: 4 depoimentos por vez. Grade: todos em 4 colunas."
            />
            <Select
              value={(testimonialLayoutData.desktop_layout as string) || 'carousel'}
              onValueChange={(v) => setTestimonialsLayoutField('desktop_layout', v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrossel</SelectItem>
                <SelectItem value="grid">Grade (lado a lado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<MessageSquare className="h-4 w-4" />}
        title="Depoimentos de Clientes"
        description="Até 10 depoimentos. Ative/desative individualmente quais aparecerão na landing page. Exibidos em carrossel."
      >
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Depoimento"
          maxItems={10}
          defaultNewItem={{ name: "", text: "", city: "", photo: "", active: true }}
          renderItem={(item, i, update) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Ativo na landing</Label>
                <Switch checked={item.active !== false} onCheckedChange={(v) => update("active", v as any)} />
              </div>
              <div className="md:col-span-2">
                <LabelWithHint label="Depoimento" hint="Texto do depoimento. Mantenha autêntico e direto." />
                <Textarea
                  value={item.text || ""}
                  onChange={(e) => update("text", e.target.value)}
                  rows={3}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Processo super rápido e recebi um valor justo!"
                  maxLength={300}
                />
                <CharCount current={(item.text || "").length} max={300} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <LabelWithHint label="Nome e Sobrenome" hint="Nome completo do cliente." />
                  <Input
                    value={item.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                    className="mt-0.5 text-sm"
                    placeholder="Ex: Maria Silva"
                    maxLength={40}
                  />
                </div>
                <div>
                  <LabelWithHint label="Cidade e Estado" hint="Ex: São Paulo, SP" />
                  <Input
                    value={item.city || ""}
                    onChange={(e) => update("city", e.target.value)}
                    className="mt-0.5 text-sm"
                    placeholder="Ex: São Paulo, SP"
                    maxLength={40}
                  />
                </div>
              </div>
              <div>
                <LabelWithHint label="Foto do cliente" hint="Recomendado: 100×100px, quadrada, JPG ou PNG." />
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs cursor-pointer hover:bg-accent/50 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingIdx === i ? "Enviando..." : "Subir foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f, i, update);
                      }}
                      disabled={uploadingIdx === i}
                    />
                  </label>
                  {item.photo && (
                    <div className="flex items-center gap-2">
                      <img src={item.photo} alt="" className="w-10 h-10 rounded-full object-cover border" />
                      <button onClick={() => update("photo", "")} className="text-xs text-destructive hover:underline">
                        Remover
                      </button>
                    </div>
                  )}
                </div>
                <FieldHint text="📐 Recomendado: 100×100px | JPG ou PNG | Máx: 2MB" />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* Testimonials Preview */}
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Prévia dos cards ativos (na landing será carrossel)"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
        >
          <div className="p-6">
            <p className="text-center font-bold text-sm mb-4">{form.title || "O que nossos clientes dizem"}</p>
            {(() => {
              const activeItems = items.filter((t: any) => t.active !== false);
              const displayItems =
                activeItems.length > 0 ? activeItems : [{ name: "Nome", text: "Depoimento", city: "Cidade, UF" }];
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {displayItems.slice(0, 4).map((t: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-xl border p-3 space-y-2 flex flex-col"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                      >
                        <div className="text-primary/40 text-lg font-serif leading-none">"</div>
                        <p className="text-[9px] opacity-80 flex-1">{t.text || "Depoimento"}</p>
                        <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                          {t.photo ? (
                            <img src={t.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold">
                              {(t.name || "?").charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-[9px] font-semibold">{t.name || "Nome"}</p>
                            {t.city && <p className="text-[7px] opacity-60">{t.city}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeItems.length > 4 && (
                    <p className="text-[9px] text-center opacity-50 mt-2">
                      + {activeItems.length - 4} depoimentos (visíveis no carrossel)
                    </p>
                  )}
                  <p className="text-[9px] text-center opacity-40 mt-2">
                    {activeItems.length} de {items.length} depoimentos ativos
                  </p>
                </>
              );
            })()}
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
      <SectionCard
        icon={<HelpCircle className="h-4 w-4" />}
        title="Perguntas Frequentes"
        description="Pares de pergunta e resposta exibidos em accordion. Recomendado: 4–6 perguntas."
      >
        <ReorderableList
          items={items}
          setItems={setItems}
          label="Pergunta"
          maxItems={10}
          defaultNewItem={{ question: "", answer: "" }}
          renderItem={(item, _i, update) => (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <LabelWithHint label="Pergunta" hint="Pergunta que os clientes costumam fazer." />
                <Input
                  value={item.question || ""}
                  onChange={(e) => update("question", e.target.value)}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Como funciona o trade-in?"
                  maxLength={80}
                />
                <CharCount current={(item.question || "").length} max={80} />
              </div>
              <div>
                <LabelWithHint label="Resposta" hint="Resposta clara e objetiva. Pode ser mais detalhada." />
                <Textarea
                  value={item.answer || ""}
                  onChange={(e) => update("answer", e.target.value)}
                  rows={3}
                  className="mt-0.5 text-sm"
                  placeholder="Ex: Você avalia o estado do seu aparelho, recebe uma oferta e pode usar o valor como crédito."
                  maxLength={300}
                />
                <CharCount current={(item.answer || "").length} max={300} />
              </div>
            </div>
          )}
        />
      </SectionCard>

      {/* FAQ Preview */}
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como o FAQ aparecerá na landing page (accordion funcional)"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
        >
          <div className="p-6 max-w-lg mx-auto">
            <p className="text-center font-bold text-sm mb-4">{form.title || "Dúvidas frequentes"}</p>
            <Accordion type="single" collapsible className="space-y-1">
              {(items.length > 0 ? items : [{ question: "Pergunta de exemplo?", answer: "Resposta de exemplo." }]).map(
                (faq: any, i: number) => (
                  <AccordionItem key={i} value={`preview-${i}`} className="border rounded-md px-3">
                    <AccordionTrigger className="text-xs text-left font-medium py-2">
                      {faq.question || "Pergunta"}
                    </AccordionTrigger>
                    <AccordionContent className="text-[10px] opacity-80 pb-2">
                      {faq.answer || "Resposta"}
                    </AccordionContent>
                  </AccordionItem>
                ),
              )}
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
    if (items.length >= 4) {
      toast.error("Máximo de 4 colunas");
      return;
    }
    setItems([...items, { title: "Nova coluna", links: [] }]);
  };
  const removeColumn = (i: number) => setItems(items.filter((_: any, idx: number) => idx !== i));
  const updateColumnTitle = (i: number, title: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], title };
    setItems(updated);
  };
  const addLink = (colIdx: number) => {
    if ((items[colIdx].links?.length || 0) >= 6) {
      toast.error("Máximo de 6 links por coluna");
      return;
    }
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
      <SectionCard
        icon={<Link2 className="h-4 w-4" />}
        title="Colunas de Links"
        description="Organize links em colunas. Máximo: 4 colunas, 6 links por coluna."
      >
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
                  <Input
                    value={col.title || ""}
                    onChange={(e) => updateColumnTitle(i, e.target.value)}
                    className="mt-0.5 text-sm font-medium"
                    placeholder="Ex: Institucional"
                    maxLength={25}
                  />
                  <CharCount current={(col.title || "").length} max={25} />
                </div>
                <button
                  onClick={() => removeColumn(i)}
                  className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors flex-shrink-0 mt-4"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-muted">
                <p className="text-[11px] text-muted-foreground">Links ({col.links?.length || 0}/6)</p>
                {col.links?.map((link: any, j: number) => (
                  <div key={j} className="flex gap-2 items-center">
                    <Input
                      value={link.label || ""}
                      onChange={(e) => updateLink(i, j, "label", e.target.value)}
                      placeholder="Texto do link"
                      className="flex-1 text-sm"
                    />
                    <Input
                      value={link.url || ""}
                      onChange={(e) => updateLink(i, j, "url", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-sm"
                    />
                    <button onClick={() => removeLink(i, j)} className="text-destructive hover:text-destructive/80 p-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {col.links?.some((l: any) => l.url && l.url !== "#" && !isValidUrl(l.url)) && (
                  <p className="text-xs text-destructive">⚠ Algumas URLs são inválidas. Use https://</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addLink(i)}
                  className="text-xs"
                  disabled={(col.links?.length || 0) >= 6}
                >
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
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como o rodapé aparecerá na landing page"
      >
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#1a1a2e", color: form.text_color || "#ffffff" }}
        >
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs font-bold block mb-2">Policell</span>
                <p className="text-[9px] opacity-60">Seu aparelho vale mais do que você imagina.</p>
              </div>
              {(items.length > 0 ? items : [{ title: "Coluna", links: [{ label: "Link", url: "#" }] }]).map(
                (col: any, i: number) => (
                  <div key={i}>
                    <p className="text-[10px] font-semibold mb-1.5">{col.title}</p>
                    <ul className="space-y-1">
                      {col.links?.map((link: any, j: number) => (
                        <li key={j} className="text-[9px] opacity-60">
                          {link.label || "Link"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              )}
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
      <SectionCard
        icon={<Type className="h-4 w-4" />}
        title="Copyright"
        description="Texto exibido no rodapé final da página. Use o ano atual para manter atualizado."
      >
        <div>
          <LabelWithHint label="Texto de copyright" hint={`Ex: © ${year} Policell. Todos os direitos reservados.`} />
          <Input
            value={form.content || ""}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="mt-1"
            placeholder={`© ${year} Sua Empresa. Todos os direitos reservados.`}
            maxLength={100}
          />
          <div className="flex justify-between mt-1">
            <FieldHint text="Aparece centralizado no fundo da página" />
            <CharCount current={(form.content || "").length} max={100} />
          </div>
        </div>
      </SectionCard>

      {/* Footer Preview */}
      <SectionCard icon={<Eye className="h-4 w-4" />} title="Pré-visualização" description="Como o rodapé aparecerá">
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: form.bg_color || "#111111", color: form.text_color || "#999999" }}
        >
          <div className="px-4 py-3 text-center text-[11px] opacity-70">
            {form.content || `© ${year} Policell. Todos os direitos reservados.`}
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== HERO BACKGROUND DRAGGER ==========
function HeroBackgroundDragger({
  section,
  bgPosX,
  bgPosY,
  onChange,
}: {
  section: any;
  bgPosX: number;
  bgPosY: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef<{ startX: number; startY: number; startBgX: number; startBgY: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = React.useState(false);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBgX: bgPosX,
      startBgY: bgPosY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    const el = containerRef.current;
    if (!state || !el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const deltaX = ((e.clientX - state.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - state.startY) / rect.height) * 100;
    const nextX = clamp(state.startBgX - deltaX);
    const nextY = clamp(state.startBgY - deltaY);
    onChange(Math.round(nextX), Math.round(nextY));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-muted-foreground">Pré-visualização da imagem — arraste para ajustar a posição:</p>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(e) => {
          if (dragStateRef.current) endDrag(e);
        }}
        className={`relative w-full aspect-[21/9] overflow-hidden rounded-xl border select-none touch-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <HeroSection section={section} previewMode />
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border text-[11px] font-medium text-foreground shadow-sm pointer-events-none">
          Arraste a imagem para ajustar a posição
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm border text-[10px] font-mono text-muted-foreground shadow-sm pointer-events-none">
          X: {Math.round(bgPosX)}% &nbsp; Y: {Math.round(bgPosY)}%
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(50, 50)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Resetar para o centro
      </button>
    </div>
  );
}

// ========== HERO EDITOR (preserved from before) ==========
function HeroEditor({ form, setForm, onUpload, uploading }: any) {
  const layoutData = (() => {
    try {
      return form.layout ? JSON.parse(form.layout) : {};
    } catch {
      return {};
    }
  })();
  const setLayoutField = (key: string, value: string | number) => {
    const updated = { ...layoutData, [key]: value };
    setForm({ ...form, layout: JSON.stringify(updated) });
  };
  const setLayoutFields = (patch: Record<string, string | number>) => {
    const updated = { ...layoutData, ...patch };
    setForm({ ...form, layout: JSON.stringify(updated) });
  };

  const vAlign = layoutData.vAlign || "center";
  const hAlign = layoutData.hAlign || "center";
  const textAlign = layoutData.textAlign || "center";
  const bgPosX: number = typeof layoutData.bgPosX === "number" ? layoutData.bgPosX : 50;
  const bgPosY: number = typeof layoutData.bgPosY === "number" ? layoutData.bgPosY : 50;

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
      <SectionCard
        icon={<Type className="h-4 w-4" />}
        title="Subtítulo"
        description="Texto secundário exibido abaixo do título principal do hero"
      >
        <div>
          <LabelWithHint
            label="Subtítulo"
            hint="Texto de apoio abaixo do título. Ideal: 1-2 linhas, até 120 caracteres."
          />
          <Textarea
            value={form.content || ""}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={2}
            className="mt-1"
            placeholder="Ex: Receba uma oferta justa pelo seu aparelho em minutos"
            maxLength={120}
          />
          <div className="flex justify-between mt-1">
            <FieldHint text="Texto de apoio abaixo do título" />
            <CharCount current={(form.content || "").length} max={120} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Image className="h-4 w-4" />}
        title="Imagem de Fundo"
        description="Imagem de fundo do banner hero. Recomendado: 1920×800px, JPG, máx. 500KB."
      >
        <ImageUploader
          form={form}
          setForm={setForm}
          onUpload={onUpload}
          uploading={uploading}
          label="Imagem de fundo"
          recommendedSize="1920×800px"
        />
        {form.image_url && (
          <HeroBackgroundDragger
            section={{ ...form, layout: JSON.stringify({ ...layoutData, bgPosX, bgPosY, vAlign, hAlign, textAlign }) }}
            bgPosX={bgPosX}
            bgPosY={bgPosY}
            onChange={(x, y) => setLayoutFields({ bgPosX: x, bgPosY: y })}
          />
        )}
        <div className="mt-4">
          <LabelWithHint
            label="Link ao clicar no banner (opcional)"
            hint="Quando preenchido, o banner inteiro vira clicável e leva para esta URL. Deixe em branco para usar apenas o botão CTA."
          />
          <Input
            type="url"
            value={form.link_url || ""}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            className="mt-1"
            placeholder="https://exemplo.com/promocao  ou  /calculadora"
            maxLength={500}
          />
          <FieldHint text="Aceita URL completa (https://...) ou caminho interno (/calculadora)." />
        </div>
        <div className="mt-4">
          <LabelWithHint
            label="Imagens por breakpoint (opcional)"
            hint="Defina imagens específicas para cada tamanho de tela. Se não informadas, a imagem principal é usada em todos os breakpoints."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tablet (640–1023px)</label>
              <Input
                value={(layoutData.tablet_image_url as string) || ""}
                onChange={(e) => setLayoutField("tablet_image_url", e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Desktop (1024–1279px)</label>
              <Input
                value={(layoutData.desktop_image_url as string) || ""}
                onChange={(e) => setLayoutField("desktop_image_url", e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Large (≥1280px)</label>
              <Input
                value={(layoutData.large_image_url as string) || ""}
                onChange={(e) => setLayoutField("large_image_url", e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>
          </div>
          <FieldHint text="Mobile sempre usa a imagem principal. Breakpoints maiores usam a imagem correspondente, ou caem para a principal se não configurada." />
        </div>
      </SectionCard>

      {/* Slides extras + autoplay */}
      <SectionCard
        icon={<Image className="h-4 w-4" />}
        title="Slides adicionais (carrossel)"
        description="Adicione até 2 slides extras (total de 3). O banner gira automaticamente, com swipe no mobile e setas no desktop."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <LabelWithHint
                label="Tempo entre slides (ms)"
                hint="Tempo de exibição de cada slide. 0 desativa a rotação automática (mantém swipe e setas)."
              />
              <Input
                type="number"
                min={0}
                step={500}
                value={Number(layoutData.autoplay_ms ?? 5000)}
                onChange={(e) => setLayoutField("autoplay_ms", Number(e.target.value) || 0)}
                className="mt-1"
              />
              <FieldHint text="Recomendado: 4000–7000ms. 0 = manual." />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">
              <strong>Dimensões recomendadas:</strong>
              <br />• Desktop: 1920×800px
              <br />• Mobile: 1080×1350px
              <br />JPG/WebP, &lt; 400KB
            </div>
          </div>

          {[0, 1].map((idx) => {
            const slides = Array.isArray(layoutData.slides) ? layoutData.slides : [];
            const slide = slides[idx] || {};
            const updateSlide = (patch: Record<string, any>) => {
              const next = [...slides];
              while (next.length <= idx) next.push({});
              next[idx] = { ...next[idx], ...patch };
              setLayoutField("slides", next as any);
            };
            const removeSlide = () => {
              const next = slides.filter((_: any, i: number) => i !== idx);
              setLayoutField("slides", next as any);
            };
            const isActive = !!slide.image_url || !!slide.title;
            return (
              <div key={idx} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded border">
                    Slide extra {idx + 1}
                  </span>
                  {isActive && (
                    <button
                      onClick={removeSlide}
                      className="text-destructive hover:text-destructive/80 text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <LabelWithHint label="URL da imagem" hint="Cole o link de uma imagem já hospedada ou faça upload no slide principal e copie a URL." />
                    <Input
                      value={slide.image_url || ""}
                      onChange={(e) => updateSlide({ image_url: e.target.value })}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <LabelWithHint label="Link ao clicar (opcional)" hint="Quando preenchido e sem CTA, o slide inteiro vira clicável." />
                    <Input
                      value={slide.link_url || ""}
                      onChange={(e) => updateSlide({ link_url: e.target.value })}
                      placeholder="/calculadora ou https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <LabelWithHint label="Título" hint="Opcional. Aparece sobre a imagem." />
                    <Input
                      value={slide.title || ""}
                      onChange={(e) => updateSlide({ title: e.target.value })}
                      maxLength={60}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <LabelWithHint label="Subtítulo" hint="Opcional. Texto curto de apoio." />
                    <Input
                      value={slide.content || ""}
                      onChange={(e) => updateSlide({ content: e.target.value })}
                      maxLength={120}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Imagens por breakpoint (opcional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Tablet (640–1023px)</label>
                      <Input
                        value={slide.tablet_image_url || ""}
                        onChange={(e) => updateSlide({ tablet_image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Desktop (1024–1279px)</label>
                      <Input
                        value={slide.desktop_image_url || ""}
                        onChange={(e) => updateSlide({ desktop_image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Large (≥1280px)</label>
                      <Input
                        value={slide.large_image_url || ""}
                        onChange={(e) => updateSlide({ large_image_url: e.target.value })}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
                {slide.image_url && (
                  <div className="relative w-full aspect-[16/7] overflow-hidden rounded-lg border">
                    <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Smartphone className="h-4 w-4" />}
        title="Configurações Mobile"
        description="Ajuste como o banner aparece em telas pequenas (até 768px)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelWithHint
              label="Proporção no celular"
              hint="Define o formato do banner em telas pequenas. 16:10 é mais largo (menos altura), 4:5 ocupa mais tela vertical."
            />
            <Select
              value={(layoutData.mobile_aspect as string) || "16/10"}
              onValueChange={(v) => setLayoutField("mobile_aspect", v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="16/10">16:10 (recomendado)</SelectItem>
                <SelectItem value="3/4">3:4</SelectItem>
                <SelectItem value="1/1">1:1 (quadrado)</SelectItem>
                <SelectItem value="4/5">4:5 (alto)</SelectItem>
              </SelectContent>
            </Select>
            <FieldHint text="Use 16:10 quando a imagem for horizontal." />
          </div>
          <div>
            <LabelWithHint
              label="Ajuste da imagem no celular"
              hint="'Cobrir' preenche toda a área cortando as laterais. 'Conter' mostra a imagem inteira sem cortar (pode aparecer borda da cor de fundo)."
            />
            <Select
              value={(layoutData.mobile_fit as string) || "cover"}
              onValueChange={(v) => setLayoutField("mobile_fit", v)}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cobrir (corta laterais)</SelectItem>
                <SelectItem value="contain">Conter (sem cortar)</SelectItem>
              </SelectContent>
            </Select>
            <FieldHint text="Use 'Conter' se a imagem horizontal estiver sendo cortada no celular." />
          </div>
          <div>
            <LabelWithHint
              label="Posição X mobile"
              hint="Ponto focal horizontal da imagem no mobile (0 = esquerda, 50 = centro, 100 = direita)."
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={typeof layoutData.mobile_bg_pos_x === "number" ? layoutData.mobile_bg_pos_x : 50}
              onChange={(e) => setLayoutField("mobile_bg_pos_x", Number(e.target.value))}
              className="mt-0.5"
            />
          </div>
          <div>
            <LabelWithHint
              label="Posição Y mobile"
              hint="Ponto focal vertical da imagem no mobile (0 = topo, 50 = centro, 100 = baixo)."
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={typeof layoutData.mobile_bg_pos_y === "number" ? layoutData.mobile_bg_pos_y : 50}
              onChange={(e) => setLayoutField("mobile_bg_pos_y", Number(e.target.value))}
              className="mt-0.5"
            />
          </div>
        </div>
        {form.image_url && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Pré-visualização mobile (≈375px):</p>
            <div
              className="max-w-[375px] overflow-hidden rounded-xl border"
              style={{ aspectRatio: (layoutData.mobile_aspect as string) || '16/10' }}
            >
              <HeroSection section={form} previewMode />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<LayoutGrid className="h-4 w-4" />}
        title="Posição do Conteúdo"
        description="Ajuste onde o título, subtítulo e botão aparecem sobre o banner."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Alinhamento Vertical",
              hint: "Topo, centro ou parte inferior do banner.",
              options: vOptions,
              value: vAlign,
              key: "vAlign",
            },
            {
              label: "Alinhamento Horizontal",
              hint: "Esquerda, centro ou direita do banner.",
              options: hOptions,
              value: hAlign,
              key: "hAlign",
            },
            {
              label: "Alinhamento do Texto",
              hint: "Alinha o texto dentro do bloco.",
              options: tOptions,
              value: textAlign,
              key: "textAlign",
            },
          ].map((group) => (
            <div key={group.key}>
              <LabelWithHint label={group.label} hint={group.hint} />
              <div className="flex gap-1 mt-1.5">
                {group.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLayoutField(group.key, opt.value)}
                    className={`flex-1 text-xs py-2 px-1 rounded-md border transition-colors ${
                      group.value === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent border-border"
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
          <div className="relative w-full aspect-[21/9] overflow-hidden rounded-xl border">
            <HeroSection
              section={{
                ...form,
                layout: JSON.stringify({ ...layoutData, bgPosX, bgPosY, vAlign, hAlign, textAlign }),
              }}
              previewMode
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Palette className="h-4 w-4" />}
        title="Botão Principal — Vender / Avaliar"
        description="Botão primário do hero. Por padrão leva à calculadora com intenção de venda."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelWithHint label="Texto do botão" hint="Texto curto e direto. Ex: 'Quero vender'" />
            <Input
              value={form.cta_text || ""}
              onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
              className="mt-1"
              placeholder="Ex: Quero vender meu aparelho"
            />
          </div>
          <div>
            <LabelWithHint
              label="Intenção / Destino"
              hint="Define o parâmetro mode= enviado para a calculadora, permitindo bifurcar o fluxo."
            />
            <Select
              value={(layoutData.cta1_intent as string) || "sell"}
              onValueChange={(v) => setLayoutField("cta1_intent", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sell">Vender (mode=sell)</SelectItem>
                <SelectItem value="upgrade">Trocar/Upgrade (mode=upgrade)</SelectItem>
                <SelectItem value="none">Calculadora padrão (sem tag)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <LabelWithHint label="Border Radius (px)" hint="0 = quadrado, 25 = arredondado, 50 = pílula." />
            <Input
              type="number"
              min={0}
              max={50}
              value={form.cta_border_radius ?? 8}
              onChange={(e) => setForm({ ...form, cta_border_radius: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <LabelWithHint
              label="URL customizada (opcional)"
              hint="Sobrescreve o destino padrão. Use https://... para externo ou /caminho para interno."
            />
            <Input
              value={(layoutData.cta1_url as string) || ""}
              onChange={(e) => setLayoutField("cta1_url", e.target.value)}
              className="mt-1"
              placeholder="(em branco usa /calculadora)"
            />
          </div>
          <div>
            <LabelWithHint label="Cor de fundo do botão" hint="Cor que contraste com o fundo do hero." />
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.cta_bg_color || "#7c3aed"}
                onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={form.cta_bg_color || ""}
                onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
              />
            </div>
          </div>
          <div>
            <LabelWithHint label="Cor do texto do botão" hint="Use branco sobre cores escuras." />
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.cta_text_color || "#ffffff"}
                onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={form.cta_text_color || ""}
                onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<MousePointerClick className="h-4 w-4" />}
        title="Botão Secundário — Trocar / Upgrade"
        description="Botão opcional ao lado do principal, focado em troca/upgrade. Aparece apenas quando ativado."
      >
        <div className="flex items-center justify-between rounded-lg border p-3 mb-4">
          <div>
            <Label className="text-sm font-medium">Exibir botão secundário</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quando ativo, o hero exibe dois botões lado a lado.
            </p>
          </div>
          <Switch
            checked={!!layoutData.cta2_enabled}
            onCheckedChange={(checked) => setLayoutField("cta2_enabled", checked ? 1 : 0)}
          />
        </div>

        {!!layoutData.cta2_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <LabelWithHint label="Texto do botão" hint="Ex: 'Quero trocar por um novo'" />
              <Input
                value={(layoutData.cta2?.text as string) || ""}
                onChange={(e) =>
                  setLayoutField("cta2", { ...(layoutData.cta2 || {}), text: e.target.value } as any)
                }
                className="mt-1"
                placeholder="Ex: Quero trocar / fazer upgrade"
              />
            </div>
            <div>
              <LabelWithHint
                label="Intenção / Destino"
                hint="Define o parâmetro mode= enviado para a calculadora."
              />
              <Select
                value={(layoutData.cta2?.intent as string) || "upgrade"}
                onValueChange={(v) =>
                  setLayoutField("cta2", { ...(layoutData.cta2 || {}), intent: v } as any)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upgrade">Trocar/Upgrade (mode=upgrade)</SelectItem>
                  <SelectItem value="sell">Vender (mode=sell)</SelectItem>
                  <SelectItem value="none">Calculadora padrão (sem tag)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelWithHint label="Border Radius (px)" hint="0 = quadrado, 25 = arredondado, 50 = pílula." />
              <Input
                type="number"
                min={0}
                max={50}
                value={(layoutData.cta2?.radius as number) ?? 8}
                onChange={(e) =>
                  setLayoutField("cta2", { ...(layoutData.cta2 || {}), radius: Number(e.target.value) } as any)
                }
                className="mt-1"
              />
            </div>
            <div>
              <LabelWithHint
                label="URL customizada (opcional)"
                hint="Sobrescreve o destino padrão."
              />
              <Input
                value={(layoutData.cta2?.url as string) || ""}
                onChange={(e) =>
                  setLayoutField("cta2", { ...(layoutData.cta2 || {}), url: e.target.value } as any)
                }
                className="mt-1"
                placeholder="(em branco usa /calculadora?mode=upgrade)"
              />
            </div>
            <div>
              <LabelWithHint label="Cor de fundo do botão" hint="Sugerimos um tom diferente do principal." />
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={(layoutData.cta2?.bg as string) || "#10b981"}
                  onChange={(e) =>
                    setLayoutField("cta2", { ...(layoutData.cta2 || {}), bg: e.target.value } as any)
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={(layoutData.cta2?.bg as string) || ""}
                  onChange={(e) =>
                    setLayoutField("cta2", { ...(layoutData.cta2 || {}), bg: e.target.value } as any)
                  }
                />
              </div>
            </div>
            <div>
              <LabelWithHint label="Cor do texto do botão" hint="Garanta contraste suficiente." />
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={(layoutData.cta2?.color as string) || "#ffffff"}
                  onChange={(e) =>
                    setLayoutField("cta2", { ...(layoutData.cta2 || {}), color: e.target.value } as any)
                  }
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={(layoutData.cta2?.color as string) || ""}
                  onChange={(e) =>
                    setLayoutField("cta2", { ...(layoutData.cta2 || {}), color: e.target.value } as any)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização dos Botões"
        description="Veja como ficam os botões com as configurações atuais."
      >
        <div className="flex flex-wrap gap-3">
          {form.cta_text && (
            <button
              className="px-6 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: form.cta_bg_color || "#7c3aed",
                color: form.cta_text_color || "#ffffff",
                borderRadius: `${form.cta_border_radius ?? 8}px`,
              }}
            >
              {form.cta_text}
            </button>
          )}
          {!!layoutData.cta2_enabled && layoutData.cta2?.text && (
            <button
              className="px-6 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: (layoutData.cta2?.bg as string) || "#10b981",
                color: (layoutData.cta2?.color as string) || "#ffffff",
                borderRadius: `${(layoutData.cta2?.radius as number) ?? 8}px`,
              }}
            >
              {layoutData.cta2.text}
            </button>
          )}
          {!form.cta_text && !layoutData.cta2_enabled && (
            <p className="text-xs text-muted-foreground">Configure ao menos um botão acima.</p>
          )}
        </div>
      </SectionCard>
    </>
  );
}

// ========== IMAGE UPLOADER ==========
function ImageUploader({ form, setForm, onUpload, uploading, label, recommendedSize, imgDimensions }: any) {
  return (
    <div>
      <LabelWithHint
        label={label}
        hint={
          recommendedSize
            ? `Tamanho recomendado: ${recommendedSize}. Formatos: JPG, PNG, WebP.`
            : "Formatos aceitos: JPG, PNG, WebP."
        }
      />
      <div className="flex items-center gap-3 mt-2">
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Fazer upload"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
        {form.image_url && (
          <div className="flex items-center gap-2">
            <img src={form.image_url} alt="" className="h-12 w-12 rounded-lg object-cover border" />
            <button
              onClick={() => setForm({ ...form, image_url: "" })}
              className="text-xs text-destructive hover:underline"
            >
              Remover
            </button>
          </div>
        )}
      </div>
      {imgDimensions && (
        <p className="text-[11px] text-muted-foreground mt-1">
          📐 Dimensões detectadas: {imgDimensions.w}×{imgDimensions.h}px
        </p>
      )}
      {recommendedSize && (
        <FieldHint text={`📐 Recomendado: ${recommendedSize} | Formatos: JPG, PNG ou WebP | Máx: 2MB`} />
      )}
    </div>
  );
}

// ========== CTA BANNER EDITOR ==========
function CtaBannerEditor({ form, setForm, onUpload, uploading }: any) {
  const contentData = (() => {
    try {
      return form.content ? JSON.parse(form.content) : {};
    } catch {
      return {};
    }
  })();
  const setContentField = (key: string, value: string) => {
    const updated = { ...contentData, [key]: value };
    setForm({ ...form, content: JSON.stringify(updated) });
  };

  return (
    <>
      <SectionCard
        icon={<Type className="h-4 w-4" />}
        title="Subtítulo / Texto destaque"
        description="Texto em destaque abaixo do título principal do banner."
      >
        <div>
          <LabelWithHint label="Subtítulo" hint="Frase de impacto. Ex: Entre para o nosso grupo vip no WhatsApp" />
          <Textarea
            value={contentData.subtitle || ""}
            onChange={(e) => setContentField("subtitle", e.target.value)}
            rows={2}
            className="mt-1"
            placeholder="Ex: Entre para o nosso grupo vip no WhatsApp"
            maxLength={120}
          />
          <div className="flex justify-between mt-1">
            <FieldHint text="Texto em destaque no banner" />
            <CharCount current={(contentData.subtitle || "").length} max={120} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Image className="h-4 w-4" />}
        title="Imagem de Fundo"
        description="Imagem de fundo do banner. Recomendado: 1920×400px, JPG."
      >
        <ImageUploader
          form={form}
          setForm={setForm}
          onUpload={onUpload}
          uploading={uploading}
          label="Imagem de fundo"
          recommendedSize="1920×400px"
        />
      </SectionCard>

      <SectionCard
        icon={<Link2 className="h-4 w-4" />}
        title="Botão CTA"
        description="Configure o botão de ação e a URL de destino."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <LabelWithHint label="Texto do botão" hint="Texto curto. Ex: eu quero" />
            <Input
              value={form.cta_text || ""}
              onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
              className="mt-1"
              placeholder="Ex: eu quero"
              maxLength={30}
            />
          </div>
          <div>
            <LabelWithHint label="URL de destino" hint="Link que o botão abrirá. Ex: https://wa.me/5511999999999" />
            <Input
              value={contentData.cta_url || ""}
              onChange={(e) => setContentField("cta_url", e.target.value)}
              className="mt-1"
              placeholder="https://wa.me/5511999999999"
            />
            {contentData.cta_url && !isValidUrl(contentData.cta_url) && (
              <p className="text-xs text-destructive mt-1">⚠ URL inválida. Use https://</p>
            )}
          </div>
          <div>
            <LabelWithHint label="Border Radius (px)" hint="0 = quadrado, 25 = arredondado" />
            <Input
              type="number"
              min={0}
              max={50}
              value={form.cta_border_radius ?? 25}
              onChange={(e) => setForm({ ...form, cta_border_radius: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <LabelWithHint label="Cor de fundo do botão" hint="Cor de fundo do CTA" />
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.cta_bg_color || "#6ee7b7"}
                onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={form.cta_bg_color || ""}
                onChange={(e) => setForm({ ...form, cta_bg_color: e.target.value })}
              />
            </div>
          </div>
          <div>
            <LabelWithHint label="Cor do texto do botão" hint="Cor do texto do CTA" />
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.cta_text_color || "#1a5c3a"}
                onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={form.cta_text_color || ""}
                onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Preview */}
      <SectionCard
        icon={<Eye className="h-4 w-4" />}
        title="Pré-visualização"
        description="Como o banner aparecerá na landing page"
      >
        <div
          className="rounded-lg border overflow-hidden relative"
          style={{ backgroundColor: form.bg_color || "#1a5c3a", color: form.text_color || "#ffffff" }}
        >
          {form.image_url && (
            <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="relative p-6 md:p-8">
            <div className="max-w-md">
              {form.title && <p className="text-xs opacity-80">{form.title}</p>}
              {contentData.subtitle && (
                <p className="text-sm md:text-base font-extrabold mt-1">{contentData.subtitle}</p>
              )}
              {form.cta_text && (
                <button
                  className="mt-3 px-5 py-1.5 text-xs font-bold rounded"
                  style={{
                    backgroundColor: form.cta_bg_color || "#6ee7b7",
                    color: form.cta_text_color || "#1a5c3a",
                    borderRadius: `${form.cta_border_radius ?? 25}px`,
                  }}
                >
                  {form.cta_text}
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ========== VIDEO EDITOR ==========
function VideoEditor({ form, setForm }: any) {
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("embed")) return url;
    const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const isValidYouTube = (url: string) => {
    if (!url) return false;
    return /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))/.test(url);
  };

  return (
    <>
      <SectionCard icon={<Video className="h-4 w-4" />} title="URL do Vídeo" description="Cole o link do YouTube aqui.">
        <div>
          <LabelWithHint label="URL do YouTube" hint="Ex: https://www.youtube.com/watch?v=xxxxx" />
          <Input
            value={form.video_url || ""}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="mt-1"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          {form.video_url && !isValidYouTube(form.video_url) && (
            <p className="text-xs text-destructive mt-1">⚠ URL inválida. Cole um link do YouTube.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<Type className="h-4 w-4" />}
        title="Descrição (opcional)"
        description="Texto exibido abaixo do título, acima do vídeo."
      >
        <div>
          <LabelWithHint label="Descrição" hint="Texto curto abaixo do título" />
          <Textarea
            value={form.content || ""}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="mt-1"
            rows={2}
            placeholder="Opcional"
            maxLength={150}
          />
          <CharCount current={(form.content || "").length} max={150} />
        </div>
      </SectionCard>

      {/* Preview */}
      {form.video_url && isValidYouTube(form.video_url) && (
        <SectionCard
          icon={<Eye className="h-4 w-4" />}
          title="Pré-visualização"
          description="Como o vídeo aparecerá na landing page"
        >
          <div
            className="rounded-lg border overflow-hidden p-4"
            style={{ backgroundColor: form.bg_color || "#ffffff", color: form.text_color || "#000000" }}
          >
            {form.title && <p className="text-sm font-bold text-center mb-2">{form.title}</p>}
            {form.content && <p className="text-xs text-center opacity-80 mb-3">{form.content}</p>}
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe src={getEmbedUrl(form.video_url)} title="Preview" className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}

export default AdminSections;
