import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Search, X, Check, Smartphone, Filter, Percent, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function DevicesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterModel, setFilterModel] = useState("all");
  const [filterStorage, setFilterStorage] = useState("all");
  const [filterColor, setFilterColor] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const emptyDevice = { brand: "Apple", model: "", storage: "", base_price: 0, colors: "" };
  const [form, setForm] = useState<any>(emptyDevice);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [bulkField, setBulkField] = useState("brand");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkPriceMode, setBulkPriceMode] = useState<"absolute" | "percent">("absolute");
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Array<{ id: string; label: string; field: string; from: string; to: string }> | null>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ["admin-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*").order("brand").order("model").order("storage");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-devices"] });

  // Extract unique values for filters
  const uniqueBrands = useMemo(() => [...new Set(devices?.map((d) => d.brand) || [])].sort(), [devices]);
  const uniqueModels = useMemo(() => [...new Set(devices?.map((d) => d.model) || [])].sort(), [devices]);
  const uniqueStorages = useMemo(() => [...new Set(devices?.map((d) => d.storage) || [])].sort(), [devices]);
  const uniqueColors = useMemo(() => {
    const allColors = devices?.flatMap((d) => (d.colors || "").split(",").map((c) => c.trim()).filter(Boolean)) || [];
    return [...new Set(allColors)].sort();
  }, [devices]);

  const filtered = useMemo(() => {
    return devices?.filter((d) => {
      if (search && !`${d.brand} ${d.model} ${d.storage} ${d.colors}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterBrand !== "all" && d.brand !== filterBrand) return false;
      if (filterModel !== "all" && d.model !== filterModel) return false;
      if (filterStorage !== "all" && d.storage !== filterStorage) return false;
      if (filterColor !== "all") {
        const colors = (d.colors || "").split(",").map((c) => c.trim());
        if (!colors.includes(filterColor)) return false;
      }
      if (priceMin && Number(d.base_price) < Number(priceMin)) return false;
      if (priceMax && Number(d.base_price) > Number(priceMax)) return false;
      return true;
    });
  }, [devices, search, filterBrand, filterModel, filterStorage, filterColor, priceMin, priceMax]);

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
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("devices").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setSelected(new Set()); toast.success("Removidos!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const computePendingChanges = () => {
    const ids = Array.from(selected);
    const selectedDevices = devices?.filter((d) => ids.includes(d.id)) || [];
    const changes: Array<{ id: string; label: string; field: string; from: string; to: string }> = [];

    for (const dev of selectedDevices) {
      const label = `${dev.brand} ${dev.model} ${dev.storage}`;
      if (bulkField === "base_price") {
        const val = Number(bulkPriceValue);
        if (isNaN(val)) continue;
        const oldPrice = Number(dev.base_price);
        const newPrice = bulkPriceMode === "absolute" ? val : Math.round(oldPrice * (1 + val / 100) * 100) / 100;
        changes.push({ id: dev.id, label, field: "Preço", from: `R$ ${oldPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, to: `R$ ${Math.max(0, newPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` });
      } else {
        const fieldLabels: Record<string, string> = { brand: "Marca", model: "Modelo", storage: "Armazenamento", colors: "Cores" };
        const oldVal = (dev as any)[bulkField] || "—";
        changes.push({ id: dev.id, label, field: fieldLabels[bulkField] || bulkField, from: oldVal, to: bulkValue });
      }
    }
    setPendingChanges(changes);
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (bulkField === "base_price") {
        const val = Number(bulkPriceValue);
        if (isNaN(val)) throw new Error("Valor inválido");
        if (bulkPriceMode === "absolute") {
          const { error } = await supabase.from("devices").update({ base_price: val }).in("id", ids);
          if (error) throw error;
        } else {
          const selectedDevices = devices?.filter((d) => ids.includes(d.id)) || [];
          for (const dev of selectedDevices) {
            const newPrice = Math.round(Number(dev.base_price) * (1 + val / 100) * 100) / 100;
            const { error } = await supabase.from("devices").update({ base_price: Math.max(0, newPrice) }).eq("id", dev.id);
            if (error) throw error;
          }
        }
      } else {
        const updateObj: any = {};
        updateObj[bulkField] = bulkValue;
        const { error } = await supabase.from("devices").update(updateObj).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); setSelected(new Set()); setShowBulk(false); setBulkValue(""); setBulkPriceValue(""); setPendingChanges(null); toast.success("Atualizado em massa!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (!filtered) return;
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const startEdit = (device: any) => { setForm({ ...device }); setEditingId(device.id); setShowNew(false); };
  const startNew = () => { setForm(emptyDevice); setShowNew(true); setEditingId(null); };
  const cancel = () => { setEditingId(null); setShowNew(false); setForm(emptyDevice); };

  const clearFilters = () => {
    setSearch(""); setFilterBrand("all"); setFilterModel("all");
    setFilterStorage("all"); setFilterColor("all"); setPriceMin(""); setPriceMax("");
  };

  const hasActiveFilters = filterBrand !== "all" || filterModel !== "all" || filterStorage !== "all" || filterColor !== "all" || priceMin || priceMax;

  return (
    <div className="space-y-4">
      {/* Search + Actions Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar modelo, marca, armazenamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={hasActiveFilters ? "border-primary text-primary" : ""}>
          <Filter className="mr-2 h-4 w-4" /> Filtros {hasActiveFilters && "•"}
        </Button>
        <Button onClick={startNew} disabled={showNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Filtros avançados</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="mr-1 h-3 w-3" /> Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Marca</Label>
              <Select value={filterBrand} onValueChange={setFilterBrand}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueBrands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Modelo</Label>
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Armazenamento</Label>
              <Select value={filterStorage} onValueChange={setFilterStorage}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueStorages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <Select value={filterColor} onValueChange={setFilterColor}>
                <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueColors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Preço mín (R$)</Label>
              <Input type="number" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="mt-1 h-9 text-xs" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Preço máx (R$)</Label>
              <Input type="number" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="mt-1 h-9 text-xs" placeholder="∞" />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => setShowBulk(!showBulk)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar em massa
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => {
            if (confirm(`Remover ${selected.size} aparelho(s)?`)) bulkDeleteMutation.mutate(Array.from(selected));
          }}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remover
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="mr-1 h-3.5 w-3.5" /> Limpar seleção
          </Button>
        </div>
      )}

      {/* Bulk Edit Form */}
      {showBulk && selected.size > 0 && (
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Edição em massa — {selected.size} aparelho(s)</h4>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Campo</Label>
              <Select value={bulkField} onValueChange={(v) => { setBulkField(v); setBulkValue(""); setBulkPriceValue(""); }}>
                <SelectTrigger className="mt-1 w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Marca</SelectItem>
                  <SelectItem value="model">Modelo</SelectItem>
                  <SelectItem value="storage">Armazenamento</SelectItem>
                  <SelectItem value="colors">Cores</SelectItem>
                  <SelectItem value="base_price">Preço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkField === "base_price" ? (
              <>
                <div>
                  <Label className="text-xs">Modo</Label>
                  <div className="flex mt-1 rounded-md border overflow-hidden">
                    <button
                      className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${bulkPriceMode === "absolute" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setBulkPriceMode("absolute")}
                    >
                      <DollarSign className="h-3 w-3" /> Valor
                    </button>
                    <button
                      className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${bulkPriceMode === "percent" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setBulkPriceMode("percent")}
                    >
                      <Percent className="h-3 w-3" /> Percentual
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">
                    {bulkPriceMode === "absolute" ? "Novo preço (R$)" : "Ajuste (%) — negativo diminui"}
                  </Label>
                  <Input
                    type="number"
                    step={bulkPriceMode === "absolute" ? "0.01" : "1"}
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                    placeholder={bulkPriceMode === "absolute" ? "1500.00" : "+10 ou -15"}
                    className="mt-1 w-40 h-9 text-xs"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-xs">Novo valor</Label>
                <Input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="mt-1 w-56 h-9 text-xs" placeholder={
                  bulkField === "brand" ? "Apple" : bulkField === "model" ? "iPhone 15" : bulkField === "storage" ? "256GB" : "Preto, Branco"
                } />
              </div>
            )}

            <Button size="sm" onClick={computePendingChanges} disabled={bulkField === "base_price" ? !bulkPriceValue : !bulkValue}>
              <Check className="mr-1 h-3.5 w-3.5" /> Pré-visualizar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowBulk(false); setPendingChanges(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Confirmation Preview */}
      {pendingChanges && pendingChanges.length > 0 && (
        <div className="bg-accent/30 border-2 border-primary/30 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Aprovar alterações? — {pendingChanges.length} aparelho(s)</h4>
          <div className="max-h-60 overflow-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Aparelho</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Campo</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">De</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Para</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingChanges.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium">{c.label}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{c.field}</td>
                    <td className="px-3 py-1.5 text-destructive/80 line-through">{c.from}</td>
                    <td className="px-3 py-1.5 text-primary font-medium">{c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => bulkUpdateMutation.mutate()} disabled={bulkUpdateMutation.isPending}>
              <Check className="mr-1 h-3.5 w-3.5" /> Sim, aplicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingChanges(null)}>
              <X className="mr-1 h-3.5 w-3.5" /> Não, cancelar
            </Button>
          </div>
        </div>
      )}

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
                <th className="px-3 py-3 w-10">
                  <Checkbox checked={filtered?.length ? selected.size === filtered.length : false} onCheckedChange={selectAll} />
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
              {filtered?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum aparelho encontrado.</td></tr>
              )}
              {filtered?.map((d) => (
                <tr key={d.id} className={`hover:bg-muted/30 transition-colors ${selected.has(d.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-3">
                    <Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} />
                  </td>
                  <td className="px-4 py-3 font-medium">{d.brand}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span>{d.model}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="bg-muted px-2 py-0.5 rounded text-xs">{d.storage}</span></td>
                  <td className="px-4 py-3">R$ {Number(d.base_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{d.colors || "—"}</td>
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
          {filtered && (
            <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground border-t">
              {filtered.length} aparelho(s) {hasActiveFilters ? "filtrado(s)" : "no total"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
