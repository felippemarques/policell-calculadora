/**
 * Apple naming convention helper.
 *
 * Aplica o padrão de escrita oficial da Apple a um nome de produto.
 * Exemplos:
 *   "iphone 14 pro max"  -> "iPhone 14 Pro Max"
 *   "Iphone"             -> "iPhone"
 *   "Pro max"            -> "Pro Max"
 *   "ipad air"           -> "iPad Air"
 *   "macbook pro 16"     -> "MacBook Pro 16"
 *
 * Regras:
 * - Marcas Apple usam camelCase específico (iPhone, iPad, iPod, iMac, AirPods, MacBook).
 * - Modificadores conhecidos viram Title Case (Pro, Max, Mini, Plus, Air, Ultra, Lite).
 * - "SE" e "Pro Max" preservam capitalização especial.
 * - Conteúdo entre parênteses é preservado (ex.: "(2nd Gen)").
 * - Espaços extras são colapsados.
 */

const APPLE_BRAND_MAP: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  ipod: "iPod",
  imac: "iMac",
  iwatch: "iWatch",
  airpods: "AirPods",
  airpod: "AirPod",
  macbook: "MacBook",
  homepod: "HomePod",
  appletv: "AppleTV",
  airtag: "AirTag",
  apple: "Apple",
};

const MODIFIER_MAP: Record<string, string> = {
  pro: "Pro",
  max: "Max",
  mini: "Mini",
  plus: "Plus",
  air: "Air",
  ultra: "Ultra",
  lite: "Lite",
  se: "SE",
  std: "Std",
};

const STORAGE_UNITS = new Set(["gb", "tb", "mb"]);

function fixToken(token: string): string {
  if (!token) return token;
  const lower = token.toLowerCase();

  // Apple brand identifiers
  if (APPLE_BRAND_MAP[lower]) return APPLE_BRAND_MAP[lower];

  // Known modifiers
  if (MODIFIER_MAP[lower]) return MODIFIER_MAP[lower];

  // Storage units (e.g. 256GB, 1TB) — keep digits, uppercase unit
  const storageMatch = lower.match(/^(\d+)(gb|tb|mb)$/);
  if (storageMatch) return `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;

  // Pure numbers stay as is
  if (/^\d+$/.test(lower)) return lower;

  // Roman-ish all caps short tokens
  if (/^[ivxlcdm]{1,4}$/.test(lower) && lower.length <= 3) return lower.toUpperCase();

  // Tokens with an internal apostrophe / hyphen — title-case each piece
  if (/[-/]/.test(token)) {
    return token
      .split(/([-/])/)
      .map((p) => (p === "-" || p === "/" ? p : fixToken(p)))
      .join("");
  }

  // Default: Title Case
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Aplica o padrão Apple de escrita.
 * Não altera conteúdo entre parênteses.
 */
export function applyAppleCasing(input: string): string {
  if (!input) return input;
  // Collapse whitespace
  const cleaned = input.replace(/\s+/g, " ").trim();

  // Process while preserving content inside parentheses
  return cleaned.replace(/\(([^)]*)\)|([^()\s]+)/g, (_, inside, token) => {
    if (typeof inside === "string") return `(${inside})`;
    return fixToken(token);
  }).replace(/\s+/g, " ");
}

/**
 * Verifica se a marca recebida é Apple (case-insensitive, tolera espaços).
 */
export function isAppleBrand(brandName: string | null | undefined): boolean {
  if (!brandName) return false;
  return brandName.trim().toLowerCase() === "apple";
}

/**
 * Aplica o padrão somente quando a marca é Apple. Caso contrário devolve o
 * input intocado.
 */
export function applyAppleCasingForBrand(
  input: string,
  brandName: string | null | undefined,
): string {
  if (!isAppleBrand(brandName)) return input;
  return applyAppleCasing(input);
}
