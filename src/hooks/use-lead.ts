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
   */
  const upsertLeadByEmail = useCallback(
    async (input: LeadInput): Promise<string | null> => {
      const existing = await findLeadByEmail(input.customer_email);
      if (existing) {
        try {
          const { error } = await (supabase.from("leads") as any)
            .update({
              customer_name: input.customer_name || undefined,
              customer_phone: input.customer_phone || undefined,
              status: "in_progress",
            })
            .eq("id", existing);
          if (error) throw error;
        } catch (err) {
          console.error("Failed to refresh existing lead:", err);
        }
        setLeadId(existing);
        return existing;
      }
      return createLead(input);
    },
    [findLeadByEmail, createLead],
  );

  const updateLead = useCallback(
    async (id: string, patch: Record<string, any>) => {
      try {
        const { error } = await (supabase.from("leads") as any).update(patch).eq("id", id);
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

  return {
    leadId,
    setLeadId,
    createLead,
    upsertLeadByEmail,
    findLeadByEmail,
    updateLead,
    updateAssessment,
    markRejected,
    creating,
  };
}
