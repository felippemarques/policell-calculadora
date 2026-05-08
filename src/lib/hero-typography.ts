// Tipografia configurável para as 3 linhas do hero da calculadora.
export const HERO_FONT_OPTIONS = [
  { value: "sans", label: "Sans-serif (padrão)", className: "font-sans" },
  { value: "serif", label: "Serif (elegante)", className: "font-serif" },
  { value: "mono", label: "Monoespaçada", className: "font-mono" },
  { value: "display", label: "Display / Bold", className: "font-sans font-extrabold tracking-tight" },
] as const;

export const HERO_SIZE_OPTIONS = [
  { value: "hero", label: "Hero (gigante)", className: "text-4xl md:text-6xl font-bold tracking-tight" },
  { value: "h1", label: "H1 (título principal)", className: "text-2xl md:text-4xl font-semibold tracking-tight" },
  { value: "h2", label: "H2 (título)", className: "text-xl md:text-3xl font-semibold tracking-tight" },
  { value: "h3", label: "H3 (subtítulo)", className: "text-lg md:text-2xl font-semibold" },
  { value: "h4", label: "H4 (destaque)", className: "text-base md:text-xl font-medium" },
  { value: "body", label: "Texto normal", className: "text-sm md:text-base" },
  { value: "small", label: "Pequeno", className: "text-xs md:text-sm" },
] as const;

export type HeroFont = (typeof HERO_FONT_OPTIONS)[number]["value"];
export type HeroSize = (typeof HERO_SIZE_OPTIONS)[number]["value"];

export function heroFontClass(value: string | undefined): string {
  return HERO_FONT_OPTIONS.find((o) => o.value === value)?.className || "font-sans";
}

export function heroSizeClass(value: string | undefined): string {
  return HERO_SIZE_OPTIONS.find((o) => o.value === value)?.className || "text-base";
}
