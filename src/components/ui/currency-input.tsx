import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatBRLWithSymbol,
  parseDigitsToBRL,
  onlyDigits,
} from "@/lib/currency";

/**
 * Input de moeda BRL com máscara progressiva.
 *
 * - `value`: number em reais (ex.: 1500.5)
 * - `onValueChange(value)`: dispara com o novo number já normalizado.
 *
 * Mostra sempre o valor formatado como "R$ 1.500,50".
 * O usuário pode digitar normalmente; só dígitos são considerados.
 */
export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, onBlur, onFocus, ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(formatBRLWithSymbol(value || 0));

    // Sincroniza quando o value externo muda (ex.: reset de form)
    React.useEffect(() => {
      setDisplay(formatBRLWithSymbol(value || 0));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = onlyDigits(e.target.value);
      const next = parseDigitsToBRL(digits);
      setDisplay(formatBRLWithSymbol(next));
      onValueChange(next);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onFocus={(e) => {
          // Move o cursor para o final, evitando edição entre o "R$" e o valor
          requestAnimationFrame(() => {
            const el = e.target as HTMLInputElement;
            const len = el.value.length;
            el.setSelectionRange(len, len);
          });
          onFocus?.(e);
        }}
        onBlur={onBlur}
        className={cn(className)}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
