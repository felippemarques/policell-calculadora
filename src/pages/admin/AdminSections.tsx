import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, Check, GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SectionForm {
  title: string;
  content: string;
  image_url: string;
  bg_color: string;
  text_color: string;
  is_active: boolean;
}

const emptySectionForm: SectionForm = {
  title: "",
  content: "",
  image_url: "",
  bg_color: "#ffffff",
  text_color: "#000000",
  is_active: true,
};

const AdminSections = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SectionForm>(emptySectionForm);
  const [uploading, setUploading] = useState(false);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-lp-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_sections")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-lp-sections"] });

  const addMutation = useMutation({
    mutationFn: async (form: SectionForm) => {
      const maxOrder = sections?.length ? Math.max(...sections.map((s) => s.display_order)) + 1 : 0;
      const { error } = await supabase.from("lp_sections").insert({
        ...form,
        display_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setForm(emptySectionForm);
      toast.success("Seção criada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: SectionForm }) => {
      const { error } = await supabase.from("lp_sections").update(form).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setForm(emptySectionForm);
      toast.success("Seção atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lp_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Seção removida!");
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase.from("lp_sections").update({ display_order: newOrder }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `sections/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lp-images").upload(path, file);
    if (error) {
      toast.error("Erro ao fazer upload: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("lp-images").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleEdit = (section: any) => {
    setForm({
      title: section.title,
      content: section.content || "",
      image_url: section.image_url || "",
      bg_color: section.bg_color || "#ffffff",
      text_color: section.text_color || "#000000",
      is_active: section.is_active,
    });
    setEditingId(section.id);
    setShowAdd(false);
  };

  const handleMoveUp = (index: number) => {
    if (!sections || index <= 0) return;
    const current = sections[index];
    const prev = sections[index - 1];
    reorderMutation.mutate({ id: current.id, newOrder: prev.display_order });
    reorderMutation.mutate({ id: prev.id, newOrder: current.display_order });
  };

  const handleMoveDown = (index: number) => {
    if (!sections || index >= sections.length - 1) return;
    const current = sections[index];
    const next = sections[index + 1];
    reorderMutation.mutate({ id: current.id, newOrder: next.display_order });
    reorderMutation.mutate({ id: next.id, newOrder: current.display_order });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, form });
    } else {
      addMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Seções da Landing Page</h2>
          <p className="text-sm text-muted-foreground">{sections?.length ?? 0} seções cadastradas</p>
        </div>
        <Button
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
            setForm(emptySectionForm);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Seção
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editingId) && (
        <div className="bg-card border border-primary/30 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {editingId ? "Editar Seção" : "Nova Seção"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Benefícios do Trade-in"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Cor de Fundo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={form.bg_color}
                    onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Label>Cor do Texto</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    className="w-10 h-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={form.text_color}
                    onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Texto da seção..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Imagem</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-card text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {form.image_url && (
                <div className="flex items-center gap-2">
                  <img src={form.image_url} alt="" className="h-10 w-10 rounded object-cover border" />
                  <button
                    onClick={() => setForm({ ...form, image_url: "" })}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
            <Label>Seção ativa</Label>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div
              className="mt-1 rounded-lg p-6 border"
              style={{ backgroundColor: form.bg_color, color: form.text_color }}
            >
              <h3 className="text-lg font-bold">{form.title || "Título da Seção"}</h3>
              <p className="mt-2 text-sm opacity-80">{form.content || "Conteúdo da seção..."}</p>
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-3 max-h-32 rounded object-cover" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending}>
              <Check className="mr-2 h-4 w-4" />
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdd(false);
                setEditingId(null);
                setForm(emptySectionForm);
              }}
            >
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-2">
        {sections?.map((section, index) => (
          <div
            key={section.id}
            className={`bg-card border rounded-lg p-4 flex items-center gap-4 transition-opacity ${
              !section.is_active ? "opacity-50" : ""
            }`}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="p-1 rounded hover:bg-accent/50 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === (sections?.length ?? 0) - 1}
                className="p-1 rounded hover:bg-accent/50 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div
              className="w-12 h-12 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: section.bg_color }}
            >
              {section.image_url ? (
                <img src={section.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs" style={{ color: section.text_color }}>Aa</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{section.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{section.content || "Sem conteúdo"}</p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {section.is_active ? (
                <Eye className="h-4 w-4 text-success" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <button
                onClick={() => handleEdit(section)}
                className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm("Tem certeza que deseja remover esta seção?")) {
                    deleteMutation.mutate(section.id);
                  }
                }}
                className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {(!sections || sections.length === 0) && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma seção cadastrada. Clique em "Nova Seção" para começar.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSections;
