import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EvaluationData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deviceId: string;
  deviceCondition: string;
  damages: string[];
  basePrice: number;
  conditionDiscount: number;
  totalDeductions: number;
  finalValue: number;
  leadId?: string | null;
  flowType?: "trade" | "sale";
  imei?: string | null;
}

export class DuplicateImeiError extends Error {
  expiresAt: Date | null;
  flowType: "trade" | "sale" | null;
  constructor(expiresAt: Date | null = null, flowType: "trade" | "sale" | null = null) {
    super("Já existe uma proposta ativa para este IMEI neste tipo de negociação.");
    this.name = "DuplicateImeiError";
    this.expiresAt = expiresAt;
    this.flowType = flowType;
  }
}

async function fetchCouponSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("lp_settings")
    .select("key,value")
    .like("key", "coupon_%");
  if (error) return {};
  const map: Record<string, string> = {};
  (data ?? []).forEach((row: any) => { map[row.key] = row.value; });
  return map;
}

interface N8nCouponResult {
  coupon_code: string;
  coupon_id: string;
}

async function callN8n(
  settings: Record<string, string>,
  evaluationId: string,
  data: EvaluationData,
): Promise<N8nCouponResult | null> {
  const n8nUrl = settings["coupon_n8n_url"];
  if (!n8nUrl) return null;

  const payload = {
    evaluation_id: evaluationId,
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone,
    description: settings["coupon_description"] ?? "",
    type: settings["coupon_type"] ?? "real",
    value: data.finalValue,
    starts_at: Number(settings["coupon_starts_at_days"] ?? "0"),
    ends_at: Number(settings["coupon_ends_at"] ?? "0"),
    value_start: settings["coupon_value_start"] ? Number(settings["coupon_value_start"]) : null,
    value_end: settings["coupon_value_end"] ? Number(settings["coupon_value_end"]) : null,
    usage_sum_limit: settings["coupon_usage_sum_limit"] ? Number(settings["coupon_usage_sum_limit"]) : null,
    usage_counter_limit: Number(settings["coupon_usage_counter_limit"] ?? "1"),
    usage_counter_limit_customer: Number(settings["coupon_usage_counter_limit_customer"] ?? "1"),
    cumulative_discount: settings["coupon_cumulative_discount"] === "1",
    store_url: settings["coupon_store_url"] ?? "",
    store_id: settings["coupon_store_id"] ?? "",
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = settings["coupon_n8n_auth"];
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(n8nUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!res.ok) return null;
    const json = await res.json();
    const coupon_code: string | null = json?.coupon_code ?? json?.code ?? (typeof json === "string" ? json : null);
    const coupon_id: string | null = json?.coupon_id ?? json?.id ?? null;
    if (!coupon_code || !coupon_id) return null;
    return { coupon_code, coupon_id };
  } catch {
    return null;
  }
}

export function useSubmitEvaluation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    finalValue: number;
    couponCode: string | null;
  } | null>(null);

  const submit = async (data: EvaluationData) => {
    setIsSubmitting(true);
    try {
      // 1. Create evaluation via SECURITY DEFINER RPC so the public flow
      // does not depend on INSERT+SELECT permissions under RLS.
      const { data: evaluationId, error } = await (supabase.rpc as any)(
        "create_public_evaluation",
        {
          _customer_name: data.customerName,
          _customer_email: data.customerEmail,
          _customer_phone: data.customerPhone,
          _device_id: data.deviceId,
          _device_condition: data.deviceCondition,
          _damages: data.damages,
          _base_price: data.basePrice,
          _condition_discount: data.conditionDiscount,
          _total_deductions: data.totalDeductions,
          _final_value: data.finalValue,
          _flow_type: data.flowType ?? "trade",
          _imei: data.imei ?? null,
        },
      );
      if (error) {
        if ((error as any).code === "23505") {
          // Enrich with expiration info, if available.
          let expiresAt: Date | null = null;
          let flow: "trade" | "sale" | null = null;
          try {
            const { data: row } = await (supabase.rpc as any)(
              "find_active_imei_proposal",
              {
                _imei: data.imei ?? "",
                _flow_type: data.flowType ?? "trade",
              },
            );
            const r = Array.isArray(row) ? row[0] : row;
            if (r?.expires_at) expiresAt = new Date(r.expires_at);
            if (r?.flow_type === "trade" || r?.flow_type === "sale") flow = r.flow_type;
          } catch {
            /* ignore */
          }
          throw new DuplicateImeiError(expiresAt, flow);
        }
        throw error;
      }

      // 2. Call n8n to generate coupon in the store
      const settings = await fetchCouponSettings();
      const couponCode = await callN8n(settings, evaluationId, data);

      // 3. Attach coupon via SECURITY DEFINER RPC (anon can't UPDATE directly)
      if (couponCode) {
        const { error: attachErr } = await (supabase.rpc as any)(
          "attach_evaluation_coupon",
          {
            _evaluation_id: evaluationId,
            _coupon_code: couponCode.coupon_code,
            _coupon_id: couponCode.coupon_id,
          },
        );
        if (attachErr) console.warn("Falha ao anexar cupom:", attachErr);
      }

      setResult({ finalValue: data.finalValue, couponCode: couponCode?.coupon_code ?? null });
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, result, setResult };
}
