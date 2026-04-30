import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CATALOG_TREE_KEY } from "@/hooks/use-catalog-tree";

interface Props {
  modelId: string;
  modelName: string;
  imageUrl: string | null;
  /** Compact thumbnail mode (used inside the catalog tree) */
  compact?: boolean;
}

const BUCKET = "device-images";

export function ModelImageUploader({ modelId, modelName, imageUrl, compact = false }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `models/${modelId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600" });
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
      toast({ title: "Foto atualizada" });
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="relative h-8 w-8 overflow-hidden rounded-md border border-border bg-muted/40 hover:ring-2 hover:ring-primary/30 transition flex items-center justify-center"
          title={imageUrl ? "Trocar foto" : "Adicionar foto"}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={modelName} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
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
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted/40 flex items-center justify-center">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : imageUrl ? (
          <img src={imageUrl} alt={modelName} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1">
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
