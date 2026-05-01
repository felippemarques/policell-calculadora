import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyAppleCasing } from "@/lib/apple-naming";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Diff = {
  table: "device_models" | "brands";
  id: string;
  field: "name";
  before: string;
  after: string;
};

export function AppleCasingBatchButton() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [diffs, setDiffs] = useState<Diff[]>([]);

  const computeDiffs = async () => {
    setLoading(true);
    setDiffs([]);
    try {
      // Brands containing "Apple" plus all models of Apple brand
      const { data: brandsData, error: brandsErr } = await supabase
        .from("brands")
        .select("id, name");
      if (brandsErr) throw brandsErr;

      const brandRows: Diff[] = [];
      const appleBrandIds: string[] = [];
      (brandsData || []).forEach((b: any) => {
        if (b.name?.toLowerCase().trim() === "apple") {
          appleBrandIds.push(b.id);
          const after = applyAppleCasing(b.name);
          if (after !== b.name) {
            brandRows.push({ table: "brands", id: b.id, field: "name", before: b.name, after });
          }
        }
      });

      const modelRows: Diff[] = [];
      if (appleBrandIds.length) {
        const { data: modelsData, error: modelsErr } = await supabase
          .from("device_models")
          .select("id, name, brand_id")
          .in("brand_id", appleBrandIds);
        if (modelsErr) throw modelsErr;
        (modelsData || []).forEach((m: any) => {
          const after = applyAppleCasing(m.name);
          if (after !== m.name) {
            modelRows.push({ table: "device_models", id: m.id, field: "name", before: m.name, after });
          }
        });
      }
      setDiffs([...brandRows, ...modelRows]);
    } catch (e: any) {
      toast.error("Erro ao analisar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!diffs.length) return;
    setApplying(true);
    try {
      for (const d of diffs) {
        const { error } = await supabase
          .from(d.table)
          .update({ [d.field]: d.after } as any)
          .eq("id", d.id);
        if (error) throw error;
      }
      toast.success(`${diffs.length} nome(s) padronizados!`);
      qc.invalidateQueries();
      setOpen(false);
      setDiffs([]);
    } catch (e: any) {
      toast.error("Erro ao aplicar: " + e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) computeDiffs();
        else setDiffs([]);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Padronizar nomes (Apple)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Padrão de escrita Apple
          </DialogTitle>
          <DialogDescription>
            Corrige nomes de marcas e modelos da Apple para o padrão oficial:
            <strong> iPhone, iPad, MacBook, Pro Max, AirPods…</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto rounded-lg border bg-muted/20">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando catálogo…
            </div>
          ) : diffs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Nada a corrigir — todos os nomes Apple já estão no padrão.
            </div>
          ) : (
            <ul className="divide-y text-sm">
              {diffs.map((d) => (
                <li key={`${d.table}-${d.id}`} className="px-3 py-2 flex items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground w-14 shrink-0">
                    {d.table === "brands" ? "Marca" : "Modelo"}
                  </span>
                  <span className="text-muted-foreground line-through">{d.before}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{d.after}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={apply}
            disabled={applying || loading || diffs.length === 0}
          >
            {applying && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Aplicar {diffs.length > 0 ? `(${diffs.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
