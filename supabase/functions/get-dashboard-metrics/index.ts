// Edge Function: get-dashboard-metrics
// REST endpoint that returns Trade-in funnel metrics for the admin dashboard
// AND for any external ERP integration.
//
// Auth: either
//   - Header `x-api-key: <DASHBOARD_API_KEY>` (for external ERP), OR
//   - Authenticated Supabase JWT belonging to a user with the `admin` role (for the frontend).
//
// Query params:
//   from      ISO date (inclusive lower bound on created_at). Optional.
//   to        ISO date (inclusive upper bound on created_at). Optional.
//   brand_id  Filter devices by brand_id (uuid). Optional.
//
// Response shape: see docs/coupon-format.md "Dashboard Metrics API".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  const API_KEY = Deno.env.get("DASHBOARD_API_KEY");

  // ── AUTH ──────────────────────────────────────────────────────
  const apiKeyHeader = req.headers.get("x-api-key");
  let authorized = false;

  if (API_KEY && apiKeyHeader && apiKeyHeader === API_KEY) {
    authorized = true;
  } else {
    // Fall back to JWT + admin role check
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
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const brandId = url.searchParams.get("brand_id");

  // Use service role for read queries (auth already validated above)
  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── DEVICES (for brand filter) ────────────────────────────────
  const { data: devices, error: devErr } = await db
    .from("devices")
    .select("id, model, brand, brand_id");
  if (devErr) return json({ error: devErr.message }, 500);

  const allowedDeviceIds = new Set<string>(
    brandId
      ? devices!.filter((d: any) => d.brand_id === brandId).map((d: any) => d.id)
      : devices!.map((d: any) => d.id),
  );
  const deviceById = new Map<string, any>(devices!.map((d: any) => [d.id, d]));

  // ── LEADS ─────────────────────────────────────────────────────
  let leadsQ = db.from("leads").select("id, status, device_id, created_at");
  if (from) leadsQ = leadsQ.gte("created_at", from);
  if (to) leadsQ = leadsQ.lte("created_at", to);
  const { data: leads, error: leadsErr } = await leadsQ;
  if (leadsErr) return json({ error: leadsErr.message }, 500);

  // Apply brand filter (if any) on the in-memory list — devices.brand_id is the source of truth
  const leadsFiltered = (leads ?? []).filter((l: any) => {
    if (!brandId) return true;
    if (!l.device_id) return false;
    return allowedDeviceIds.has(l.device_id);
  });

  let cLead = 0; // só contato
  let cIncomplete = 0; // device escolhido, sem cupom
  let cRejected = 0;
  let cCompleted = 0;
  for (const l of leadsFiltered) {
    if (l.status === "completed" || l.status === "conversa_iniciada") cCompleted++;
    else if (l.status === "rejected") cRejected++;
    else if (l.status === "in_progress" && l.device_id) cIncomplete++;
    else if (l.status === "in_progress") cLead++;
  }
  const totalLeads = cLead + cIncomplete + cRejected + cCompleted;
  const abandonment_rate =
    totalLeads === 0 ? 0 : Number(((cLead + cIncomplete) / totalLeads).toFixed(4));

  // ── EVALUATIONS (final values + top devices) ──────────────────
  let evalQ = db.from("evaluations").select("id, device_id, final_value, created_at");
  if (from) evalQ = evalQ.gte("created_at", from);
  if (to) evalQ = evalQ.lte("created_at", to);
  const { data: evals, error: evalErr } = await evalQ;
  if (evalErr) return json({ error: evalErr.message }, 500);

  const evalsFiltered = (evals ?? []).filter((e: any) =>
    brandId ? allowedDeviceIds.has(e.device_id) : true,
  );

  const total_value_brl = evalsFiltered.reduce(
    (sum: number, e: any) => sum + Number(e.final_value ?? 0),
    0,
  );

  // Aggregate top 5 devices
  const agg = new Map<string, { count: number; total_value: number }>();
  for (const e of evalsFiltered) {
    const cur = agg.get(e.device_id) ?? { count: 0, total_value: 0 };
    cur.count++;
    cur.total_value += Number(e.final_value ?? 0);
    agg.set(e.device_id, cur);
  }
  const top_devices = Array.from(agg.entries())
    .map(([device_id, v]) => {
      const d = deviceById.get(device_id);
      return {
        device_id,
        model: d?.model ?? "—",
        brand: d?.brand ?? "—",
        count: v.count,
        total_value: Number(v.total_value.toFixed(2)),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return json({
    range: { from: from ?? null, to: to ?? null, brand_id: brandId ?? null },
    totals: {
      leads: cLead,
      incomplete: cIncomplete,
      rejected: cRejected,
      completed: cCompleted,
      total: totalLeads,
      abandonment_rate,
      total_value_brl: Number(total_value_brl.toFixed(2)),
    },
    top_devices,
  });
});
