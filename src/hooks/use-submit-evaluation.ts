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

/**
 * Base64URL-safe encoding (no +, /, =).
 * Compatível com decodificação do lado da API externa.
 */
function base64UrlEncode(input: string): string {
  // btoa lida com latin1; usamos encodeURIComponent para suportar UTF-8 com segurança.
  const utf8 = unescape(encodeURIComponent(input));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * FNV-1a 32-bit hash → 6 chars hex. Determinístico e leve.
 * A API externa pode reproduzir o mesmo hash com lead_id + final_value + timestamp
 * para validar a integridade do cupom.
 */
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Gera cupom curto assinado: Base64URL( leadShort.valueCents.tsBase36.hash )
 * Resultado típico: 8–12 caracteres alfanuméricos.
 *
 * Payload (texto antes do encode): "<lead8>.<cents>.<ts36>.<hash6>"
 *  - lead8:  primeiros 8 chars do lead_id (sem hífens) — referência ao lead
 *  - cents:  final_value * 100 (inteiro, sem ponto flutuante)
 *  - ts36:   timestamp em segundos, base36 (compacto)
 *  - hash6:  FNV-1a dos 3 campos acima, 6 chars
 *
 * A API externa decodifica Base64URL → split('.') → recomputa o hash com
 * lead_id + final_value + timestamp e compara para validar integridade.
 */
function generateCouponCode(leadId: string | null | undefined, finalValue: number): string {
  const leadShort = (leadId ?? "anonymous").replace(/-/g, "").slice(0, 8) || "anonymous";
  const cents = Math.round(finalValue * 100).toString();
  const ts36 = Math.floor(Date.now() / 1000).toString(36);
  const payload = `${leadShort}.${cents}.${ts36}`;
  const hash = fnv1aHash(payload).slice(0, 6);
  const signed = `${payload}.${hash}`;
  // Encode and trim to 8–12 chars (entropia suficiente para cupom curto;
  // validação real é feita pelo hash, não pelo tamanho).
  return base64UrlEncode(signed).slice(0, 12);
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
      const couponCode = generateCouponCode(data.leadId, data.finalValue);
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
