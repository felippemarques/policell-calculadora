// src/test/use-wm10-products.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

import { useWm10Products } from "@/hooks/use-wm10-products";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useWm10Products", () => {
  it("retorna lista de produtos WM10", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        data: [
          { cod_produto: 88, nome: "iPhone 14 128GB", preco_venda: 3200, estoque: 5 },
        ],
      },
      error: null,
    });

    const { result } = renderHook(() => useWm10Products({ page: 1, limit: 50 }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].cod_produto).toBe(88);
  });

  it("expõe erro quando a edge function falha", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Unauthorized" },
    });

    const { result } = renderHook(() => useWm10Products({ page: 1, limit: 50 }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });
});
