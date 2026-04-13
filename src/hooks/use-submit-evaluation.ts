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
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "POLL-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useSubmitEvaluation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    finalValue: number;
    couponCode: string;
  } | null>(null);

  const submit = async (data: EvaluationData) => {
    setIsSubmitting(true);
    try {
      const couponCode = generateCouponCode();
      const { error } = await supabase.from("evaluations").insert({
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
        coupon_code: couponCode,
        status: "pending",
      });
      if (error) throw error;
      setResult({ finalValue: data.finalValue, couponCode });
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, result, setResult };
}
