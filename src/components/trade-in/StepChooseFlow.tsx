import { ArrowRightLeft, Banknote, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowSettings } from "@/hooks/use-flow-settings";
import { useCalcHeroSettings } from "@/hooks/use-calc-hero-settings";

export type FlowType = "trade" | "sale";

interface Props {
  onChoose: (type: FlowType) => void;
}

export function StepChooseFlow({ onChoose }: Props) {
  const { data: settings, isLoading } = useFlowSettings();
  const { data: hero } = useCalcHeroSettings();

  if (isLoading || !settings) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const cards: Array<{
    type: FlowType;
    show: boolean;
    icon: typeof ArrowRightLeft;
    iconUrl: string;
    title: string;
    description: string;
    ctaText: string;
    accent: string;
    iconBg: string;
    customBg: string;
  }> = [
    {
      type: "trade" as FlowType,
      show: settings.trade.enabled,
      icon: ArrowRightLeft,
      iconUrl: hero?.flow_trade_icon_url || "",
      title: settings.trade.title,
      description: settings.trade.description,
      ctaText: settings.trade.ctaText,
      accent: "from-primary/10 to-primary/0 hover:border-primary/40",
      iconBg: "bg-primary/10 text-primary",
      customBg: hero?.flow_trade_card_bg || "",
    },
    {
      type: "sale" as FlowType,
      show: settings.sale.enabled,
      icon: Banknote,
      iconUrl: hero?.flow_sale_icon_url || "",
      title: settings.sale.title,
      description: settings.sale.description,
      ctaText: settings.sale.ctaText,
      accent: "from-accent/15 to-accent/0 hover:border-accent/50",
      iconBg: "bg-accent/15 text-accent-foreground",
      customBg: hero?.flow_sale_card_bg || "",
    },
  ].filter((c) => c.show);

  if (cards.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Nenhum fluxo de negociação está habilitado no momento.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center space-y-1">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Como você quer negociar?
        </h3>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de proposta que faz mais sentido para você.
        </p>
      </div>

      <div className="grid gap-3 md:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const hasCustomBg = !!c.customBg;
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => onChoose(c.type)}
              style={hasCustomBg ? { backgroundColor: c.customBg, backgroundImage: "none" } : undefined}
              className={`group relative text-left w-full rounded-2xl border-2 border-border p-5 md:p-6 transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                hasCustomBg ? "" : `bg-gradient-to-br ${c.accent}`
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center overflow-hidden ${
                    c.iconUrl ? "bg-transparent" : c.iconBg
                  }`}
                >
                  {c.iconUrl ? (
                    <img
                      src={c.iconUrl}
                      alt={c.title}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Icon className="h-6 w-6 md:h-7 md:w-7" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-base md:text-lg">
                    {c.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    {c.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary">
                    {c.ctaText}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
