import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const settingsKeys = [
  { key: "logo_url", label: "Logo da Loja", type: "image" },
  { key: "header_bg_color", label: "Cor de Fundo do Header", type: "color" },
  { key: "header_text_color", label: "Cor do Texto do Header", type: "color" },
  { key: "phone", label: "Telefone", type: "text", placeholder: "(11) 99999-9999" },
  { key: "email", label: "E-mail", type: "text", placeholder: "contato@loja.com" },
  { key: "whatsapp", label: "WhatsApp (link)", type: "text", placeholder: "https://wa.me/5511999999999" },
  { key: "instagram", label: "Instagram (link)", type: "text", placeholder: "https://instagram.com/loja" },
  { key: "facebook", label: "Facebook (link)", type: "text", placeholder: "https://facebook.com/loja" },
  { key: "tiktok", label: "TikTok (link)", type: "text", placeholder: "https://tiktok.com/@loja" },
];

const AdminHeader = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

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
      for (const entry of entries) {
        const { error } = await supabase
          .from("lp_settings")
          .update({ value: entry.value })
          .eq("key", entry.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `header/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lp-images").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    setForm({ ...form, logo_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Logo enviada!");
  };

  const handleSave = () => {
    const entries = settingsKeys.map((s) => ({ key: s.key, value: form[s.key] || "" }));
    saveMutation.mutate(entries);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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

      <div className="space-y-4">
        {settingsKeys.map((setting) => {
          if (setting.type === "image") {
            return (
              <div key={setting.key}>
                <Label>{setting.label}</Label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Upload Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                  {form.logo_url && (
                    <div className="flex items-center gap-2">
                      <img src={form.logo_url} alt="Logo" className="h-10 max-w-[100px] object-contain rounded border" />
                      <button onClick={() => setForm({ ...form, logo_url: "" })} className="text-xs text-destructive hover:underline">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (setting.type === "color") {
            return (
              <div key={setting.key}>
                <Label>{setting.label}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form[setting.key] || "#ffffff"}
                    onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={form[setting.key] || ""}
                    onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={setting.key}>
              <Label>{setting.label}</Label>
              <Input
                value={form[setting.key] || ""}
                onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                placeholder={setting.placeholder}
                className="mt-1"
              />
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending}>
        <Save className="mr-2 h-4 w-4" /> Salvar Configurações
      </Button>
    </div>
  );
};

export default AdminHeader;
