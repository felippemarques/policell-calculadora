import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Check, X, Upload, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { OrderArrows } from "./OrderArrows";
import type { Database } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type FormatRule = "lowercase" | "uppercase" | "capitalize";
type ColorInsert = Database["public"]["Tables"]["colors"]["Insert"];
type ColorUpdate = Database["public"]["Tables"]["colors"]["Update"];

const FORMAT_LABELS: Record<FormatRule, string> = {
  lowercase: "Minúsculo",
  uppercase: "Maiúsculo",
  capitalize: "Primeira Letra Maiúscula",
};

function applyFormatRule(value: string, rule: FormatRule): string {
  switch (rule) {
    case "lowercase":
      return value.toLowerCase();
    case "uppercase":
      return value.toUpperCase();
    case "capitalize":
      return value
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
  }
}

interface ColorRow {
  id: string;
  name: string;
  hex_code: string | null;
  image_url: string | null;
  brand_ids: string[];
  display_order: number;
  format_rule: FormatRule;
}
type Brand = { id: string; name: string };

const DEFAULT_HEX = "#000000";

export function ColorsTab() {
  const qc = useQueryClient();
  const qk = ["admin", "colors"];

  const [showForm, setShowForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: "",
    hex_code: DEFAULT_HEX,
    image_url: "",
    brand_ids: [] as string[],
    format_rule: "capitalize" as FormatRule,
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    hex_code: DEFAULT_HEX,
    image_url: "",
    brand_ids: [] as string[],
    format_rule: "capitalize" as FormatRule,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colors")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as ColorRow[];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands-for-colors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as Brand[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk });
    qc.invalidateQueries({ queryKey: ["all-colors"] });
    qc.invalidateQueries({ queryKey: ["catalog-tree"] });
    qc.invalidateQueries({ queryKey: ["colors-by-brand"] });
    qc.invalidateQueries({ queryKey: ["colors-by-device"] });
    qc.invalidateQueries({ queryKey: ["devices"] });
  };

  const persistColorImage = async (id: string, imageUrl: string | null) => {
    const { error } = await supabase
      .from("colors")
      .update({ image_url: imageUrl } satisfies ColorUpdate)
      .eq("id", id);
    if (error) throw error;
    invalidate();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const formatted = applyFormatRule(form.name.trim(), form.format_rule);
      const maxOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.display_order || 0)) : 0;
      const { error } = await supabase.from("colors").insert({
        name: formatted,
        hex_code: form.hex_code || null,
        image_url: form.image_url || null,
        brand_ids: form.brand_ids,
        format_rule: form.format_rule,
        display_order: maxOrder + 1,
      } satisfies ColorInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setForm({
        name: "",
        hex_code: DEFAULT_HEX,
        image_url: "",
        brand_ids: [],
        format_rule: "capitalize",
      });
      setShowForm(false);
      toast.success("Cor criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const formatted = applyFormatRule(editForm.name.trim(), editForm.format_rule);
      const { error } = await supabase
        .from("colors")
        .update({
          name: formatted,
          hex_code: editForm.hex_code || null,
          image_url: editForm.image_url || null,
          brand_ids: editForm.brand_ids,
          format_rule: editForm.format_rule,
        } satisfies ColorUpdate)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditId(null);
      toast.success("Atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadColorImage = async (file: File, onUrl: (url: string) => void, colorId?: string) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Imagem muito grande (máx 1MB)");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `colors/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("lp-images")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("lp-images").getPublicUrl(path);
      onUrl(pub.publicUrl);
      if (colorId) {
        await persistColorImage(colorId, pub.publicUrl);
        toast.success("Imagem enviada e salva");
      } else {
        toast.success("Imagem enviada");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Cores</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-sm">Nome da Cor</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Preto Titânio"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cor (hex)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.hex_code || DEFAULT_HEX}
                  onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                  className="h-9 w-12 rounded border border-input cursor-pointer bg-transparent"
                />
                <Input
                  value={form.hex_code}
                  onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                  placeholder="#000000"
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <ColorImageField
            imageUrl={form.image_url}
            uploading={uploadingImage}
            onUpload={(file) => uploadColorImage(file, (url) => setForm({ ...form, image_url: url }))}
            onUrlChange={(url) => setForm({ ...form, image_url: url })}
            onRemove={() => setForm({ ...form, image_url: "" })}
          />

          <div>
            <Label className="text-sm">Regra de Formatação</Label>
            <Select
              value={form.format_rule}
              onValueChange={(v) => setForm({ ...form, format_rule: v as FormatRule })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORMAT_LABELS) as FormatRule[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {FORMAT_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <BrandsMultiSelect
            brands={brands}
            selected={form.brand_ids}
            onChange={(ids) => setForm({ ...form, brand_ids: ids })}
          />

          {form.name.trim() && (
            <p className="text-xs text-muted-foreground">
              Preview:{" "}
              <span className="font-medium text-foreground inline-flex items-center gap-2">
                {form.hex_code && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: form.hex_code }}
                  />
                )}
                {applyFormatRule(form.name.trim(), form.format_rule)}
              </span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || createMutation.isPending}
            >
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma cor cadastrada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Marcas</TableHead>
                <TableHead>Formatação</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isEditing = editId === row.id;
                if (isEditing) {
                  return (
                    <TableRow key={row.id}>
                      <TableCell colSpan={5} className="bg-muted/30">
                        <div className="space-y-3 p-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, name: e.target.value })
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Hex</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={editForm.hex_code || DEFAULT_HEX}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, hex_code: e.target.value })
                                  }
                                  className="h-8 w-10 rounded border border-input cursor-pointer bg-transparent"
                                />
                                <Input
                                  value={editForm.hex_code}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, hex_code: e.target.value })
                                  }
                                  placeholder="#000000"
                                  className="h-8 flex-1 font-mono text-xs"
                                />
                              </div>
                            </div>
                          </div>
                          <Select
                            value={editForm.format_rule}
                            onValueChange={(v) =>
                              setEditForm({ ...editForm, format_rule: v as FormatRule })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(FORMAT_LABELS) as FormatRule[]).map((r) => (
                                <SelectItem key={r} value={r}>
                                  {FORMAT_LABELS[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <BrandsMultiSelect
                            brands={brands}
                            selected={editForm.brand_ids}
                            onChange={(ids) =>
                              setEditForm({ ...editForm, brand_ids: ids })
                            }
                          />
                          <ColorImageField
                            imageUrl={editForm.image_url}
                            uploading={uploadingImage}
                            onUpload={(file) =>
                              uploadColorImage(
                                file,
                                (url) => setEditForm((current) => ({ ...current, image_url: url })),
                                row.id,
                              )
                            }
                            onUrlChange={(url) => setEditForm({ ...editForm, image_url: url })}
                            onRemove={async () => {
                              setEditForm({ ...editForm, image_url: "" });
                              try {
                                await persistColorImage(row.id, null);
                                toast.success("Imagem removida");
                              } catch (err: unknown) {
                                toast.error(err instanceof Error ? err.message : "Falha ao remover imagem");
                              }
                            }}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: row.id })}
                              disabled={!editForm.name.trim()}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <OrderArrows table="colors" rows={rows} currentId={row.id} queryKey={qk} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {row.image_url ? (
                          <span className="h-9 w-9 rounded-md border border-border flex-shrink-0 overflow-hidden bg-muted/30">
                            <img src={row.image_url} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                          </span>
                        ) : row.hex_code && (
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-border flex-shrink-0"
                            style={{ backgroundColor: row.hex_code }}
                            title={row.hex_code}
                          />
                        )}
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.brand_ids?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.brand_ids.map((bid) => {
                            const b = brands.find((x) => x.id === bid);
                            return (
                              <Badge key={bid} variant="secondary" className="text-[10px]">
                                {b?.name ?? "?"}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Todas as marcas
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {FORMAT_LABELS[row.format_rule]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditId(row.id);
                            setEditForm({
                              name: row.name,
                              hex_code: row.hex_code || DEFAULT_HEX,
                              image_url: row.image_url || "",
                              brand_ids: row.brand_ids ?? [],
                              format_rule: row.format_rule,
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover "${row.name}"?`))
                              deleteMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function BrandsMultiSelect({
  brands,
  selected,
  onChange,
}: {
  brands: Brand[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  const isGlobal = selected.length === 0;

  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Marcas em que esta cor aparece</Label>
        {isGlobal ? (
          <Badge variant="secondary" className="text-[10px]">
            Todas as marcas (global)
          </Badge>
        ) : (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Limpar (tornar global)
          </button>
        )}
      </div>
      {brands.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma marca cadastrada. Cadastre marcas na aba "Marcas".
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {brands.map((b) => {
            const checked = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {checked && <Check className="h-3 w-3" />}
                {b.name}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Se nenhuma marca for selecionada, a cor aparece para qualquer aparelho.
      </p>
    </div>
  );
}

function ColorImageField({
  imageUrl,
  uploading,
  onUpload,
  onUrlChange,
  onRemove,
}: {
  imageUrl: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <Label className="text-sm">Imagem real da cor (opcional)</Label>
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="Miniatura da cor" className="h-full w-full object-cover" />
          ) : (
            <ImageOff className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={imageUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://… ou envie uma imagem"
            className="text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUpload(file);
                }}
              />
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border hover:bg-accent/40 transition-colors">
                <Upload className="h-3 w-3" /> {uploading ? "Enviando…" : "Enviar imagem"}
              </span>
            </label>
            {imageUrl && (
              <button type="button" onClick={onRemove} className="text-xs text-muted-foreground hover:text-foreground">
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
