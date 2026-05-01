import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Upload, Trash2, Info, Image, Palette, Phone, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const RECOMMENDED_WIDTH = 300;
const RECOMMENDED_HEIGHT = 80;

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SectionCard = ({ icon, title, description, children }: SectionCardProps) => (
  <div className="rounded-xl border bg-card p-5 space-y-4">
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const AdminHeader = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoDimensions, setLogoDimensions] = useState<{ w: number; h: number } | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["lp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lp_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setForm(map);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (entries: { key: string; value: string }[]) => {
      // upsert garante que chaves novas sejam criadas e existentes atualizadas
      const { error } = await supabase
        .from("lp_settings")
        .upsert(entries, { onConflict: "key" });
      if (error) throw error;
      return entries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["lp-settings"] });
      toast.success(`Configurações salvas (${count} campos)!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 2MB)");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setLogoDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `header/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("lp-images")
      .upload(path, file, { cacheControl: "3600" });
    if (error) {
      toast.error("Erro no upload: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    const newUrl = urlData.publicUrl;
    setForm((prev) => ({ ...prev, logo_url: newUrl }));

    // Auto-save just the logo so the user doesn't lose it by forgetting "Salvar"
    try {
      const { error: dbErr } = await supabase
        .from("lp_settings")
        .upsert({ key: "logo_url", value: newUrl }, { onConflict: "key" });
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["lp-settings"] });
      toast.success("Logo enviada e publicada!");
    } catch (err: any) {
      toast.error("Logo enviada mas não foi salva: " + (err.message || ""));
    }
    setUploading(false);
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (form.email && !validateEmail(form.email)) newErrors.email = "E-mail inválido";
    ["whatsapp", "instagram", "facebook", "tiktok"].forEach((key) => {
      if (form[key] && !validateUrl(form[key])) newErrors[key] = "URL inválida (deve começar com https://)";
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Corrija os campos destacados antes de salvar");
      return;
    }

    const allKeys = ["logo_url", "header_bg_color", "header_text_color", "phone", "email", "whatsapp", "instagram", "facebook", "tiktok", "header_fixed"];
    const entries = allKeys.map((key) => ({ key, value: form[key] || (key === "header_fixed" ? "false" : "") }));
    saveMutation.mutate(entries);
  };

  const clearError = (key: string) => {
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const getLogoWarnings = () => {
    if (!logoDimensions) return [];
    const { w, h } = logoDimensions;
    const ratio = w / h;
    const warnings: string[] = [];
    if (ratio > 5) warnings.push("Imagem muito larga (proporção > 5:1)");
    if (ratio < 2) warnings.push("Imagem muito quadrada (proporção < 2:1)");
    if (w > 600) warnings.push("Largura muito grande, pode ficar pesada");
    return warnings;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const logoWarnings = getLogoWarnings();

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Header da Landing Page</h2>
        <p className="text-sm text-muted-foreground">Configure logo, contato e redes sociais</p>
      </div>

      {/* Preview */}
      <div>
        <Label className="text-xs text-muted-foreground">Preview do Header</Label>
        <div
          className="mt-1 rounded-lg border overflow-hidden flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: form.header_bg_color || "#ffffff", color: form.header_text_color || "#000000" }}
        >
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain" />
            ) : (
              <span className="text-sm font-bold">LOGO</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs opacity-80">
            {form.phone && <span>📞 {form.phone}</span>}
            {form.email && <span>✉️ {form.email}</span>}
            {form.instagram && <span>📷</span>}
            {form.facebook && <span>👍</span>}
            {form.whatsapp && <span>💬</span>}
          </div>
        </div>
      </div>

      {/* Comportamento */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
        <Switch
          checked={form.header_fixed === "true"}
          onCheckedChange={(checked) => setForm({ ...form, header_fixed: checked ? "true" : "false" })}
        />
        <div>
          <Label>Header Fixo (sticky)</Label>
          <p className="text-xs text-muted-foreground">O header acompanha o scroll da página</p>
        </div>
      </div>

      {/* Logo */}
      <SectionCard icon={<Image className="h-4 w-4" />} title="Logo" description="Envie a logo da sua loja">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background text-sm cursor-pointer hover:bg-accent/50 transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando..." : "Upload Logo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </label>
          {form.logo_url && (
            <div className="flex items-center gap-2">
              <img src={form.logo_url} alt="Logo" className="h-10 max-w-[100px] object-contain rounded border" />
              <button onClick={() => { setForm({ ...form, logo_url: "" }); setLogoDimensions(null); }} className="text-xs text-destructive hover:underline">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Recomendado: {RECOMMENDED_WIDTH}x{RECOMMENDED_HEIGHT}px, PNG transparente
        </p>
        {logoDimensions && (
          <p className="text-xs text-muted-foreground">
            Dimensões detectadas: {logoDimensions.w} x {logoDimensions.h}px
          </p>
        )}
        {logoWarnings.length > 0 && (
          <div className="space-y-0.5">
            {logoWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-500 dark:text-amber-400">⚠ {w}</p>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Cores */}
      <SectionCard icon={<Palette className="h-4 w-4" />} title="Cores" description="Personalize as cores do header">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Cor de Fundo</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.header_bg_color || "#ffffff"}
                onChange={(e) => setForm({ ...form, header_bg_color: e.target.value })}
                className="w-10 h-10 rounded border border-input cursor-pointer"
              />
              <Input
                value={form.header_bg_color || ""}
                onChange={(e) => setForm({ ...form, header_bg_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Cor do Texto</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.header_text_color || "#000000"}
                onChange={(e) => setForm({ ...form, header_text_color: e.target.value })}
                className="w-10 h-10 rounded border border-input cursor-pointer"
              />
              <Input
                value={form.header_text_color || ""}
                onChange={(e) => setForm({ ...form, header_text_color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Contato */}
      <SectionCard icon={<Phone className="h-4 w-4" />} title="Contato" description="Telefone e e-mail exibidos no header">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Telefone</Label>
            <Input
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
              placeholder="(11) 99999-9999"
              className="mt-1"
              maxLength={15}
            />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input
              value={form.email || ""}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError("email"); }}
              placeholder="contato@loja.com"
              className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
          </div>
        </div>
      </SectionCard>

      {/* Redes Sociais */}
      <SectionCard icon={<Share2 className="h-4 w-4" />} title="Redes Sociais" description="Links para suas redes e WhatsApp">
        <div className="space-y-3">
          {[
            { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/5511999999999" },
            { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/loja" },
            { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/loja" },
            { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@loja" },
          ].map((item) => (
            <div key={item.key}>
              <Label className="text-xs">{item.label}</Label>
              <Input
                value={form[item.key] || ""}
                onChange={(e) => { setForm({ ...form, [item.key]: e.target.value }); clearError(item.key); }}
                placeholder={item.placeholder}
                className={`mt-1 ${errors[item.key] ? "border-destructive" : ""}`}
              />
              {errors[item.key] && <p className="text-xs text-destructive mt-0.5">{errors[item.key]}</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
        <Save className="mr-2 h-4 w-4" /> Salvar Configurações
      </Button>
    </div>
  );
};

export default AdminHeader;
