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
  calc_hero_bg_image:
    "Imagem principal do banner. Recomendado: 1920×1080, JPG/PNG até 2MB.",
  calc_hero_bg_image_2:
    "Slide extra opcional. Quando preenchido, alterna automaticamente com a imagem principal.",
  calc_hero_bg_image_3:
    "Segundo slide extra opcional para o banner da calculadora.",
  calc_hero_logo_url:
    "Logo exibida acima do nome da loja. Se vazio, usa o ícone padrão da calculadora.",
  calc_hero_bg_color:
    "Cor de fundo (hex, ex.: #0F172A) usada quando não houver imagem ou em áreas transparentes. Deixe em branco para usar o padrão do site.",
  calc_hero_text_color:
    "Cor do título e subtítulo (hex). Use branco/cor clara se a imagem de fundo for escura.",
  flow_trade_icon_url:
    "Ícone do card 'Trocar'. PNG transparente recomendado, 256×256, até 1MB. Se vazio, usa o ícone padrão.",
  flow_sale_icon_url:
    "Ícone do card 'Vender'. PNG transparente recomendado, 256×256, até 1MB. Se vazio, usa o ícone padrão.",
  flow_trade_card_bg:
    "Cor de fundo do card 'Trocar' (hex). Deixe em branco para usar o tema padrão.",
  flow_sale_card_bg:
    "Cor de fundo do card 'Vender' (hex). Deixe em branco para usar o tema padrão.",
  flow_trade_cta_bg:
    "Cor do botão 'Quero trocar'. Deixe em branco para usar o destaque padrão.",
  flow_trade_cta_text_color:
    "Cor do texto do botão 'Quero trocar'. Deixe em branco para usar o contraste padrão.",
  flow_sale_cta_bg:
    "Cor do botão 'Quero vender'. Deixe em branco para usar o padrão ofuscado.",
  flow_sale_cta_text_color:
    "Cor do texto do botão 'Quero vender'. Deixe em branco para usar o contraste padrão.",
};

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

  function ImageField({
    keyName,
    label,
  }: {
    keyName: CalcHeroKey;
    label: string;
  }) {
    return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{FIELD_HELP[keyName]}</p>
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
          {form[keyName] ? (
            <img
              src={form[keyName]}
              alt={label}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            placeholder="https://… ou faça upload"
            value={form[keyName]}
            onChange={(e) => set(keyName, e.target.value)}
          />
          <div className="flex gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(keyName, f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                disabled={uploadingKey === keyName}
              >
                <span className="cursor-pointer">
                  {uploadingKey === keyName ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Enviar imagem
                </span>
              </Button>
            </label>
            {form[keyName] && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => set(keyName, "")}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  }

  function ColorField({
    keyName,
    label,
  }: {
    keyName: CalcHeroKey;
    label: string;
  }) {
    return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{FIELD_HELP[keyName]}</p>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          className="h-10 w-14 p-1"
          value={form[keyName] || "#ffffff"}
          onChange={(e) => set(keyName, e.target.value)}
        />
        <Input
          placeholder="#0F172A ou vazio"
          value={form[keyName]}
          onChange={(e) => set(keyName, e.target.value)}
        />
      </div>
    </div>
    );
  }

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

        <ImageField keyName="calc_hero_logo_url" label="Logo da loja" />

        <div className="space-y-2">
          <Label>Nome da loja</Label>
          <Input
            value={form.calc_hero_title}
            onChange={(e) => set("calc_hero_title", e.target.value)}
            placeholder="Ex.: Pollicell"
          />
        </div>

        <div className="space-y-2">
          <Label>Slogan / frase de conversão</Label>
          <Textarea
            rows={2}
            value={form.calc_hero_subtitle}
            onChange={(e) => set("calc_hero_subtitle", e.target.value)}
            placeholder="Ex.: Garantia de entrega e qualidade."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Alinhamento do texto</Label>
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

        <div className="space-y-2">
          <Label>Encaixe da imagem no celular</Label>
          <Select value={form.calc_hero_bg_fit || "cover"} onValueChange={(v) => set("calc_hero_bg_fit", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Preencher banner</SelectItem>
              <SelectItem value="contain">Mostrar imagem inteira</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ImageField keyName="calc_hero_bg_image" label="Imagem de fundo 1" />
        <ImageField keyName="calc_hero_bg_image_2" label="Imagem de fundo 2 (opcional)" />
        <ImageField keyName="calc_hero_bg_image_3" label="Imagem de fundo 3 (opcional)" />

        <div className="grid md:grid-cols-2 gap-4">
          <ColorField keyName="calc_hero_bg_color" label="Cor de fundo (fallback)" />
          <ColorField keyName="calc_hero_text_color" label="Cor do título/subtítulo" />
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" /> Card "Trocar por outro aparelho"
        </h2>
        <ImageField keyName="flow_trade_icon_url" label="Ícone do card" />
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField keyName="flow_trade_card_bg" label="Cor de fundo do card" />
          <ColorField keyName="flow_trade_cta_bg" label="Cor do botão" />
          <ColorField keyName="flow_trade_cta_text_color" label="Cor do texto" />
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Card "Vender por dinheiro"
        </h2>
        <ImageField keyName="flow_sale_icon_url" label="Ícone do card" />
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField keyName="flow_sale_card_bg" label="Cor de fundo do card" />
          <ColorField keyName="flow_sale_cta_bg" label="Cor do botão" />
          <ColorField keyName="flow_sale_cta_text_color" label="Cor do texto" />
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
