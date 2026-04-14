import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, X, Check, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Devices Tab ────────────────────────────────────────────────

function DevicesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const emptyDevice = { brand: "Apple", model: "", storage: "", base_price: 0, colors: "" };
  const [form, setForm] = useState<any>(emptyDevice);

  const { data: devices, isLoading } = useQuery({
    queryKey: ["admin-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*").order("model").order("storage");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-devices"] });

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
    onSuccess: () => { invalidate(); setEditingId(null); setShowNew(false); setForm(emptyDevice); toast.success("Salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = devices?.filter((d: any) =>
    `${d.brand} ${d.model} ${d.storage}`.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (device: any) => { setForm({ ...device }); setEditingId(device.id); setShowNew(false); };
  const startNew = () => { setForm(emptyDevice); setShowNew(true); setEditingId(null); };
  const cancel = () => { setEditingId(null); setShowNew(false); setForm(emptyDevice); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por modelo, marca ou armazenamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={startNew} disabled={showNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Aparelho
        </Button>
      </div>

      {/* New / Edit Form */}
      {(showNew || editingId) && (
        <div className="bg-card border rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">{showNew ? "Novo Aparelho" : "Editar Aparelho"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="iPhone 15 Pro" className="mt-1" />
            </div>
            <div>
              <Label>Armazenamento</Label>
              <Input value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="128GB" className="mt-1" />
            </div>
            <div>
              <Label>Preço Base (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Cores (separadas por vírgula)</Label>
              <Input value={form.colors || ""} onChange={(e) => setForm({ ...form, colors: e.target.value })} placeholder="Preto, Branco, Azul" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.model || !form.storage}>
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
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Armazenamento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Preço Base</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cores</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum aparelho encontrado.</td></tr>
              )}
              {filtered?.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span>{d.brand} {d.model}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{d.storage}</td>
                  <td className="px-4 py-3">R$ {Number(d.base_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.colors || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                        if (confirm("Remover este aparelho?")) deleteMutation.mutate(d.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Damage Categories & Deductions Tab ─────────────────────────

function DefectsTab() {
  const queryClient = useQueryClient();
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [catForm, setCatForm] = useState({ name: "" });

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ["admin-damage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: deductions } = useQuery({
    queryKey: ["admin-damage-deductions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("damage_deductions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const invalidateCats = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-damage-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-damage-deductions"] });
  };

  const saveCatMutation = useMutation({
    mutationFn: async ({ id, name }: { id?: string; name: string }) => {
      if (id) {
        const { error } = await supabase.from("damage_categories").update({ name }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_categories").insert({ name });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateCats(); setEditingCatId(null); setShowNewCat(false); setNewCatName(""); toast.success("Salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: delDed } = await supabase.from("damage_deductions").delete().eq("damage_category_id", id);
      if (delDed) throw delDed;
      const { error } = await supabase.from("damage_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateCats(); toast.success("Removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const saveDeductionMutation = useMutation({
    mutationFn: async ({ catId, value }: { catId: string; value: number }) => {
      const existing = deductions?.find((d: any) => d.damage_category_id === catId);
      if (existing) {
        const { error } = await supabase.from("damage_deductions").update({ deduction_value: value }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("damage_deductions").insert({ damage_category_id: catId, deduction_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateCats(); toast.success("Valor salvo!"); },
    onError: (e) => toast.error(e.message),
  });

  const getDeduction = (catId: string) => deductions?.find((d: any) => d.damage_category_id === catId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Categorias de defeitos e valores de dedução (R$)</p>
        </div>
        <Button onClick={() => setShowNewCat(true)} disabled={showNewCat}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {showNewCat && (
        <div className="bg-card border rounded-lg p-4 flex items-end gap-3">
          <div className="flex-1">
            <Label>Nome da categoria</Label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ex: Display" className="mt-1" />
          </div>
          <Button onClick={() => saveCatMutation.mutate({ name: newCatName })} disabled={!newCatName || saveCatMutation.isPending}>
            <Check className="mr-2 h-4 w-4" /> Criar
          </Button>
          <Button variant="outline" onClick={() => { setShowNewCat(false); setNewCatName(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loadingCats ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-2">
          {categories?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma categoria de defeito cadastrada.</p>
          )}
          {categories?.map((cat: any) => {
            const ded = getDeduction(cat.id);
            const isEditing = editingCatId === cat.id;
            return (
              <div key={cat.id} className="bg-card border rounded-lg p-4 flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input value={catForm.name} onChange={(e) => setCatForm({ name: e.target.value })} className="text-sm" />
                  ) : (
                    <h4 className="font-medium text-foreground">{cat.name}</h4>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Dedução R$</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="w-24 text-sm"
                    defaultValue={ded?.deduction_value || 0}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (ded?.deduction_value !== val) {
                        saveDeductionMutation.mutate({ catId: cat.id, value: val });
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { saveCatMutation.mutate({ id: cat.id, name: catForm.name }); }}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCatId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setCatForm({ name: cat.name }); setEditingCatId(cat.id); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                        if (confirm("Remover esta categoria e suas deduções?")) deleteCatMutation.mutate(cat.id);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

const AdminCatalog = () => (
  <div className="p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Catálogo de Aparelhos</h2>
      <p className="text-sm text-muted-foreground">Gerencie aparelhos, preços e categorias de defeitos</p>
    </div>
    <Tabs defaultValue="devices">
      <TabsList>
        <TabsTrigger value="devices">Aparelhos</TabsTrigger>
        <TabsTrigger value="defects">Defeitos</TabsTrigger>
      </TabsList>
      <TabsContent value="devices" className="mt-4">
        <DevicesTab />
      </TabsContent>
      <TabsContent value="defects" className="mt-4">
        <DefectsTab />
      </TabsContent>
    </Tabs>
  </div>
);

export default AdminCatalog;
