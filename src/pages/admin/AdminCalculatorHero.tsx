import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2, ImageOff, ArrowRightLeft, Banknote } from "lucide-react";
import {
  CALC_HERO_KEYS,
  CALC_HERO_DEFAULTS,
  CALC_HERO_QUERY_KEY,
  type CalcHeroKey,
  useCalcHeroSettings,
} from "@/hooks/use-calc-hero-settings";

type Form = Record<CalcHeroKey, string>;

const FIELD_HELP: Partial<Record<CalcHeroKey, string>> = {
  calc_hero_bg_image: "Imagem principal do banner. Recomendado: 1920×1080, JPG/PNG até 2MB.",
  calc_hero_bg_image_2: "Slide extra opcional. Quando preenchido, alterna automaticamente com a imagem principal.",
  calc_hero_bg_image_3: "Segundo slide extra opcional para o banner da calculadora.",
  calc_hero_logo_url: "Logo exibida em destaque acima do nome da loja (renderizada em ~240×240px no desktop e ~288×288px em telas maiores). Recomendado: PNG transparente quadrado de 512×512px ou 1024×1024px, até 1MB. Se vazio, usa o ícone padrão da calculadora.",
  calc_hero_bg_color: "Cor de fundo (hex, ex.: #0F172A) usada quando não houver imagem ou em áreas transparentes. Deixe em branco para usar o padrão do site.",
  calc_hero_text_color: "Cor do título e subtítulo (hex). Use branco/cor clara se a imagem de fundo for escura.",
  flow_trade_icon_url: "Ícone do card 'Trocar'. PNG transparente recomendado, 256×256, até 1MB. Se vazio, usa o ícone padrão.",
  flow_sale_icon_url: "Ícone do card 'Vender'. PNG transparente recomendado, 256×256, até 1MB. Se vazio, usa o ícone padrão.",
  flow_trade_card_bg: "Cor de fundo do card 'Trocar' (hex). Deixe em branco para usar o tema padrão.",
  flow_sale_card_bg: "Cor de fundo do card 'Vender' (hex). Deixe em branco para usar o tema padrão.",
  flow_trade_cta_bg: "Cor do botão 'Quero trocar'. Deixe em branco para usar o destaque padrão.",
  flow_trade_cta_text_color: "Cor do texto do botão 'Quero trocar'. Deixe em branco para usar o contraste padrão.",
  flow_sale_cta_bg: "Cor do botão 'Quero vender'. Deixe em branco para usar o padrão ofuscado.",
  flow_sale_cta_text_color: "Cor do texto do botão 'Quero vender'. Deixe em branco para usar o contraste padrão.",
};

