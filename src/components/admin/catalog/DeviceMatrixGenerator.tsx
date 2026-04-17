import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, X, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuickCreateDialog } from "./QuickCreateDialog";
import { toast } from "sonner";

interface Brand { id: string; name: string; }
interface Model { id: string; brand_id: string; name: string; }
interface Storage { id: string; capacity: string; }
interface Color { id: string; name: string; }

interface ExistingDevice {
  id: string;
  brand: string;
  model: string;
  storage: string;
  colors: string | null;
  base_price: number;
}

interface MatrixRow {
  key: string;
  existingId?: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  base_price: number;
  active: boolean;
  wasActive: boolean; // tracks original state for upsert logic
}

interface DeviceMatrixGeneratorProps {
  onClose: () => void;
  /** When provided, opens in edit mode for this model */
  editModel?: string;
  editBrand?: string;
  existingDevices?: ExistingDevice[];
}

export function DeviceMatrixGenerator({ onClose, editModel, editBrand, existingDevices }: DeviceMatrixGeneratorProps) {
  const qc = useQueryClient();
  const isEditMode = Boolean(editModel);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedStorages, setSelectedStorages] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [globalPrice, setGlobalPrice] = useState("");
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [generated, setGenerated] = useState(false);

  // Fetch auxiliary data
  const { data: brands = [] } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const { data: allModels = [] } = useQuery({
    queryKey: ["admin", "device_models"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_models").select("*").order("name");
      if (error) throw error;
      return data as Model[];
    },
  });

  const { data: storages = [] } = useQuery({
    queryKey: ["admin", "storages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("storages").select("*").order("capacity");
      if (error) throw error;
      return data as Storage[];
    },
  });

  const { data: colors = [] } = useQuery({
    queryKey: ["admin", "colors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colors").select("*").order("name");
      if (error) throw error;
      return data as Color[];
    },
  });

  const filteredModels = useMemo(
    () => allModels.filter((m) => m.brand_id === selectedBrand),
    [allModels, selectedBrand]
  );

  const brandName = brands.find((b) => b.id === selectedBrand)?.name || "";
  const modelName = allModels.find((m) => m.id === selectedModel)?.name || "";

  // Hydrate edit mode: set brand/model selects and pre-select storages/colors
  useEffect(() => {
    if (!isEditMode || !editBrand || !editModel || brands.length === 0 || allModels.length === 0 || storages.length === 0 || colors.length === 0 || !existingDevices) return;

    // Find brand id
    const brand = brands.find((b) => b.name === editBrand);
    if (brand) setSelectedBrand(brand.id);

    // Find model id
    const model = allModels.find((m) => m.name === editModel && (brand ? m.brand_id === brand.id : true));
    if (model) setSelectedModel(model.id);

    // Collect existing storages/colors
    const existingStorageNames = [...new Set(existingDevices.map((d) => d.storage))];
    const existingColorNames = [...new Set(existingDevices.map((d) => d.colors).filter(Boolean) as string[])];

    const storageIds = storages.filter((s) => existingStorageNames.includes(s.capacity)).map((s) => s.id);
    const colorIds = colors.filter((c) => existingColorNames.includes(c.name)).map((c) => c.id);

    setSelectedStorages(storageIds);
    setSelectedColors(colorIds);
  }, [isEditMode, editBrand, editModel, brands, allModels, storages, colors, existingDevices]);

  // Auto-generate matrix in edit mode once selections are hydrated
  useEffect(() => {
    if (!isEditMode || !selectedBrand || !selectedModel || selectedStorages.length === 0 || selectedColors.length === 0 || generated) return;
    if (!existingDevices || existingDevices.length === 0) return;

    const bName = brands.find((b) => b.id === selectedBrand)?.name || "";
    const mName = allModels.find((m) => m.id === selectedModel)?.name || "";
    if (!bName || !mName) return;

    buildMatrix(bName, mName);
  }, [isEditMode, selectedBrand, selectedModel, selectedStorages, selectedColors, brands, allModels, storages, colors, existingDevices]);

  const buildMatrix = useCallback((bName: string, mName: string) => {
    const selStorages = storages.filter((s) => selectedStorages.includes(s.id));
    const selColors = colors.filter((c) => selectedColors.includes(c.id));

    if (selStorages.length === 0 || selColors.length === 0) return;

    const newRows: MatrixRow[] = [];
    for (const st of selStorages) {
      for (const co of selColors) {
        // Check if this combination already exists
        const existing = existingDevices?.find(
          (d) => d.storage === st.capacity && d.colors === co.name
        );
        newRows.push({
          key: `${st.id}-${co.id}`,
          existingId: existing?.id,
          brand: bName,
          model: mName,
          storage: st.capacity,
          color: co.name,
          base_price: existing ? Number(existing.base_price) : (globalPrice ? Number(globalPrice) : 0),
          active: true,
          wasActive: Boolean(existing),
        });
      }
    }
    setRows(newRows);
    setGenerated(true);
  }, [storages, colors, selectedStorages, selectedColors, existingDevices, globalPrice]);

  // Toggle helpers for multi-select chips
  const toggleStorage = (id: string) => {
    setSelectedStorages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setGenerated(false);
  };

  const toggleColor = (id: string) => {
    setSelectedColors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setGenerated(false);
  };

  // Generate matrix (manual button)
  const generateMatrix = useCallback(() => {
    if (!brandName || !modelName || selectedStorages.length === 0 || selectedColors.length === 0) {
      toast.error("Selecione marca, modelo, pelo menos 1 armazenamento e 1 cor.");
      return;
    }
    buildMatrix(brandName, modelName);
  }, [brandName, modelName, selectedStorages, selectedColors, buildMatrix]);

  // Apply global price
  const applyGlobalPrice = () => {
    const price = Number(globalPrice);
    if (isNaN(price) || price < 0) return;
    setRows((prev) => prev.map((r) => ({ ...r, base_price: price })));
  };

  const updateRowPrice = (key: string, price: number) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, base_price: price } : r)));
  };

  const toggleRowActive = (key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, active: !r.active } : r)));
  };

  const activeRows = rows.filter((r) => r.active);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditMode) {
        // UPSERT logic
        const toInsert = rows.filter((r) => r.active && !r.existingId);
        const toUpdate = rows.filter((r) => r.active && r.existingId);
        const toDelete = rows.filter((r) => !r.active && r.existingId);

        // Insert new
        if (toInsert.length > 0) {
          const inserts = toInsert.map((r) => ({
            brand: r.brand,
            model: r.model,
            storage: r.storage,
            colors: r.color,
            base_price: r.base_price,
          }));
          const { error } = await supabase.from("devices").insert(inserts);
          if (error) throw error;
        }

        // Update existing
        for (const r of toUpdate) {
          const { error } = await supabase
            .from("devices")
            .update({ base_price: r.base_price, colors: r.color, storage: r.storage })
            .eq("id", r.existingId!);
          if (error) throw error;
        }

        // Delete deactivated
        if (toDelete.length > 0) {
          const ids = toDelete.map((r) => r.existingId!);
          const { error } = await supabase.from("devices").delete().in("id", ids);
          if (error) throw error;
        }
      } else {
        // Create mode - simple insert
        if (activeRows.length === 0) throw new Error("Nenhuma linha ativa para salvar.");
        const inserts = activeRows.map((r) => ({
          brand: r.brand,
          model: r.model,
          storage: r.storage,
          colors: r.color,
          base_price: r.base_price,
        }));
        const { error } = await supabase.from("devices").insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-devices"] });
      if (isEditMode) {
        const toInsert = rows.filter((r) => r.active && !r.existingId).length;
        const toUpdate = rows.filter((r) => r.active && r.existingId).length;
        const toDelete = rows.filter((r) => !r.active && r.existingId).length;
        const parts: string[] = [];
        if (toInsert > 0) parts.push(`${toInsert} criado(s)`);
        if (toUpdate > 0) parts.push(`${toUpdate} atualizado(s)`);
        if (toDelete > 0) parts.push(`${toDelete} removido(s)`);
        toast.success(parts.join(", ") || "Salvo!");
      } else {
        toast.success(`${activeRows.length} aparelho(s) criado(s) com sucesso!`);
      }
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canGenerate = selectedBrand && selectedModel && selectedStorages.length > 0 && selectedColors.length > 0;

  const summaryLabel = useMemo(() => {
    if (!isEditMode || !generated) return null;
    const newCount = rows.filter((r) => r.active && !r.existingId).length;
    const updateCount = rows.filter((r) => r.active && r.existingId).length;
    const deleteCount = rows.filter((r) => !r.active && r.existingId).length;
    const parts: string[] = [];
    if (newCount > 0) parts.push(`${newCount} novo(s)`);
    if (updateCount > 0) parts.push(`${updateCount} existente(s)`);
    if (deleteCount > 0) parts.push(`${deleteCount} a remover`);
    return parts.join(" · ");
  }, [isEditMode, generated, rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            {isEditMode ? `Gerenciar variações — ${editBrand} ${editModel}` : "Cadastrar mais de 1"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEditMode
              ? "Edite preços, adicione ou remova variações de armazenamento e cor."
              : "Selecione os parâmetros para gerar todas as combinações automaticamente."}
          </p>
        </div>
      </div>

      {/* Step 1 & 2: Brand + Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>1. Marca</Label>
          <div className="flex items-center gap-2 mt-1">
            <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setSelectedModel(""); setGenerated(false); }} disabled={isEditMode}>
              <SelectTrigger><SelectValue placeholder="Selecione uma marca..." /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEditMode && (
              <QuickCreateDialog
                type="brand"
                invalidateKeys={[["admin", "brands"]]}
                onCreated={(id) => { setSelectedBrand(id); setSelectedModel(""); setGenerated(false); }}
              />
            )}
          </div>
        </div>
        <div>
          <Label>2. Modelo</Label>
          <div className="flex items-center gap-2 mt-1">
            <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setGenerated(false); }} disabled={!selectedBrand || isEditMode}>
              <SelectTrigger><SelectValue placeholder={selectedBrand ? "Selecione um modelo..." : "Selecione uma marca primeiro"} /></SelectTrigger>
              <SelectContent>
                {filteredModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEditMode && (
              <QuickCreateDialog
                type="model"
                brandId={selectedBrand}
                invalidateKeys={[["admin", "device_models"]]}
                onCreated={(id) => { setSelectedModel(id); setGenerated(false); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Storages (chips) */}
      <div>
        <div className="flex items-center justify-between">
          <Label>3. Armazenamentos</Label>
          <QuickCreateDialog
            type="storage"
            invalidateKeys={[["admin", "storages"]]}
            onCreated={(id) => { setSelectedStorages((prev) => [...prev, id]); setGenerated(false); }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {storages.map((s) => {
            const selected = selectedStorages.includes(s.id);
            return (
              <Badge
                key={s.id}
                variant={selected ? "default" : "outline"}
                className={`cursor-pointer transition-all text-sm px-3 py-1.5 ${selected ? "" : "hover:bg-accent"}`}
                onClick={() => toggleStorage(s.id)}
              >
                {s.capacity}
                {selected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
          {storages.length === 0 && <p className="text-xs text-muted-foreground">Nenhum armazenamento cadastrado.</p>}
        </div>
      </div>

      {/* Step 4: Colors (chips) */}
      <div>
        <div className="flex items-center justify-between">
          <Label>4. Cores</Label>
          <QuickCreateDialog
            type="color"
            invalidateKeys={[["admin", "colors"]]}
            onCreated={(id) => { setSelectedColors((prev) => [...prev, id]); setGenerated(false); }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {colors.map((c) => {
            const selected = selectedColors.includes(c.id);
            return (
              <Badge
                key={c.id}
                variant={selected ? "default" : "outline"}
                className={`cursor-pointer transition-all text-sm px-3 py-1.5 ${selected ? "" : "hover:bg-accent"}`}
                onClick={() => toggleColor(c.id)}
              >
                {c.name}
                {selected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
          {colors.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma cor cadastrada.</p>}
        </div>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button onClick={generateMatrix} disabled={!canGenerate}>
          <Grid3X3 className="h-4 w-4 mr-2" /> {isEditMode ? "Atualizar Matriz" : "Gerar Matriz"}
        </Button>
        {canGenerate && (
          <span className="text-xs text-muted-foreground">
            {selectedStorages.length} × {selectedColors.length} = {selectedStorages.length * selectedColors.length} combinações
          </span>
        )}
      </div>

      {/* Matrix DataGrid */}
      {generated && rows.length > 0 && (
        <div className="space-y-3">
          {/* Global price */}
          <div className="bg-card border rounded-lg p-4 flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Preço global (R$)</Label>
              <CurrencyInput
                value={Number(globalPrice) || 0}
                onValueChange={(v) => setGlobalPrice(v ? String(v) : "")}
                className="mt-1 w-44"
              />
            </div>
            <Button size="sm" variant="outline" onClick={applyGlobalPrice} disabled={!globalPrice}>
              Aplicar a todas
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {summaryLabel || `${activeRows.length} de ${rows.length} ativa(s)`}
            </span>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ativo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Armazenamento</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead className="w-40">Preço Base (R$)</TableHead>
                  {isEditMode && <TableHead className="w-20">Status</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key} className={r.active ? "" : "opacity-40"}>
                    <TableCell>
                      <Switch checked={r.active} onCheckedChange={() => toggleRowActive(r.key)} />
                    </TableCell>
                    <TableCell>{r.brand}</TableCell>
                    <TableCell className="font-medium">{r.model}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.storage}</Badge>
                    </TableCell>
                    <TableCell>{r.color}</TableCell>
                    <TableCell>
                      <CurrencyInput
                        value={Number(r.base_price) || 0}
                        onValueChange={(v) => updateRowPrice(r.key, v)}
                        className="h-8 text-sm"
                        disabled={!r.active}
                      />
                    </TableCell>
                    {isEditMode && (
                      <TableCell>
                        {r.existingId ? (
                          <Badge variant="outline" className="text-xs">Existente</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-600">Novo</Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Check className="h-4 w-4 mr-2" />
              {isEditMode ? "Salvar alterações" : `Salvar ${activeRows.length} aparelho(s)`}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
