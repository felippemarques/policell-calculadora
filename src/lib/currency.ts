/**
 * Helpers de moeda BRL.
 *
 * Convenção da máscara progressiva (estilo "calculadora"):
 *   o usuário digita apenas dígitos; cada dígito empurra o número 1 casa.
 *   - "1"     -> R$ 0,01
 *   - "15"    -> R$ 0,15
 *   - "1500"  -> R$ 15,00
 *   - "150000"-> R$ 1.500,00
 *
 * Internamente armazenamos o valor em **reais (number)**, com 2 casas.
 * `formatBRL` aceita number e devolve string formatada em pt-BR sem o "R$ ".
 * `formatBRLWithSymbol` adiciona "R$ " na frente.
 * `parseDigitsToBRL(raw)` recebe a string crua do input e devolve um number.
 */

export function onlyDigits(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

/** "150000" => 1500.00 */
export function parseDigitsToBRL(raw: string): number {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  // Limita a 13 dígitos para evitar overflow de display (até R$ 99.999.999.999,99)
  const cents = parseInt(digits.slice(0, 13), 10);
  return cents / 100;
}

export function formatBRL(value: number): string {
  if (!Number.isFinite(value)) value = 0;
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBRLWithSymbol(value: number): string {
  return `R$ ${formatBRL(value)}`;
}

/**
 * Converte um number (1500.50) para a string com a máscara que será mostrada no input.
 * Devolve "R$ 1.500,50".
 */
export function maskBRLFromNumber(value: number): string {
  return formatBRLWithSymbol(value);
}
