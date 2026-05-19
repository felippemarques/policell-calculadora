// Edge Function: get-evaluations
// Returns individual evaluation records with customer and device data.
//
// Auth: either
//   - Header `access_token: <EVALUATIONS_ACCESS_TOKEN>` (for external integrations), OR
//   - Authenticated Supabase JWT belonging to a user with the `admin` role.
//
// Query params:
//   coupon_code  Filter by exact coupon code. Optional.
//   coupon_id    Filter by exact coupon ID. Optional.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, access_token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const ACCESS_TOKEN = Deno.env.get("EVALUATIONS_ACCESS_TOKEN");

  // ── AUTH ──────────────────────────────────────────────────────
  const accessTokenHeader = req.headers.get("access_token");
  let authorized = false;

  if (ACCESS_TOKEN && accessTokenHeader && accessTokenHeader === ACCESS_TOKEN) {
    authorized = true;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (jwt) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: isAdmin } = await userClient.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (isAdmin === true) authorized = true;
      }
    }
  }

  if (!authorized) return json({ error: "Unauthorized" }, 401);

  // ── PARAMS ────────────────────────────────────────────────────
  const url = new URL(req.url);
  const couponCode = url.searchParams.get("coupon_code");
  const couponId = url.searchParams.get("coupon_id");

  if (!couponCode && !couponId) {
    return json({ error: "Informe ao menos um filtro: coupon_code ou coupon_id." }, 400);
  }

  // ── QUERY ─────────────────────────────────────────────────────
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  let q = db
    .from("evaluations")
    .select("id, created_at, status, customer_name, customer_email, customer_phone, device_id, device_condition, final_value, coupon_code, coupon_id, imei");

  if (couponCode) q = q.eq("coupon_code", couponCode);
  if (couponId) q = q.eq("coupon_id", couponId);

  const { data: evals, error } = await q;
  if (error) return json({ error: error.message }, 500);

  if (!evals || evals.length === 0) {
    return json({ data: [] });
  }

  // ── ENRICH WITH DEVICE INFO ───────────────────────────────────
  const deviceIds = [...new Set(evals.map((e: any) => e.device_id).filter(Boolean))];
  const { data: devices } = await db
    .from("devices")
    .select("id, model, brand, wm10_product_id")
    .in("id", deviceIds);

  const deviceById = new Map((devices ?? []).map((d: any) => [d.id, d]));

  const data = evals.map((e: any) => {
    const device = deviceById.get(e.device_id);
    return {
      id: e.id,
      created_at: e.created_at,
      status: e.status,
      customer_name: e.customer_name,
      customer_email: e.customer_email,
      customer_phone: e.customer_phone,
      device: device
        ? {
            id: device.id,
            model: device.model,
            brand: device.brand,
            wm10_product_id: device.wm10_product_id ?? null,
          }
        : null,
      device_condition: e.device_condition,
      final_value: e.final_value,
      coupon_code: e.coupon_code,
      coupon_id: e.coupon_id,
      imei: e.imei,
    };
  });

  return json({ data });
});
