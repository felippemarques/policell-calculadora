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
  let body: { action: string; page?: number; limit?: number; cod_produto?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const { action, page = 1, limit = 50, cod_produto } = body;
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

  const BASE = `https://app.wm10.com.br/${cfg.wm10_store_url}/sistema/api`;
  const AUTH = `CNPJ=${cfg.wm10_cnpj}&TOKEN=${cfg.wm10_token}`;

  // ── AÇÕES ────────────────────────────────────────────────────────
  if (action === "test") {
    const url = `${BASE}/produto/?${AUTH}&limite=1&pagina=1`;
    let wm10Resp: Response;
    try {
      wm10Resp = await fetch(url, {
        headers: { "Content-Type": "application/json; Charset=ISO-8859-1" },
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
    return json({ ok: true, sample: parsed });
  }

  if (action === "produtos") {
    let url = `${BASE}/produto/?${AUTH}&limite=${limit}&pagina=${page}`;
    if (cod_produto) url += `&cod_produto=${cod_produto}`;

    let wm10Resp: Response;
    try {
      wm10Resp = await fetch(url, {
        headers: { "Content-Type": "application/json; Charset=ISO-8859-1" },
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
