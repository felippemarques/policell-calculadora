import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface OnboardingState {
  loading: boolean;
  needsTour: boolean;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
}

export function useAdminOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    needsTour: false,
    currentStep: 1,
    completed: false,
    skipped: false,
  });

  const load = useCallback(async () => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const { data, error } = await supabase
      .from("admin_onboarding")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[onboarding] load error", error);
      setState({
        loading: false,
        needsTour: false,
        currentStep: 1,
        completed: false,
        skipped: false,
      });
      return;
    }

    if (!data) {
      // First time admin → create row and start tour
      const { error: insertErr } = await supabase
        .from("admin_onboarding")
        .insert({ user_id: user.id, current_step: 1 });
      if (insertErr) console.error("[onboarding] insert error", insertErr);
      setState({
        loading: false,
        needsTour: true,
        currentStep: 1,
        completed: false,
        skipped: false,
      });
      return;
    }

    setState({
      loading: false,
      needsTour: !data.completed && !data.skipped,
      currentStep: data.current_step ?? 1,
      completed: data.completed,
      skipped: data.skipped,
    });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setStep = useCallback(
    async (step: number) => {
      if (!user) return;
      setState((s) => ({ ...s, currentStep: step }));
      await supabase
        .from("admin_onboarding")
        .update({ current_step: step })
        .eq("user_id", user.id);
    },
    [user],
  );

  const complete = useCallback(async () => {
    if (!user) return;
    setState((s) => ({ ...s, needsTour: false, completed: true }));
    await supabase
      .from("admin_onboarding")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }, [user]);

  const skip = useCallback(async () => {
    if (!user) return;
    setState((s) => ({ ...s, needsTour: false, skipped: true }));
    await supabase
      .from("admin_onboarding")
      .update({ skipped: true })
      .eq("user_id", user.id);
  }, [user]);

  const restart = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("admin_onboarding")
      .update({
        completed: false,
        skipped: false,
        current_step: 1,
        completed_at: null,
      })
      .eq("user_id", user.id);
    // Notifica todas as instâncias do hook para recarregarem
    window.dispatchEvent(new CustomEvent("admin-onboarding:restart"));
    setState({
      loading: false,
      needsTour: true,
      completed: false,
      skipped: false,
      currentStep: 1,
    });
  }, [user]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("admin-onboarding:restart", handler);
    return () => window.removeEventListener("admin-onboarding:restart", handler);
  }, [load]);

  return { ...state, setStep, complete, skip, restart, reload: load };
}
