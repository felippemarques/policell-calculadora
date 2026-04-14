import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Pencil, Trash2, Search, X, Check, Smartphone,
  CheckSquare, Square, ChevronDown, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Device = {
  id: string;
  brand: string;
  model: string;
  storage: string;
  base_price: number;
  colors: string | null;
  created_at: string;
};

const emptyDevice = { brand: "Apple", model: "", storage: "", base_price: 0, colors: "" };

export function DevicesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>(emptyDevice);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkField, setBulkField] = useState<string>("brand");
  const [bulkValue, setBulkValue] = useState("");

  const { data: devices, isLoading } = useQuery({
    queryKey: ["admin-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("brand")
        .order("model")
        .order("storage");
      if (error) throw error;
      return data as Device[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-devices"] });

  // Unique brands for filter
  const brands = useMemo(() => {
    if (!devices) return [];
    return [...new Set(devices.map((d) => d.brand))].sort();
  }, [devices]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!devices) return [];
    return devices.filter((d) => {
      const matchSearch = `${d.brand} ${d.model} ${d.storage} ${d.colors || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchBrand = brandFilter === "all" || d.brand === brandFilter;
      return matchSearch && matchBrand;
    });
  }, [devices, search, brandFilter]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (device: any) => {
      if (device.id) {
        const { id, created_at, ...updates } = device;
        const { error } = await supabase.from("devices").update(updates).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("devices").insert(device);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setShowNew(false);
      setForm(emptyDevice);
      toast.success("Salvo!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("devices").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      invalidate();
      setSelected(new Set());
      toast.success(`${ids.length} aparelho(s) removido(s)!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, field, value }: { ids: string[]; field: string; value: string }) => {
      const updateObj: any = {};
      if (field === "base_price") {
        updateObj[field] = Number(value);
      } else {
        updateObj[field] = value;
      }
      const { error } = await supabase.from("devices").update(updateObj).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      invalidate();
      setSelected(new Set());
      setShowBulkEdit(false);
      setBulkValue("");
      toast.success(`${ids.length} aparelho(s) atualizado(s)!`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const startEdit = (device: Device) => {
    setForm({ ...device });
    setEditingId(device.id);
    setShowNew(false);
  };
  const startNew = () => {
    setForm(emptyDevice);
    setShowNew(true);
    setEditingId(null);
  };
  const cancel = () => {
    setEditingId(null);
    setShowNew(false);
    setForm(emptyDevice);
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  const bulkFieldLabels: Record<string, string> = {
    brand: "Marca",
    model: "Modelo",
    storage: "Armazenamento",
    colors: "Cores",
    base_price: "Preço Base (R$)",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo, marca, armazenamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={startNew} disabled={showNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {selected.size} selecionado(s)
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkEdit(!showBulkEdit)}
          >
            <Layers className="mr-2 h-3.5 w-3.5" /> Editar em massa
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              if (confirm(`Remover ${selected.size} aparelho(s)?`))
                deleteMutation.mutate([...selected]);
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            <X className="mr-2 h-3.5 w-3.5" /> Limpar seleção
          </Button>
        </div>
      )}

      {/* Bulk edit form */}
      {showBulkEdit && someSelected && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">
            Edição em massa — {selected.size} aparelho(s)
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Campo</Label>
              <Select value={bulkField} onValueChange={(v) => { setBulkField(v); setBulkValue(""); }}>
                <SelectTrigger className="w-[180px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(bulkFieldLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Novo valor</Label>
              <Input
                type={bulkField === "base_price" ? "number" : "text"}
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder={`Novo valor para ${bulkFieldLabels[bulkField]}`}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() =>
                bulkUpdateMutation.mutate({
                  ids: [...selected],
                  field: bulkField,
                  value: bulkValue,
                })
              }
              disabled={!bulkValue || bulkUpdateMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" /> Aplicar
            </Button>
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* New / Edit Form */}
      {(showNew || editingId) && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {showNew ? "Novo Aparelho" : "Editar Aparelho"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Marca</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="iPhone 15 Pro"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Armazenamento</Label>
              <Input
                value={form.storage}
                onChange={(e) => setForm({ ...form, storage: e.target.value })}
                placeholder="128GB"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Preço Base (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Cores (separadas por vírgula)</Label>
              <Input
                value={form.colors || ""}
                onChange={(e) => setForm({ ...form, colors: e.target.value })}
                placeholder="Preto, Branco, Azul"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.model || !form.storage}
            >
              <Check className="mr-2 h-4 w-4" /> Salvar
            </Button>
            <Button variant="outline" onClick={cancel}>
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marca</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Armazenamento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Preço Base</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cores</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum aparelho encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className={`transition-colors ${
                    selected.has(d.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggleSelect(d.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal">{d.brand}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      {d.model}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="font-normal">{d.storage}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    R$ {Number(d.base_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {d.colors ? (
                      <div className="flex flex-wrap gap-1">
                        {d.colors.split(",").slice(0, 3).map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {c.trim()}
                          </Badge>
                        ))}
                        {d.colors.split(",").length > 3 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            +{d.colors.split(",").length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Remover este aparelho?")) deleteMutation.mutate([d.id]);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-t">
              {filtered.length} aparelho(s) {brandFilter !== "all" ? `da marca ${brandFilter}` : "no total"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
