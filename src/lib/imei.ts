/**
 * IMEI utilities — formato 15 dígitos + validação por dígito verificador (Luhn).
 */

export function digitsOnly(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

export function isValidImei(input: string): boolean {
  const digits = digitsOnly(input);
  if (digits.length !== 15) return false;

  let total = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(digits[i]);
    // Posições 2, 4, 6 ... (i ímpar em 0-index) recebem multiplicador 2.
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    total += n;
  }
  return total % 10 === 0;
}

/** Formata IMEI em grupos para leitura (e.g. "123456 789012 345"). */
export function formatImei(input: string): string {
  const d = digitsOnly(input).slice(0, 15);
  if (d.length <= 6) return d;
  if (d.length <= 12) return `${d.slice(0, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 6)} ${d.slice(6, 12)} ${d.slice(12)}`;
}
