import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Check, X, Upload, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderArrows } from "./OrderArrows";
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

interface AuxCrudTabProps {
  table: "brands" | "storages" | "colors";
  label: string;
  fieldName: string; // "name" or "capacity"
  fieldLabel: string;
  defaultFormatRule?: FormatRule;
}

interface Row {
  id: string;
  display_order: number;
  [key: string]: any;
  format_rule: FormatRule;
}

export function AuxCrudTab({ table, label, fieldName, fieldLabel, defaultFormatRule = "capitalize" }: AuxCrudTabProps) {
  const qc = useQueryClient();
  const qk = ["admin", table];

  const [showForm, setShowForm] = useState(false);
  const [formValue, setFormValue] = useState("");
  const [formRule, setFormRule] = useState<FormatRule>(defaultFormatRule);

  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editRule, setEditRule] = useState<FormatRule>(defaultFormatRule);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("display_order", { ascending: true })
        .order(fieldName, { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formatted = applyFormatRule(formValue.trim(), formRule);
      const maxOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.display_order || 0)) : 0;
      const { error } = await supabase
        .from(table)
        .insert({ [fieldName]: formatted, format_rule: formRule, display_order: maxOrder + 1 } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setFormValue("");
      setFormRule(defaultFormatRule);
      setShowForm(false);
      toast.success(`${label} criado!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const formatted = applyFormatRule(editValue.trim(), editRule);
      const { error } = await supabase.from(table).update({ [fieldName]: formatted, format_rule: editRule } as any).eq("id", id);
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
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{label}</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{fieldLabel}</label>
              <Input
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder={`Digite o ${fieldLabel.toLowerCase()}`}
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
          {formValue.trim() && (
            <p className="text-xs text-muted-foreground">
              Preview: <span className="font-medium text-foreground">{applyFormatRule(formValue.trim(), formRule)}</span>
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={!formValue.trim() || createMutation.isPending}>
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
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ordem</TableHead>
                <TableHead>{fieldLabel}</TableHead>
                <TableHead>Regra de Formatação</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isEditing = editId === row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <OrderArrows table={table} rows={rows} currentId={row.id} queryKey={qk} />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editValue.trim()) updateMutation.mutate({ id: row.id });
                            if (e.key === "Escape") setEditId(null);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{row[fieldName]}</span>
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
                        <span className="text-sm text-muted-foreground">{FORMAT_LABELS[row.format_rule]}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: row.id })} disabled={!editValue.trim()}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditId(row.id); setEditValue(row[fieldName]); setEditRule(row.format_rule); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                            if (confirm(`Remover "${row[fieldName]}"?`)) deleteMutation.mutate(row.id);
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
