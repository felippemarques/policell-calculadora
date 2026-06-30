// supabase/functions/wm10-proxy/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── AUTH: apenas admins podem chamar este proxy ──────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "Unauthorized" }, 401);

  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

  // ── BODY ─────────────────────────────────────────────────────────
  let body: { action: string; page?: unknown; limit?: unknown; cod_produto?: unknown; search?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { action, page, limit, cod_produto, search } = body;
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 50)));
  const safeCodProduto = cod_produto != null && !isNaN(Number(cod_produto))
    ? Math.abs(Math.floor(Number(cod_produto)))
    : undefined;
  const safeSearch = typeof search === "string" ? search.trim() : "";
  if (!action) return json({ error: "Campo 'action' obrigatório" }, 400);

  // ── CREDENCIAIS DO BANCO ─────────────────────────────────────────
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: settingsRows, error: settingsError } = await db
    .from("lp_settings")
    .select("key, value")
    .in("key", ["wm10_store_url", "wm10_cnpj", "wm10_token", "wm10_enabled"]);

  if (settingsError) return json({ error: "Erro ao buscar configurações WM10" }, 500);

  const cfg: Record<string, string> = Object.fromEntries(
    (settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  if (!cfg.wm10_store_url || !cfg.wm10_cnpj || !cfg.wm10_token) {
    return json({ error: "WM10 não configurado. Preencha URL da loja, CNPJ e Token." }, 422);
  }

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cfg.wm10_store_url)) {
    return json({ error: "Configuração WM10 inválida: URL da loja contém caracteres não permitidos." }, 422);
  }

  if (cfg.wm10_enabled !== 'true') {
    return json({ error: "Integração WM10 desativada." }, 422);
  }

  const BASE = `https://app.wm10.com.br/${cfg.wm10_store_url}/sistema/api`;
  const AUTH = `CNPJ=${encodeURIComponent(cfg.wm10_cnpj)}&TOKEN=${encodeURIComponent(cfg.wm10_token)}`;

  // ── AÇÕES ────────────────────────────────────────────────────────
  if (action === "test") {
    const url = `${BASE}/produto/?${AUTH}&limite=1&pagina=1`;
    let wm10Resp: Response;
    try {
      wm10Resp = await fetch(url, {
        headers: { "Accept": "application/json" },
      });
    } catch (e) {
      return json({ error: `Falha ao conectar na API WM10: ${e}` }, 502);
    }
    const buffer = await wm10Resp.arrayBuffer();
    const text = new TextDecoder("iso-8859-1").decode(buffer);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Resposta WM10 não é JSON válido" }, 502);
    }
    if (Array.isArray(parsed) && (parsed as any[])[0]?.code === 401) {
      return json({ error: "Credenciais WM10 inválidas", detail: parsed }, 401);
    }
    return json({ ok: true });
  }

  if (action === "produtos") {
    let url = `${BASE}/produto/?${AUTH}&limite=${safeLimit}&pagina=${safePage}`;
    if (safeCodProduto != null) url += `&cod_produto=${safeCodProduto}`;
    if (safeSearch) url += `&busca=${encodeURIComponent(safeSearch)}`;

    let wm10Resp: Response;
    try {
      wm10Resp = await fetch(url, {
        headers: { "Accept": "application/json" },
      });
    } catch (e) {
      return json({ error: `Falha ao conectar na API WM10: ${e}` }, 502);
    }

    const buffer = await wm10Resp.arrayBuffer();
    const text = new TextDecoder("iso-8859-1").decode(buffer);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Resposta WM10 não é JSON válido" }, 502);
    }

    if (!Array.isArray(parsed)) {
      return json({ error: "Resposta inesperada da API WM10", detail: parsed }, 502);
    }

    const normalized = (parsed as any[]).map((p: any) => ({
      cod_produto: p.cod_produto ?? p.Cod_produto ?? p.COD_PRODUTO,
      cod_barra: p.cod_barra ?? p.Cod_barra ?? p.COD_BARRA,
      nome: p.nome ?? p.Nome ?? p.NOME,
      preco_compra: p.preco_compra ?? p.Preco_compra ?? p.PRECO_COMPRA,
      preco_venda: p.preco_venda ?? p.Preco_venda ?? p.PRECO_VENDA,
      unidade: p.unidade ?? p.Unidade ?? p.UNIDADE,
      estoque: p.estoque ?? p.Estoque ?? p.ESTOQUE,
    }));

    return json({ data: normalized });
  }

  if (action === "sync-all") {
    const SYNC_LIMIT = 200;
    let syncPage = 1;
    let totalSynced = 0;
    const now = new Date().toISOString();

    while (true) {
      const url = `${BASE}/produto/?${AUTH}&limite=${SYNC_LIMIT}&pagina=${syncPage}`;
      let wm10Resp: Response;
      try {
        wm10Resp = await fetch(url, { headers: { "Accept": "application/json" } });
      } catch (e) {
        return json({ error: `Falha ao conectar na API WM10 (página ${syncPage}): ${e}` }, 502);
      }

      const buffer = await wm10Resp.arrayBuffer();
      const text = new TextDecoder("iso-8859-1").decode(buffer);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return json({ error: "Resposta WM10 não é JSON válido" }, 502);
      }

      if (!Array.isArray(parsed) || parsed.length === 0) break;

      const toInt = (v: unknown): number | null => {
        if (v == null || v === "") return null;
        const n = Math.floor(Number(v));
        return isNaN(n) ? null : n;
      };
      const toNum = (v: unknown): number | null => {
        if (v == null || v === "") return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
      };

      const rows = (parsed as any[])
        .map((p: any) => ({
          cod_produto:  toInt(p.cod_produto  ?? p.Cod_produto  ?? p.COD_PRODUTO),
          cod_barra:    toInt(p.cod_barra    ?? p.Cod_barra    ?? p.COD_BARRA),
          nome:         (p.nome ?? p.Nome ?? p.NOME ?? "").toString().trim(),
          preco_compra: toNum(p.preco_compra ?? p.Preco_compra ?? p.PRECO_COMPRA),
          preco_venda:  toNum(p.preco_venda  ?? p.Preco_venda  ?? p.PRECO_VENDA),
          unidade:      p.unidade ?? p.Unidade ?? p.UNIDADE ?? null,
          estoque:      toInt(p.estoque ?? p.Estoque ?? p.ESTOQUE),
          synced_at:    now,
        }))
        .filter((r: any) => r.cod_produto != null);

      if (rows.length === 0) { syncPage++; continue; }

      const { error: upsertErr } = await db
        .from("wm10_products_cache")
        .upsert(rows, { onConflict: "cod_produto" });
      if (upsertErr) return json({ error: `Erro ao salvar cache: ${upsertErr.message}` }, 500);

      totalSynced += rows.length;
      if (rows.length < SYNC_LIMIT) break;
      syncPage++;
    }

    await db
      .from("lp_settings")
      .upsert({ key: "wm10_last_sync", value: now }, { onConflict: "key" });

    return json({ ok: true, total: totalSynced });
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
