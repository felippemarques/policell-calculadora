import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, ImageIcon, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CATALOG_TREE_KEY } from "@/hooks/use-catalog-tree";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  modelId: string;
  modelName: string;
  imageUrl: string | null;
  /** Compact thumbnail mode (used inside the catalog tree) */
  compact?: boolean;
}

const BUCKET = "device-images";
const TARGET_SIZE = 1000; // 1000x1000 px ideal
const MAX_BYTES = 1024 * 1024; // 1 MB
const SPEC_TEXT =
  "Tamanho ideal: 1000×1000 px (quadrado 1:1)\nFormato: PNG transparente, WebP ou JPG\nPeso recomendado: até 300 KB (máx. 1 MB)\nDica: aparelho centralizado ocupando ~80% do quadro";

/**
 * Normaliza a imagem para 1000x1000, mantendo proporção (contém em quadrado transparente)
 * e exporta como WebP otimizado para garantir boa qualidade e baixo peso.
 */
async function normalizeImage(file: File): Promise<File> {
  // Se já estiver dentro do ideal e for pequeno, mantém
  const isSmall = file.size <= 300 * 1024;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  // Se já é quadrado próximo do ideal e leve, não toca
  const ratio = img.width / img.height;
  if (isSmall && ratio > 0.95 && ratio < 1.05 && img.width >= 800 && img.width <= 1200) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Fundo transparente
  ctx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  // Contém a imagem dentro do quadrado mantendo proporção
  const scale = Math.min(TARGET_SIZE / img.width, TARGET_SIZE / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (TARGET_SIZE - w) / 2;
  const y = (TARGET_SIZE - h) / 2;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.9),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}

export function ModelImageUploader({ modelId, modelName, imageUrl, compact = false }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useMutation({
    mutationFn: async (rawFile: File) => {
      setUploading(true);

      if (rawFile.size > MAX_BYTES * 5) {
        throw new Error("Arquivo muito grande (máx. 5 MB antes da otimização)");
      }

      const file = await normalizeImage(rawFile);
      const ext = file.name.split(".").pop() || "webp";
      const path = `models/${modelId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("device_models")
        .update({ image_url: pub.publicUrl })
        .eq("id", modelId);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Foto atualizada", description: "Otimizada para 1000×1000 px" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    onSettled: () => setUploading(false),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("device_models")
        .update({ image_url: null })
        .eq("id", modelId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATALOG_TREE_KEY });
      qc.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Foto removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handlePick = () => inputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload.mutate(f);
    e.target.value = "";
  };

  if (compact) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handlePick}
                disabled={uploading}
                className="relative h-8 w-8 overflow-hidden rounded-md border border-border bg-muted/40 hover:ring-2 hover:ring-primary/30 transition flex items-center justify-center"
                aria-label={imageUrl ? "Trocar foto" : "Adicionar foto"}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt={modelName} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
              <strong className="block mb-1">Especificações da foto</strong>
              {SPEC_TEXT}
            </TooltipContent>
          </Tooltip>
          {imageUrl && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => remove.mutate()}
              title="Remover foto"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : imageUrl ? (
          <img src={imageUrl} alt={modelName} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePick} disabled={uploading}>
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {imageUrl ? "Trocar foto" : "Enviar foto"}
          </Button>
          {imageUrl && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => remove.mutate()}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-[11px] leading-tight text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Recomendado: <strong>1000×1000 px</strong> (quadrado), PNG/WebP, até 300 KB.
            Otimizamos automaticamente.
          </span>
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
