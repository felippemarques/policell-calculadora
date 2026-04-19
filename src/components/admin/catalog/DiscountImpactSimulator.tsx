import { useEffect, useState } from "react";
import { ArrowRight, Calculator, TrendingDown } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { formatBRL, type DiscountMode } from "@/lib/trade-in-pricing";

interface Props {
  /** 'percent' applies a % discount; 'fixed' subtracts R$ */
  mode: DiscountMode;
  /** The numeric value the admin is currently typing (% or R$) */
  value: number;
  /** Optional label override */
  title?: string;
}

const STORAGE_KEY = "pollicell.admin.simulator.basePrice.v1";
const DEFAULT_BASE = 2000;

function loadBase(): number {
  if (typeof window === "undefined") return DEFAULT_BASE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BASE;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

/**
 * Reactive impact simulator for discount/deduction inputs.
 * Renders Base → Discount → Final, recalculated as the admin types.
 * The fictitious base price persists across the admin session via localStorage.
 */
export function DiscountImpactSimulator({ mode, value, title = "Simulador de impacto" }: Props) {
  const [base, setBase] = useState<number>(() => loadBase());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(base));
    } catch {
      /* noop */
    }
  }, [base]);

  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const discountAmount =
    mode === "percent" ? Math.round(base * (safeValue / 100) * 100) / 100 : Math.min(base, safeValue);
  const final = Math.max(0, Math.round((base - discountAmount) * 100) / 100);
  const effectivePercent = base > 0 ? Math.round((discountAmount / base) * 1000) / 10 : 0;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Calculator className="h-3 w-3" /> {title}
        </Label>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Preço base fictício
        </Label>
        <CurrencyInput
          value={base}
          onValueChange={setBase}
          className="h-8 text-sm bg-background"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
        <span className="rounded-md bg-background px-2 py-1 font-medium tabular-nums">
          {formatBRL(base)}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="rounded-md bg-destructive/10 text-destructive px-2 py-1 font-medium tabular-nums inline-flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          −{formatBRL(discountAmount)}
          {mode === "fixed" && base > 0 && (
            <span className="text-[10px] opacity-70">({effectivePercent}%)</span>
          )}
          {mode === "percent" && (
            <span className="text-[10px] opacity-70">({safeValue}%)</span>
          )}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="rounded-md bg-primary text-primary-foreground px-2.5 py-1 font-semibold tabular-nums">
          {formatBRL(final)}
        </span>
      </div>
    </div>
  );
}
