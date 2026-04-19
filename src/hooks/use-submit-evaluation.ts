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
      // 1. Insert evaluation first (coupon_code will be updated after n8n call)
      const { data: inserted, error } = await supabase
        .from("evaluations")
        .insert({
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone,
          device_id: data.deviceId,
          device_condition: data.deviceCondition,
          damages: data.damages,
          base_price: data.basePrice,
          condition_discount: data.conditionDiscount,
          total_deductions: data.totalDeductions,
          final_value: data.finalValue,
          coupon_code: null,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      const evaluationId = inserted.id;

      // 2. Call n8n to generate coupon in the store
      const settings = await fetchCouponSettings();
      const couponCode = await callN8n(settings, evaluationId, data);

      // 3. Update evaluation with coupon code + id (or keep null if n8n failed)
      if (couponCode) {
        await supabase
          .from("evaluations")
          .update({
            coupon_code: couponCode.coupon_code,
            coupon_id: couponCode.coupon_id,
            status: "completed",
          })
          .eq("id", evaluationId);
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
