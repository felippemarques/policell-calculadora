import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, MessageCircle, Smartphone, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openWhatsapp } from "@/lib/whatsapp";

type StaleLead = {
  id: string;
  customer_name: string;
  customer_phone: string;
  device_id: string | null;
  flow_type: string;
  created_at: string;
  updated_at: string;
};

type DeviceRow = { id: string; brand: string; model: string; storage: string };

const STALE_HOURS = 24;

export function NextActionsCard() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["dashboard-next-actions"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("leads")
        .select("id, customer_name, customer_phone, device_id, flow_type, created_at, updated_at")
        .eq("status", "in_progress")
        .is("archived_at", null)
        .not("device_id", "is", null)
        .lte("updated_at", cutoff)
        .order("updated_at", { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data || []) as StaleLead[];
    },
    refetchInterval: 60_000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["dashboard-next-actions-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, brand, model, storage");
      if (error) throw error;
      return (data || []) as DeviceRow[];
    },
  });

  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  const deviceLabel = (id: string | null) => {
    if (!id) return "Aparelho não informado";
    const d = deviceMap.get(id);
    return d ? `${d.brand} ${d.model} ${d.storage}`.trim() : "Aparelho";
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Próximas ações
          </h3>
          <p className="text-xs text-muted-foreground">
            Propostas com aparelho escolhido e sem mexer há mais de {STALE_HOURS}h
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {leads.length} parada{leads.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          🎉 Nenhuma proposta parada. Time em dia!
        </p>
      ) : (
        <ul className="space-y-2">
          {leads.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-accent/5 transition"
            >
              <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {l.customer_name || "Cliente sem nome"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {deviceLabel(l.device_id)} ·{" "}
                  <span title={format(new Date(l.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}>
                    parada há{" "}
                    {formatDistanceToNow(new Date(l.updated_at), {
                      locale: ptBR,
                      addSuffix: false,
                    })}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-success hover:text-success hover:bg-success/10 gap-1.5"
                onClick={() => {
                  const first = l.customer_name?.split(" ")[0] ?? "";
                  openWhatsapp(
                    l.customer_phone,
                    `Olá${first ? `, ${first}` : ""}! Vi que você começou uma avaliação do ${deviceLabel(l.device_id)} e queria te ajudar a finalizar. Posso te dar uma força?`,
                  );
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Link
                to="/admin/visao-cliente"
                className="text-muted-foreground hover:text-foreground"
                title="Abrir visão do cliente"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
