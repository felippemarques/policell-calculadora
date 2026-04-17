import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderArrows } from "./OrderArrows";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type FormatRule = "lowercase" | "uppercase" | "capitalize";

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

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  brand_id: string;
  name: string;
  format_rule: FormatRule;
  display_order: number;
  brands?: Brand;
}

export function ModelsTab() {
  const qc = useQueryClient();
  const qk = ["admin", "device_models"];

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formRule, setFormRule] = useState<FormatRule>("capitalize");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editRule, setEditRule] = useState<FormatRule>("capitalize");

  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_models")
        .select("*, brands(id, name)")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Model[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formatted = applyFormatRule(formName.trim(), formRule);
      const sameBrand = models.filter((m) => m.brand_id === formBrand);
      const maxOrder = sameBrand.length > 0 ? Math.max(...sameBrand.map((m) => m.display_order || 0)) : 0;
      const { error } = await supabase
        .from("device_models")
        .insert({ name: formatted, brand_id: formBrand, format_rule: formRule, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setFormName("");
      setFormBrand("");
      setFormRule("capitalize");
      setShowForm(false);
      toast.success("Modelo criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const formatted = applyFormatRule(editName.trim(), editRule);
      const { error } = await supabase.from("device_models").update({ name: formatted, brand_id: editBrand, format_rule: editRule }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditId(null);
      toast.success("Atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canCreate = formName.trim() && formBrand;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Modelos</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Marca</label>
              <Select value={formBrand} onValueChange={setFormBrand}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do Modelo</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: iPhone 15 Pro"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Regra de Formatação</label>
              <Select value={formRule} onValueChange={(v) => setFormRule(v as FormatRule)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FORMAT_LABELS) as FormatRule[]).map((r) => (
                    <SelectItem key={r} value={r}>{FORMAT_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {formName.trim() && (
            <p className="text-xs text-muted-foreground">
              Preview: <span className="font-medium text-foreground">{applyFormatRule(formName.trim(), formRule)}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!canCreate || createMutation.isPending}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : models.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum modelo encontrado. Cadastre marcas primeiro.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Regra de Formatação</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => {
                const isEditing = editId === m.id;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <OrderArrows
                        table="device_models"
                        rows={models.filter((x) => x.brand_id === m.brand_id)}
                        currentId={m.id}
                        queryKey={qk}
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editBrand} onValueChange={setEditBrand}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{m.brands?.name || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editName.trim()) updateMutation.mutate({ id: m.id });
                            if (e.key === "Escape") setEditId(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{m.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editRule} onValueChange={(v) => setEditRule(v as FormatRule)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(FORMAT_LABELS) as FormatRule[]).map((r) => (
                              <SelectItem key={r} value={r}>{FORMAT_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{FORMAT_LABELS[m.format_rule]}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: m.id })} disabled={!editName.trim()}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditId(m.id); setEditName(m.name); setEditBrand(m.brand_id); setEditRule(m.format_rule); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                            if (confirm(`Remover "${m.name}"?`)) deleteMutation.mutate(m.id);
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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