interface ImageFieldProps {
  label: string;
  help?: string;
  value: string;
  uploading: boolean;
  onChange: (v: string) => void;
  onUpload: (f: File) => void;
  previewSize?: "sm" | "lg";
}
function ImageField({ label, help, value, uploading, onChange, onUpload, previewSize = "sm" }: ImageFieldProps) {
  const previewClass = previewSize === "lg" ? "h-40 w-40" : "h-20 w-20";
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="flex items-start gap-3">
        <div className={`${previewClass} rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0`}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            placeholder="https://… ou faça upload"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                <span className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Enviar imagem
                </span>
              </Button>
            </label>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, help, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="flex items-center gap-2">
        <Input
          type="color"
          className="h-10 w-14 p-1"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          placeholder="#0F172A ou vazio"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function AdminCalculatorHero() {
  const { data, isLoading } = useCalcHeroSettings();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>({ ...CALC_HERO_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<CalcHeroKey | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = (key: CalcHeroKey, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleUpload = async (key: CalcHeroKey, file: File, maxMB = 2) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Imagem muito grande (máx ${maxMB}MB)`);
      return;
    }
    setUploadingKey(key);
    const ext = file.name.split(".").pop();
    const path = `calc/${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("lp-images")
      .upload(path, file, { cacheControl: "3600" });
    if (error) {
      toast.error("Erro no upload: " + error.message);
      setUploadingKey(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    set(key, urlData.publicUrl);
    setUploadingKey(null);
    toast.success("Imagem enviada — clique em Salvar para publicar.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of CALC_HERO_KEYS) {
        const value = form[key] ?? "";
        const { data: existing } = await supabase
          .from("lp_settings")
          .select("id")
          .eq("key", key)
          .maybeSingle();
        if (existing) {
          await supabase.from("lp_settings").update({ value }).eq("key", key);
        } else {
          await supabase.from("lp_settings").insert({ key, value });
        }
      }
      qc.invalidateQueries({ queryKey: CALC_HERO_QUERY_KEY });
      toast.success("Personalização da calculadora salva!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const img = (k: CalcHeroKey, label: string, previewSize: "sm" | "lg" = "sm") => (
    <ImageField
      label={label}
      help={FIELD_HELP[k]}
      value={form[k]}
      uploading={uploadingKey === k}
      onChange={(v) => set(k, v)}
      onUpload={(f) => handleUpload(k, f)}
      previewSize={previewSize}
    />
  );

  const col = (k: CalcHeroKey, label: string) => (
    <ColorField
      label={label}
      help={FIELD_HELP[k]}
      value={form[k]}
      onChange={(v) => set(k, v)}
    />
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personalização da Calculadora</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure o banner, textos e cards do início da calculadora (passo "Como você quer negociar?").
        </p>
      </div>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold text-lg">Banner / Topo</h2>

        {img("calc_hero_logo_url", "Logo da loja", "lg")}

        <div className="space-y-2">
          <Label>Nome da loja</Label>
          <Input
            value={form.calc_hero_title}
            onChange={(e) => set("calc_hero_title", e.target.value)}
            placeholder="Ex.: Pollicell"
          />
          <p className="text-xs text-muted-foreground">Renderizado em uma única linha, separado do slogan.</p>
          <div className="pt-1">
            <Label className="text-xs">Alinhamento do nome</Label>
            <Select
              value={form.calc_hero_title_align || "inherit"}
              onValueChange={(v) => set("calc_hero_title_align", v === "inherit" ? "" : v)}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Usar alinhamento geral</SelectItem>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Slogan / frase de conversão</Label>
          <Textarea
            rows={2}
            value={form.calc_hero_subtitle}
            onChange={(e) => set("calc_hero_subtitle", e.target.value)}
            placeholder="Ex.: Garantia de entrega e qualidade."
          />
          <p className="text-xs text-muted-foreground">Aparece em uma linha separada abaixo do nome.</p>
          <div className="pt-1">
            <Label className="text-xs">Alinhamento do slogan</Label>
            <Select
              value={form.calc_hero_subtitle_align || "inherit"}
              onValueChange={(v) => set("calc_hero_subtitle_align", v === "inherit" ? "" : v)}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Usar alinhamento geral</SelectItem>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alinhamento geral (padrão)</Label>
            <Select value={form.calc_hero_align || "center"} onValueChange={(v) => set("calc_hero_align", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tempo entre imagens (ms)</Label>
            <Input
              type="number"
              min={2000}
              step={500}
              value={form.calc_hero_bg_interval}
              onChange={(e) => set("calc_hero_bg_interval", e.target.value)}
              placeholder="5000"
            />
          </div>
        </div>

        {img("calc_hero_bg_image", "Imagem de fundo 1")}
        {img("calc_hero_bg_image_2", "Imagem de fundo 2 (opcional)")}
        {img("calc_hero_bg_image_3", "Imagem de fundo 3 (opcional)")}

        <div className="grid md:grid-cols-2 gap-4">
          {col("calc_hero_bg_color", "Cor de fundo (fallback)")}
          {col("calc_hero_text_color", "Cor do título/subtítulo")}
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" /> Card "Trocar por outro aparelho"
        </h2>
        {img("flow_trade_icon_url", "Ícone do card")}
        <div className="grid md:grid-cols-3 gap-4">
          {col("flow_trade_card_bg", "Cor de fundo do card")}
          {col("flow_trade_cta_bg", "Cor do botão")}
          {col("flow_trade_cta_text_color", "Cor do texto")}
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Card "Vender por dinheiro"
        </h2>
        {img("flow_sale_icon_url", "Ícone do card")}
        <div className="grid md:grid-cols-3 gap-4">
          {col("flow_sale_card_bg", "Cor de fundo do card")}
          {col("flow_sale_cta_bg", "Cor do botão")}
          {col("flow_sale_cta_text_color", "Cor do texto")}
        </div>
        <div className="space-y-2">
          <Label>Ofuscamento do card vender (%)</Label>
          <Input
            type="number"
            min={35}
            max={100}
            value={form.flow_sale_card_opacity}
            onChange={(e) => set("flow_sale_card_opacity", e.target.value)}
            placeholder="70"
          />
        </div>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
