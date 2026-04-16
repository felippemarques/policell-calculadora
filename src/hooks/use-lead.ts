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
      const { data, error } = await supabase
        .from("leads")
        .insert({
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone,
          assessment_responses: {},
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error) throw error;
      setLeadId(data.id);
      return data.id;
    } catch (err) {
      console.error("Failed to create lead:", err);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  const updateLead = useCallback(
    async (id: string, patch: Record<string, any>) => {
      try {
        const { error } = await supabase.from("leads").update(patch).eq("id", id);
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

  return { leadId, setLeadId, createLead, updateLead, updateAssessment, markRejected, creating };
}
