import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export function useLead() {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createLead = useCallback(async (input: LeadInput): Promise<string | null> => {
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_lead", {
        _name: input.customer_name,
        _email: input.customer_email,
        _phone: input.customer_phone,
      });
      if (error) throw error;
      const newId = data as unknown as string;
      setLeadId(newId);
      return newId;
    } catch (err) {
      console.error("Failed to create lead:", err);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  /**
   * Find an existing lead by email and return its id, or null if none exists.
   * Used by the social-login auto-fill flow so we don't duplicate leads when
   * the same person comes back through Google/Apple sign-in.
   */
  const findLeadByEmail = useCallback(async (email: string): Promise<string | null> => {
    if (!email) return null;
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("customer_email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    } catch (err) {
      console.error("Failed to lookup lead by email:", err);
      return null;
    }
  }, []);

  /**
   * Either reuse an existing lead matching the email (and patch with new
   * name/phone) or insert a fresh one. Returns the lead id either way.
   * Uses a SECURITY DEFINER RPC so anonymous visitors don't need SELECT
   * access to the leads table.
   */
  const upsertLeadByEmail = useCallback(
    async (input: LeadInput): Promise<string | null> => {
      try {
        const { data, error } = await supabase.rpc("upsert_lead_by_email", {
          _name: input.customer_name,
          _email: input.customer_email,
          _phone: input.customer_phone,
        });
        if (error) throw error;
        const id = data as unknown as string;
        setLeadId(id);
        return id;
      } catch (err) {
        console.error("Failed to upsert lead by email:", err);
        return null;
      }
    },
    [],
  );

  const updateLead = useCallback(
    async (id: string, patch: Record<string, any>) => {
      try {
        const { error } = await supabase.rpc("update_lead_progress", {
          _lead_id: id,
          _device_id: patch.device_id ?? null,
          _assessment_responses: patch.assessment_responses ?? null,
          _status: patch.status ?? null,
          _rejection_reason: patch.rejection_reason ?? null,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Failed to update lead:", err);
      }
    },
    [],
  );

  const updateAssessment = useCallback(
    async (id: string, responses: Record<string, any>) => {
      await updateLead(id, { assessment_responses: responses });
    },
    [updateLead],
  );

  const markRejected = useCallback(
    async (id: string, reason: string) => {
      await updateLead(id, { status: "rejected", rejection_reason: reason });
    },
    [updateLead],
  );

  /**
   * Persist the chosen flow (trade/sale) into the lead's assessment_responses
   * (anonymous public users can't UPDATE leads directly; the RPC bypasses RLS).
   * The flow_type column is also written via the regular evaluation insert.
   */
  const setFlowType = useCallback(
    async (id: string, flowType: "trade" | "sale", currentResponses: Record<string, any> = {}) => {
      await updateLead(id, {
        assessment_responses: { ...currentResponses, flow_type: flowType },
      });
    },
    [updateLead],
  );

  /** Save the IMEI on the lead via SECURITY DEFINER RPC (validates Luhn). */
  const setImei = useCallback(async (id: string, imei: string) => {
    const { error } = await (supabase.rpc as any)("update_lead_imei", {
      _lead_id: id,
      _imei: imei,
    });
    if (error) throw error;
  }, []);

  /** Save CPF on the lead via SECURITY DEFINER RPC. */
  const updateCpf = useCallback(async (id: string, cpf: string) => {
    const { error } = await (supabase.rpc as any)("update_lead_cpf", {
      _lead_id: id,
      _cpf: cpf,
    });
    if (error) throw error;
  }, []);

  return {
    leadId,
    setLeadId,
    createLead,
    upsertLeadByEmail,
    findLeadByEmail,
    updateLead,
    updateAssessment,
    markRejected,
    setFlowType,
    setImei,
    updateCpf,
    creating,
  };
}
