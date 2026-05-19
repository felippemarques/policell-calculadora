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
  let body: { action: string; page?: unknown; limit?: unknown; cod_produto?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { action, page, limit, cod_produto } = body;
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(200, Math.max(1, Math.floor(Number(limit) || 50)));
  const safeCodProduto = cod_produto != null ? Math.abs(Math.floor(Number(cod_produto))) : undefined;
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
  const AUTH = `CNPJ=${cfg.wm10_cnpj}&TOKEN=${cfg.wm10_token}`;

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

    return json({ data: parsed });
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
