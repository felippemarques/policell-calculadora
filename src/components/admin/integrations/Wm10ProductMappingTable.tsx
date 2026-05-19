// src/components/admin/integrations/Wm10ProductMappingTable.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWm10Products, type Wm10Product } from "@/hooks/use-wm10-products";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 30;
const UNLINKED = "__none__";

interface Device {
  id: string;
  brand: string;
  model: string;
  storage: string;
  wm10_product_id: number | null;
}

function useSystemDevices() {
  return useQuery({
    queryKey: ["devices-for-mapping"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, brand, model, storage, wm10_product_id")
        .order("brand")
        .order("model");
      if (error) throw error;
      return (data ?? []) as Device[];
    },
  });
}

function useLinkDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deviceId, wm10ProductId }: { deviceId: string | null; wm10ProductId: number | null }) => {
      if (!deviceId) {
        const { error } = await supabase
          .from("devices")
          .update({ wm10_product_id: null })
          .eq("wm10_product_id", wm10ProductId);
        if (error) throw error;
        return;
      }
      await supabase
        .from("devices")
        .update({ wm10_product_id: null })
        .eq("wm10_product_id", wm10ProductId);
      const { error } = await supabase
        .from("devices")
        .update({ wm10_product_id: wm10ProductId })
        .eq("id", deviceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices-for-mapping"] }),
  });
}

export function Wm10ProductMappingTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { products, isLoading: loadingProducts, error: productsError } = useWm10Products({
    page,
    limit: PAGE_SIZE,
  });
  const { data: devices, isLoading: loadingDevices } = useSystemDevices();
  const linkMutation = useLinkDevice();

  const linkedMap = new Map<number, string>(
    (devices ?? [])
      .filter((d) => d.wm10_product_id !== null)
      .map((d) => [d.wm10_product_id!, d.id])
  );

  const filtered = search.trim()
    ? products.filter((p) =>
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        String(p.cod_produto).includes(search)
      )
    : products;

  async function handleLink(product: Wm10Product, deviceId: string) {
    try {
      await linkMutation.mutateAsync({
        deviceId: deviceId === UNLINKED ? null : deviceId,
        wm10ProductId: product.cod_produto,
      });
      toast({ title: "Vínculo salvo." });
    } catch (e: unknown) {
      toast({
        title: "Erro ao vincular",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }

  const isLoading = loadingProducts || loadingDevices;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Mapeamento de Produtos WM10
        </CardTitle>
        <CardDescription>
          Vincule cada produto do WM10 ao dispositivo correspondente no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {productsError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            Erro ao carregar produtos WM10: {(productsError as Error).message}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <>
            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Cód WM10</th>
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-right font-medium">Preço Venda</th>
                    <th className="px-3 py-2 text-right font-medium">Estoque</th>
                    <th className="px-3 py-2 text-left font-medium">Vínculo no Sistema</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((product) => {
                    const linkedDeviceId = linkedMap.get(product.cod_produto) ?? UNLINKED;
                    const isLinked = linkedDeviceId !== UNLINKED;
                    return (
                      <tr key={product.cod_produto} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          #{product.cod_produto}
                        </td>
                        <td className="px-3 py-2">{product.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {product.preco_venda != null
                            ? product.preco_venda.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {product.estoque ?? "—"}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <Select
                            value={linkedDeviceId}
                            onValueChange={(v) => handleLink(product, v)}
                            disabled={linkMutation.isPending}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar device…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNLINKED}>
                                <span className="text-muted-foreground">Sem vínculo</span>
                              </SelectItem>
                              {(devices ?? []).map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.brand} {d.model}
                                  {d.storage ? ` ${d.storage}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isLinked ? (
                            <Badge variant="default" className="text-xs bg-green-600">Vinculado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Pendente</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{products.length} produto(s) nesta página</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>Página {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={products.length < PAGE_SIZE}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
