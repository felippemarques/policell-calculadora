import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type EntityType = "brand" | "model" | "storage" | "color";
type FormatRule = "lowercase" | "uppercase" | "capitalize";

const META: Record<EntityType, { label: string; field: string; table: string; defaultRule: FormatRule }> = {
  brand: { label: "Marca", field: "name", table: "brands", defaultRule: "capitalize" },
  model: { label: "Modelo", field: "name", table: "device_models", defaultRule: "capitalize" },
  storage: { label: "Armazenamento", field: "capacity", table: "storages", defaultRule: "uppercase" },
  color: { label: "Cor", field: "name", table: "colors", defaultRule: "capitalize" },
};

function applyFormatRule(value: string, rule: FormatRule): string {
  const trimmed = value.trim();
  if (rule === "lowercase") return trimmed.toLowerCase();
  if (rule === "uppercase") return trimmed.toUpperCase();
  // capitalize: each word
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface Props {
  type: EntityType;
  /** Required when type === "model" */
  brandId?: string;
  /** Called with the new id after creation */
  onCreated: (id: string) => void;
  invalidateKeys: string[][]; // queryKeys to refresh
}

export function QuickCreateDialog({ type, brandId, onCreated, invalidateKeys }: Props) {
  const qc = useQueryClient();
  const meta = META[type];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rule, setRule] = useState<FormatRule>(meta.defaultRule);

  const createMutation = useMutation({
    mutationFn: async () => {
      const formatted = applyFormatRule(name, rule);
      if (!formatted) throw new Error("Nome obrigatório");

      if (type === "model" && !brandId) throw new Error("Selecione uma marca primeiro.");

      const payload: Record<string, any> = {
        [meta.field]: formatted,
        format_rule: rule,
      };
      if (type === "model") payload.brand_id = brandId;

      const { data, error } = await (supabase.from(meta.table as any) as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (newId) => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      toast.success(`${meta.label} criada!`);
      onCreated(newId);
      setOpen(false);
      setName("");
      setRule(meta.defaultRule);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disabled = type === "model" && !brandId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          disabled={disabled}
          title={disabled ? "Selecione uma marca primeiro" : `Adicionar ${meta.label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nova {meta.label}</DialogTitle>
          <DialogDescription className="text-xs">
            Cadastro rápido sem sair da tela. O item será selecionado automaticamente após criar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="qc-name" className="text-sm">
              Nome
            </Label>
            <Input
              id="qc-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  e.preventDefault();
                  createMutation.mutate();
                }
              }}
              placeholder={`Ex: ${type === "storage" ? "128GB" : type === "color" ? "Preto" : "iPhone 15"}`}
              className="mt-1"
            />
            {name.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                Será salvo como: <strong className="text-foreground">{applyFormatRule(name, rule)}</strong>
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm">Regra de formatação</Label>
            <Select value={rule} onValueChange={(v) => setRule(v as FormatRule)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capitalize">Capitalizado (Iphone 15)</SelectItem>
                <SelectItem value="uppercase">MAIÚSCULAS (IPHONE 15)</SelectItem>
                <SelectItem value="lowercase">minúsculas (iphone 15)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Criar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
