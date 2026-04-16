import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Ban,
  ListChecks,
  GripVertical,
  AlertTriangle,
  Asterisk,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────
interface Criterion {
  id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  display_order: number;
}

interface AssessmentOption {
  id: string;
  criterion_id: string;
  label: string;
  discount_fixed: number;
  discount_percent: number;
  is_rejected: boolean;
  display_order: number;
}

const emptyCriterion = { title: "", description: "", is_required: false };
const emptyOption = { label: "", discount_fixed: 0, discount_percent: 0, is_rejected: false };

export function EvaluationCriteriaTab() {
  const qc = useQueryClient();

  // Criterion form state
  const [showNewCriterion, setShowNewCriterion] = useState(false);
  const [criterionForm, setCriterionForm] = useState(emptyCriterion);
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);

  // Per-criterion option form state
  const [optionFormByCriterion, setOptionFormByCriterion] = useState<
    Record<string, typeof emptyOption & { id?: string }>
  >({});
  const [showOptionFormFor, setShowOptionFormFor] = useState<string | null>(null);

  // ─── Queries ────────────────────────────────────
  const { data: criteria = [], isLoading } = useQuery({
    queryKey: ["admin-assessment-criteria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_criteria" as any)
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data as unknown) as Criterion[];
    },
  });

  const { data: options = [] } = useQuery({
    queryKey: ["admin-assessment-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_options" as any)
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data as unknown) as AssessmentOption[];
    },
  });

  const optionsByCriterion = (cid: string) =>
    options.filter((o) => o.criterion_id === cid);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-assessment-criteria"] });
    qc.invalidateQueries({ queryKey: ["admin-assessment-options"] });
  };

  // ─── Criterion mutations ────────────────────────
  const saveCriterion = useMutation({
    mutationFn: async (
      data: typeof emptyCriterion & { id?: string },
    ) => {
      if (data.id) {
        const { error } = await supabase
          .from("assessment_criteria" as any)
          .update({
            title: data.title,
            description: data.description || null,
            is_required: data.is_required,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder =
          criteria.length > 0
            ? Math.max(...criteria.map((c) => c.display_order)) + 1
            : 0;
        const { error } = await supabase.from("assessment_criteria" as any).insert({
          title: data.title,
          description: data.description || null,
          is_required: data.is_required,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setCriterionForm(emptyCriterion);
      setShowNewCriterion(false);
      setEditingCriterionId(null);
      toast.success("Critério salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCriterion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assessment_criteria" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Critério removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Option mutations ───────────────────────────
  const saveOption = useMutation({
    mutationFn: async ({
      criterionId,
      payload,
    }: {
      criterionId: string;
      payload: typeof emptyOption & { id?: string };
    }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("assessment_options" as any)
          .update({
            label: payload.label,
            discount_fixed: payload.discount_fixed,
            discount_percent: payload.discount_percent,
            is_rejected: payload.is_rejected,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const existing = optionsByCriterion(criterionId);
        const maxOrder =
          existing.length > 0
            ? Math.max(...existing.map((o) => o.display_order)) + 1
            : 0;
        const { error } = await supabase.from("assessment_options" as any).insert({
          criterion_id: criterionId,
          label: payload.label,
          discount_fixed: payload.discount_fixed,
          discount_percent: payload.discount_percent,
          is_rejected: payload.is_rejected,
          display_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      invalidate();
      setOptionFormByCriterion((prev) => ({
        ...prev,
        [vars.criterionId]: { ...emptyOption },
      }));
      setShowOptionFormFor(null);
      toast.success("Opção salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("assessment_options" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Opção removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getOptionForm = (cid: string) =>
    optionFormByCriterion[cid] ?? { ...emptyOption };

  const updateOptionForm = (
    cid: string,
    patch: Partial<typeof emptyOption & { id?: string }>,
  ) => {
    setOptionFormByCriterion((prev) => ({
      ...prev,
      [cid]: { ...getOptionForm(cid), ...patch },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" /> Critérios de Avaliação
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Cada critério é uma pergunta do checklist. Adicione opções de resposta com descontos em R$, % ou marque como motivo de rejeição (bloqueia a compra).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowNewCriterion(true);
            setEditingCriterionId(null);
            setCriterionForm(emptyCriterion);
          }}
          disabled={showNewCriterion}
        >
          <Plus className="h-4 w-4 mr-1" /> Novo critério
        </Button>
      </div>

      {/* New / edit criterion form */}
      {(showNewCriterion || editingCriterionId) && (
        <div className="bg-card border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Título da pergunta</Label>
              <Input
                value={criterionForm.title}
                onChange={(e) =>
                  setCriterionForm({ ...criterionForm, title: e.target.value })
                }
                placeholder="Ex: Estado da Bateria"
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="req"
                  checked={criterionForm.is_required}
                  onCheckedChange={(v) =>
                    setCriterionForm({ ...criterionForm, is_required: v })
                  }
                />
                <Label htmlFor="req" className="text-sm cursor-pointer">
                  Obrigatório
                </Label>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm">Descrição (opcional)</Label>
            <Textarea
              value={criterionForm.description}
              onChange={(e) =>
                setCriterionForm({ ...criterionForm, description: e.target.value })
              }
              placeholder="Texto auxiliar mostrado abaixo do título"
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                saveCriterion.mutate({
                  ...criterionForm,
                  id: editingCriterionId ?? undefined,
                })
              }
              disabled={!criterionForm.title.trim() || saveCriterion.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowNewCriterion(false);
                setEditingCriterionId(null);
                setCriterionForm(emptyCriterion);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Criteria accordion */}
      {criteria.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
          <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum critério cadastrado ainda.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {criteria.map((c) => {
            const opts = optionsByCriterion(c.id);
            const form = getOptionForm(c.id);
            const isFormOpen = showOptionFormFor === c.id;
            const isEditingOption = !!form.id;

            return (
              <AccordionItem
                key={c.id}
                value={c.id}
                className="border rounded-2xl bg-card overflow-hidden data-[state=open]:shadow-sm"
              >
                <div className="flex items-center pr-2">
                  <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{c.title}</span>
                          {c.is_required && (
                            <Badge variant="outline" className="text-[10px] py-0 h-5 border-destructive/40 text-destructive">
                              <Asterisk className="h-2.5 w-2.5 mr-0.5" />
                              Obrigatório
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] py-0 h-5">
                            {opts.length} {opts.length === 1 ? "opção" : "opções"}
                          </Badge>
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <div className="flex items-center gap-1 pl-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCriterionId(c.id);
                        setShowNewCriterion(false);
                        setCriterionForm({
                          title: c.title,
                          description: c.description ?? "",
                          is_required: c.is_required,
                        });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Remover "${c.title}" e suas ${opts.length} opção(ões)?`,
                          )
                        )
                          deleteCriterion.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <AccordionContent className="px-4 pb-4 space-y-3 border-t bg-muted/20">
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Opções de resposta
                    </p>
                    {!isFormOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowOptionFormFor(c.id);
                          updateOptionForm(c.id, { ...emptyOption, id: undefined });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar opção
                      </Button>
                    )}
                  </div>

                  {/* Options list */}
                  {opts.length === 0 && !isFormOpen && (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Sem opções de resposta. Adicione ao menos uma.
                    </p>
                  )}

                  <div className="space-y-2">
                    {opts.map((o) => (
                      <div
                        key={o.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                          o.is_rejected
                            ? "bg-destructive/5 border-destructive/30"
                            : "bg-background border-border"
                        }`}
                      >
                        {o.is_rejected && (
                          <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium flex-1">{o.label}</span>

                        {o.discount_fixed > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            − R$ {o.discount_fixed}
                          </Badge>
                        )}
                        {o.discount_percent > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            − {o.discount_percent}%
                          </Badge>
                        )}
                        {o.is_rejected && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Inviabiliza
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowOptionFormFor(c.id);
                            updateOptionForm(c.id, {
                              id: o.id,
                              label: o.label,
                              discount_fixed: o.discount_fixed,
                              discount_percent: o.discount_percent,
                              is_rejected: o.is_rejected,
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover "${o.label}"?`))
                              deleteOption.mutate(o.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Option form */}
                  {isFormOpen && (
                    <div
                      className={`rounded-xl p-4 space-y-3 border ${
                        form.is_rejected
                          ? "bg-destructive/5 border-destructive/30"
                          : "bg-background border-border"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-3">
                          <Label className="text-xs">Texto da opção</Label>
                          <Input
                            value={form.label}
                            onChange={(e) =>
                              updateOptionForm(c.id, { label: e.target.value })
                            }
                            placeholder='Ex: "86-90%", "Trincada", "Não liga"'
                            className="mt-1 h-9"
                            autoFocus
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Desconto R$</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={form.discount_fixed}
                            onChange={(e) =>
                              updateOptionForm(c.id, {
                                discount_fixed: Number(e.target.value),
                              })
                            }
                            disabled={form.is_rejected}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Desconto %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={form.discount_percent}
                            onChange={(e) =>
                              updateOptionForm(c.id, {
                                discount_percent: Number(e.target.value),
                              })
                            }
                            disabled={form.is_rejected}
                            className="mt-1 h-9"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-card w-full">
                            <Switch
                              id={`rej-${c.id}`}
                              checked={form.is_rejected}
                              onCheckedChange={(v) =>
                                updateOptionForm(c.id, { is_rejected: v })
                              }
                            />
                            <Label
                              htmlFor={`rej-${c.id}`}
                              className="text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Ban className="h-3 w-3 text-destructive" />
                              Inviabiliza compra
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            saveOption.mutate({
                              criterionId: c.id,
                              payload: form,
                            })
                          }
                          disabled={!form.label.trim() || saveOption.isPending}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {isEditingOption ? "Atualizar" : "Adicionar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowOptionFormFor(null);
                            updateOptionForm(c.id, { ...emptyOption, id: undefined });
                          }}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
