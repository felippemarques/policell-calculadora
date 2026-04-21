import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  Smartphone,
  MessageCircle,
  Copy,
  Check,
  Archive,
  ArchiveRestore,
  StickyNote,
  Loader2,
  AlertTriangle,
  MapPin,
  Calendar,
  Hash,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { openWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export type ProposalKind = "lead" | "evaluation";

interface Props {
  kind: ProposalKind | null;
  id: string | null;
  customerName: string;
  customerPhone: string;
  deviceLabel: string;
  onClose: () => void;
  onChanged?: () => void;
}

const formatBRL = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

export function ProposalDetailSheet({
  kind,
  id,
  customerName,
  customerPhone,
  deviceLabel,
  onClose,
  onChanged,
}: Props) {
  const open = !!kind && !!id;
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["proposal-detail", kind, id],
    queryFn: async () => {
      if (kind === "lead") {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", id!)
          .maybeSingle();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("evaluations")
          .select("*")
          .eq("id", id!)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
    },
  });

  useEffect(() => {
    if (data) setNotes((data as any).internal_notes ?? "");
  }, [data]);

  const archiveMut = useMutation({
    mutationFn: async (archive: boolean) => {
      const fn = kind === "lead" ? "archive_lead" : "archive_evaluation";
      const arg = kind === "lead" ? { _lead_id: id, _archive: archive } : { _evaluation_id: id, _archive: archive };
      const { error } = await (supabase.rpc as any)(fn, arg);
      if (error) throw error;
    },
    onSuccess: (_d, archive) => {
      toast({ title: archive ? "Arquivada" : "Restaurada" });
      qc.invalidateQueries({ queryKey: ["admin-customer-view-leads"] });
      qc.invalidateQueries({ queryKey: ["admin-customer-view-evaluations"] });
      qc.invalidateQueries({ queryKey: ["proposal-detail"] });
      onChanged?.();
      if (archive) onClose();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const notesMut = useMutation({
    mutationFn: async (text: string) => {
      const fn = kind === "lead" ? "set_lead_notes" : "set_evaluation_notes";
      const arg = kind === "lead" ? { _lead_id: id, _notes: text } : { _evaluation_id: id, _notes: text };
      const { error } = await (supabase.rpc as any)(fn, arg);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Anotação salva" });
      qc.invalidateQueries({ queryKey: ["proposal-detail"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (!open) return null;

  const lead = kind === "lead" ? (data as any) : null;
  const evalRow = kind === "evaluation" ? (data as any) : null;
  const isArchived = !!data?.archived_at;

  const couponCode = evalRow?.coupon_code as string | undefined;
  const finalValue = evalRow?.final_value as number | undefined;

  const buildSummary = () => {
    const lines: string[] = [];
    lines.push(`Olá, ${customerName?.split(" ")[0] || ""}!`);
    lines.push("");
    lines.push(`Sobre sua avaliação do ${deviceLabel}:`);
    if (typeof finalValue === "number") {
      lines.push(`• Valor: ${formatBRL(finalValue)}`);
    }
    if (couponCode) {
      lines.push(`• Cupom: ${couponCode}`);
    }
    if (lead?.imei || evalRow?.imei) {
      lines.push(`• IMEI: ${lead?.imei || evalRow?.imei}`);
    }
    lines.push("");
    lines.push("Posso te ajudar a finalizar?");
    return lines.join("\n");
  };

  const handleWhats = () => openWhatsapp(customerPhone, buildSummary());

  const handleCopy = async (text: string, label = "Copiado") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: label });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const damages: Array<{ name: string; option: string }> = Array.isArray(evalRow?.damages)
    ? evalRow.damages
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {kind === "evaluation" ? "Cupom emitido" : "Proposta"}
            </p>
            <h3 className="text-lg font-bold truncate">{deviceLabel}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">Não encontrado.</p>
          ) : (
            <>
              {isArchived && (
                <div className="flex items-center gap-2 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  Esta proposta está arquivada.
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleWhats} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(buildSummary(), "Resumo copiado")}
                  className="gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copiar resumo
                </Button>
              </div>

              {/* Coupon highlight */}
              {couponCode && (
                <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cupom</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(couponCode, "Cupom copiado")}
                    className="w-full text-left font-mono text-lg font-bold tracking-wider text-primary hover:underline"
                  >
                    {couponCode}
                  </button>
                  {typeof finalValue === "number" && (
                    <p className="text-2xl font-bold text-foreground">{formatBRL(finalValue)}</p>
                  )}
                </div>
              )}

              {/* Meta */}
              <div className="space-y-2 text-sm">
                <Row icon={Calendar} label="Criado em">
                  {format(new Date((data as any).created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </Row>
                <Row icon={Smartphone} label="Aparelho">{deviceLabel}</Row>
                <Row icon={FileText} label="Modalidade">
                  {((data as any).flow_type === "sale") ? "Venda" : "Troca"}
                </Row>
                {(lead?.imei || evalRow?.imei) && (
                  <Row icon={Hash} label="IMEI">
                    <span className="font-mono">{lead?.imei || evalRow?.imei}</span>
                  </Row>
                )}
                {lead?.rejection_reason && (
                  <Row icon={AlertTriangle} label="Motivo de rejeição">
                    {lead.rejection_reason}
                  </Row>
                )}
              </div>

              {/* Evaluation breakdown */}
              {evalRow && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Laudo da avaliação
                    </h4>
                    <div className="rounded-md border border-border divide-y divide-border text-sm">
                      <BreakdownRow label="Preço base" value={formatBRL(evalRow.base_price)} />
                      <BreakdownRow
                        label="Desconto de condição"
                        value={`− ${formatBRL(evalRow.condition_discount)}`}
                      />
                      <BreakdownRow
                        label="Total de deduções"
                        value={`− ${formatBRL(evalRow.total_deductions)}`}
                      />
                      <BreakdownRow
                        label="Valor final"
                        value={formatBRL(evalRow.final_value)}
                        bold
                      />
                    </div>
                    {damages.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Defeitos declarados
                        </p>
                        <ul className="space-y-1 text-sm">
                          {damages.map((d, i) => (
                            <li key={i} className="flex justify-between gap-3 text-muted-foreground">
                              <span className="truncate">{d.name}</span>
                              <span className="text-foreground font-medium">{d.option}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* Lead address */}
              {lead && (lead.address_zip || lead.address_city) && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> Endereço informado
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {[
                        lead.address_street,
                        lead.address_number,
                        lead.address_complement,
                        lead.address_neighborhood,
                        lead.address_city && `${lead.address_city}/${lead.address_state ?? ""}`,
                        lead.address_zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </section>
                </>
              )}

              {/* Acceptance timestamps */}
              {lead && (lead.terms_accepted_at || lead.contract_accepted_at) && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {lead.terms_accepted_at && (
                    <p>✓ Termos aceitos em {format(new Date(lead.terms_accepted_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                  )}
                  {lead.contract_accepted_at && (
                    <p>✓ Contrato aceito em {format(new Date(lead.contract_accepted_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Internal notes */}
              <section className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  Anotação interna
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Visível apenas para o time. Ex.: cliente pediu retorno na sexta..."
                  rows={3}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => notesMut.mutate(notes)}
                  disabled={notesMut.isPending || notes === ((data as any).internal_notes ?? "")}
                >
                  {notesMut.isPending && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Salvar anotação
                </Button>
              </section>

              <Separator />

              {/* Archive */}
              <Button
                variant={isArchived ? "secondary" : "outline"}
                className="w-full gap-2"
                onClick={() => archiveMut.mutate(!isArchived)}
                disabled={archiveMut.isPending}
              >
                {archiveMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isArchived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isArchived ? "Restaurar proposta" : "Arquivar proposta"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground break-words">{children}</div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between px-3 py-2", bold && "bg-muted/40")}>
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>
        {label}
      </span>
      <span className={cn("tabular-nums", bold ? "font-bold text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
