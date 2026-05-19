import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockFrom } = vi.hoisted(() => {
  const mockIn = vi.fn(() =>
    Promise.resolve({
      data: [
        { key: "wm10_store_url", value: "minhaloja" },
        { key: "wm10_cnpj", value: "12345678000199" },
        { key: "wm10_token", value: "tok123" },
        { key: "wm10_enabled", value: "true" },
      ],
      error: null,
    })
  );
  const mockSelect = vi.fn(() => ({ in: mockIn }));
  const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));
  return { mockFrom };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

import { useWm10Settings } from "@/hooks/use-wm10-settings";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useWm10Settings", () => {
  it("retorna as configurações WM10 mapeadas", async () => {
    const { result } = renderHook(() => useWm10Settings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings?.store_url).toBe("minhaloja");
    expect(result.current.settings?.cnpj).toBe("12345678000199");
    expect(result.current.settings?.token).toBe("tok123");
    expect(result.current.settings?.enabled).toBe(true);
  });
});
