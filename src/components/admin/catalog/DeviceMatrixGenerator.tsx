import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, X, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Brand { id: string; name: string; }
interface Model { id: string; brand_id: string; name: string; }
interface Storage { id: string; capacity: string; }
interface Color { id: string; name: string; }

interface MatrixRow {
  key: string;
  brand: string;
  model: string;
  storage: string;
  color: string;
  base_price: number;
  active: boolean;
}

interface DeviceMatrixGeneratorProps {
  onClose: () => void;
}

export function DeviceMatrixGenerator({ onClose }: DeviceMatrixGeneratorProps) {
  const qc = useQueryClient();

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

  // Generate matrix
  const generateMatrix = useCallback(() => {
    const selStorages = storages.filter((s) => selectedStorages.includes(s.id));
    const selColors = colors.filter((c) => selectedColors.includes(c.id));

    if (!brandName || !modelName || selStorages.length === 0 || selColors.length === 0) {
      toast.error("Selecione marca, modelo, pelo menos 1 armazenamento e 1 cor.");
      return;
    }

    const newRows: MatrixRow[] = [];
    for (const st of selStorages) {
      for (const co of selColors) {
        newRows.push({
          key: `${st.id}-${co.id}`,
          brand: brandName,
          model: modelName,
          storage: st.capacity,
          color: co.name,
          base_price: globalPrice ? Number(globalPrice) : 0,
          active: true,
        });
      }
    }
    setRows(newRows);
    setGenerated(true);
  }, [brandName, modelName, storages, colors, selectedStorages, selectedColors, globalPrice]);

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-devices"] });
      toast.success(`${activeRows.length} aparelho(s) criado(s) com sucesso!`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canGenerate = selectedBrand && selectedModel && selectedStorages.length > 0 && selectedColors.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" /> Cadastrar mais de 1
          </h3>
          <p className="text-xs text-muted-foreground">Selecione os parâmetros para gerar todas as combinações automaticamente.</p>
        </div>
      </div>

      {/* Step 1 & 2: Brand + Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>1. Marca</Label>
          <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setSelectedModel(""); setGenerated(false); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma marca..." /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>2. Modelo</Label>
          <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setGenerated(false); }} disabled={!selectedBrand}>
            <SelectTrigger className="mt-1"><SelectValue placeholder={selectedBrand ? "Selecione um modelo..." : "Selecione uma marca primeiro"} /></SelectTrigger>
            <SelectContent>
              {filteredModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Step 3: Storages (chips) */}
      <div>
        <Label>3. Armazenamentos</Label>
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
          {storages.length === 0 && <p className="text-xs text-muted-foreground">Nenhum armazenamento cadastrado. Cadastre na aba Armazenamento.</p>}
        </div>
      </div>

      {/* Step 4: Colors (chips) */}
      <div>
        <Label>4. Cores</Label>
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
          {colors.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma cor cadastrada. Cadastre na aba Cores.</p>}
        </div>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button onClick={generateMatrix} disabled={!canGenerate}>
          <Grid3X3 className="h-4 w-4 mr-2" /> Gerar Matriz
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
              <Input
                type="number"
                min={0}
                step={0.01}
                value={globalPrice}
                onChange={(e) => setGlobalPrice(e.target.value)}
                placeholder="Ex: 1500.00"
                className="mt-1 w-44"
              />
            </div>
            <Button size="sm" variant="outline" onClick={applyGlobalPrice} disabled={!globalPrice}>
              Aplicar a todas
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {activeRows.length} de {rows.length} ativa(s)
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
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={r.base_price}
                        onChange={(e) => updateRowPrice(r.key, Math.max(0, Number(e.target.value)))}
                        className="h-8 text-sm"
                        disabled={!r.active}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={activeRows.length === 0 || saveMutation.isPending}>
              <Check className="h-4 w-4 mr-2" />
              Salvar {activeRows.length} aparelho(s)
            </Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
