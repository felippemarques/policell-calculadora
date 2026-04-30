import { useEffect, useMemo, useState } from "react";
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
  Phone,
  Mail,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { openWhatsapp, buildContextualMessage } from "@/lib/whatsapp";
import { buildDossierText, buildAddressText } from "@/lib/proposal-dossier";
import { formatImei, isValidImei } from "@/lib/imei";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { CommercialAdjustmentSection } from "./CommercialAdjustmentSection";
import { ContractDownloadButtons } from "./ContractDownloadButtons";
import { parseProposalOverride } from "@/lib/proposal-override";

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

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { user } = useAuth();
  const adminEmail = user?.email ?? null;

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

  // Fetch device specs for the "Aparelho do cliente" block
  const deviceId = (data as any)?.device_id as string | undefined;
  const { data: device } = useQuery({
    enabled: !!deviceId,
    queryKey: ["proposal-device", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("brand, model, storage, colors, base_price, trade_price, sale_price")
        .eq("id", deviceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  const lead = kind === "lead" ? (data as any) : null;
  const evalRow = kind === "evaluation" ? (data as any) : null;
  const isArchived = !!data?.archived_at;
  const couponCode = evalRow?.coupon_code as string | undefined;
  const finalValue = evalRow?.final_value as number | undefined;
  const status = (data as any)?.status as string | undefined;
  const flowType = (data as any)?.flow_type as string | undefined;
  const customerEmail = (data as any)?.customer_email as string | undefined;
  const imei = (lead?.imei || evalRow?.imei) as string | undefined;

  const damages: Array<{ name: string; option: string; value?: number; mode?: string; percent?: number }> =
    Array.isArray(evalRow?.damages) ? evalRow.damages : [];

  // Lead progress checklist
  const pendingItems = useMemo(() => {
    if (!lead) return [];
    const items: string[] = [];
    if (!lead.device_id) items.push("aparelho não selecionado");
    if (!lead.imei) items.push("IMEI não informado");
    if (!lead.address_zip) items.push("endereço não preenchido");
    if (!lead.terms_accepted_at) items.push("termos não aceitos");
    if (!lead.contract_accepted_at) items.push("contrato não aceito");
    return items;
  }, [lead]);

  const dossierText = useMemo(() => {
    if (!data) return "";
    return buildDossierText({
      kind: kind!,
      customerName,
      customerPhone,
      customerEmail,
      deviceLabel,
      imei,
      flowType,
      status,
      finalValue: finalValue ?? null,
      couponCode: couponCode ?? null,
      address: lead
        ? {
            street: lead.address_street,
            number: lead.address_number,
            complement: lead.address_complement,
            neighborhood: lead.address_neighborhood,
            city: lead.address_city,
            state: lead.address_state,
            zip: lead.address_zip,
          }
        : null,
      pendingItems: kind === "lead" && status === "in_progress" ? pendingItems : undefined,
      rejectionReason: lead?.rejection_reason ?? null,
    });
  }, [data, kind, customerName, customerPhone, customerEmail, deviceLabel, imei, flowType, status, finalValue, couponCode, lead, pendingItems]);

  if (!open) return null;

  const handleCopy = async (text: string, key: string, label = "Copiado") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: label });
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleWhats = () =>
    openWhatsapp(
      customerPhone,
      buildContextualMessage({
        kind: kind!,
        customerName,
        deviceLabel,
        status,
        couponCode,
        finalValue,
      }),
    );

  const flowLabel = flowType === "sale" ? "Venda" : "Troca";
  const statusBadge =
    status === "completed"
      ? { label: "Concluído", className: "bg-success/15 text-success border-success/30" }
      : status === "rejected"
        ? { label: "Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" }
        : { label: "Em andamento", className: "bg-warning/15 text-warning border-warning/30" };

  const phoneDigits = onlyDigits(customerPhone);
  const imeiValid = imei ? isValidImei(imei) : false;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 py-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {kind === "evaluation" ? "Cupom emitido" : "Proposta"}
              </p>
              <h3 className="text-lg font-bold truncate leading-tight">{customerName || "—"}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-xs">{flowLabel}</Badge>
                <Badge variant="outline" className={cn("text-xs", statusBadge.className)}>
                  {statusBadge.label}
                </Badge>
                {isArchived && (
                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                    Arquivada
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact links */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {customerPhone && (
              <a href={`tel:${phoneDigits}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Phone className="h-3 w-3" />
                {customerPhone}
              </a>
            )}
            {customerEmail && (
              <a href={`mailto:${customerEmail}`} className="inline-flex items-center gap-1 hover:text-foreground truncate">
                <Mail className="h-3 w-3" />
                <span className="truncate">{customerEmail}</span>
              </a>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleWhats}
              size="sm"
              className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={!phoneDigits}
              className="gap-1.5"
            >
              <a href={`tel:${phoneDigits}`}>
                <Phone className="h-4 w-4" />
                Ligar
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(dossierText, "dossier", "Dossiê copiado")}
              className="gap-1.5"
            >
              {copiedKey === "dossier" ? <Check className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
              Dossiê
            </Button>
          </div>
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
                <div className="flex items-center gap-2 p-3 rounded-md border border-warning/40 bg-warning/10 text-warning text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  Esta proposta está arquivada.
                </div>
              )}

              {/* Coupon highlight */}
              {couponCode && (() => {
                const ov = parseProposalOverride((evalRow as any)?.internal_notes);
                return (
                  <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3 w-3" /> Cupom
                      </p>
                      {ov && (
                        <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/40">
                          Ajustado pelo comercial
                        </Badge>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(couponCode, "coupon", "Cupom copiado")}
                      className="w-full text-left font-mono text-lg font-bold tracking-wider text-primary hover:underline"
                    >
                      {couponCode}
                    </button>
                    {typeof finalValue === "number" && (
                      <p className="text-2xl font-bold text-foreground">{formatBRL(finalValue)}</p>
                    )}
                  </div>
                );
              })()}

              {/* Aparelho do cliente */}
              <section className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5" /> Aparelho do cliente
                </h4>
                <div className="rounded-md border border-border p-3 space-y-2 text-sm">
                  <div className="font-medium text-foreground">{deviceLabel}</div>
                  {device && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {device.brand && <div><span className="text-muted-foreground">Marca:</span> <span className="text-foreground">{device.brand}</span></div>}
                      {device.storage && <div><span className="text-muted-foreground">Armazenamento:</span> <span className="text-foreground">{device.storage}</span></div>}
                      {device.colors && <div><span className="text-muted-foreground">Cores:</span> <span className="text-foreground">{device.colors}</span></div>}
                      {typeof device.base_price === "number" && (
                        <div><span className="text-muted-foreground">Preço base:</span> <span className="text-foreground">{formatBRL(device.base_price)}</span></div>
                      )}
                    </div>
                  )}

                  {/* IMEI */}
                  <div className="pt-1.5 border-t border-border/60 mt-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" /> IMEI
                        </p>
                        {imei ? (
                          <p className={cn("font-mono text-sm break-all", !imeiValid && "text-warning")}>
                            {formatImei(imei)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Não informado</p>
                        )}
                        {imei && !imeiValid && (
                          <p className="text-[11px] text-warning mt-0.5">⚠ IMEI inválido (Luhn)</p>
                        )}
                      </div>
                      {imei && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(imei.replace(/\D/g, ""), "imei", "IMEI copiado")}
                          className="gap-1.5 flex-shrink-0"
                        >
                          {copiedKey === "imei" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copiar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Onde parou (lead in_progress) */}
              {kind === "lead" && status === "in_progress" && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Onde o cliente parou
                  </h4>
                  <ul className="rounded-md border border-border divide-y divide-border text-sm">
                    <ChecklistRow ok={!!lead.device_id} label="Aparelho selecionado" />
                    <ChecklistRow ok={!!lead.imei} label="IMEI informado" />
                    <ChecklistRow ok={!!lead.address_zip} label="Endereço preenchido" />
                    <ChecklistRow ok={!!lead.terms_accepted_at} label="Termos aceitos" />
                    <ChecklistRow ok={!!lead.contract_accepted_at} label="Contrato aceito" />
                  </ul>
                </section>
              )}

              {/* Resumo financeiro (evaluations) */}
              {evalRow && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Resumo financeiro
                  </h4>
                  {(evalRow.device_condition || damages.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {evalRow.device_condition && (
                        <Badge variant="outline" className="capitalize">
                          Condição: {evalRow.device_condition}
                        </Badge>
                      )}
                      {damages.length > 0 && (
                        <Badge variant="outline">
                          {damages.length} defeito{damages.length > 1 ? "s" : ""} declarado{damages.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  )}
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
                    <BreakdownRow label="Valor final" value={formatBRL(evalRow.final_value)} bold />
                  </div>
                </section>
              )}

              {/* Ajuste comercial + download de PDFs */}
              {evalRow && (
                <>
                  <CommercialAdjustmentSection evaluation={evalRow} adminEmail={adminEmail} />
                  <ContractDownloadButtons evaluation={evalRow} />
                </>
              )}

              {/* Defeitos detalhados */}
              {damages.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Defeitos declarados
                  </h4>
                  <ul className="rounded-md border border-border divide-y divide-border text-sm">
                    {damages.map((d, i) => {
                      const impact =
                        typeof d.value === "number" && d.value > 0
                          ? d.mode === "percent" || (typeof d.percent === "number" && d.percent > 0)
                            ? `−${d.percent ?? d.value}%`
                            : `− ${formatBRL(d.value)}`
                          : null;
                      return (
                        <li key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-foreground truncate">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{d.option}</p>
                          </div>
                          {impact && (
                            <span className="text-sm font-medium text-destructive tabular-nums flex-shrink-0">
                              {impact}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Rejection reason */}
              {lead?.rejection_reason && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-destructive font-semibold mb-1">
                    Motivo de rejeição
                  </p>
                  <p className="text-foreground">{lead.rejection_reason}</p>
                </div>
              )}

              {/* Endereço */}
              {lead && (lead.address_zip || lead.address_city) && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> Endereço
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleCopy(
                          buildAddressText({
                            street: lead.address_street,
                            number: lead.address_number,
                            complement: lead.address_complement,
                            neighborhood: lead.address_neighborhood,
                            city: lead.address_city,
                            state: lead.address_state,
                            zip: lead.address_zip,
                          }),
                          "address",
                          "Endereço copiado",
                        )
                      }
                      className="gap-1.5 h-7"
                    >
                      {copiedKey === "address" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span className="text-xs">Copiar</span>
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {buildAddressText({
                      street: lead.address_street,
                      number: lead.address_number,
                      complement: lead.address_complement,
                      neighborhood: lead.address_neighborhood,
                      city: lead.address_city,
                      state: lead.address_state,
                      zip: lead.address_zip,
                    })}
                  </p>
                </section>
              )}

              {/* Linha do tempo */}
              <section className="space-y-1.5">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Linha do tempo
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <TimelineRow label="Criado" date={(data as any).created_at} />
                  {(data as any).updated_at && (data as any).updated_at !== (data as any).created_at && (
                    <TimelineRow label="Atualizado" date={(data as any).updated_at} />
                  )}
                  {lead?.terms_accepted_at && <TimelineRow label="Termos aceitos" date={lead.terms_accepted_at} ok />}
                  {lead?.contract_accepted_at && (
                    <TimelineRow label="Contrato aceito" date={lead.contract_accepted_at} ok />
                  )}
                  {evalRow && couponCode && <TimelineRow label="Cupom emitido" date={evalRow.created_at} ok />}
                </ul>
              </section>

              <Separator />

              {/* Internal notes */}
              <section className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-warning" />
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

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={cn("text-sm", ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </li>
  );
}

function TimelineRow({ label, date, ok }: { label: string; date: string; ok?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {ok && <Check className="h-3 w-3 text-success" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground">
        {format(new Date(date), "dd/MM/yy HH:mm", { locale: ptBR })}
      </span>
    </li>
  );
}

function BreakdownRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-3 py-2", bold && "bg-muted/40")}>
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-primary" : "text-foreground")}>{value}</span>
    </div>
  );
}
