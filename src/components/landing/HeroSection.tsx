import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  section: any;
  previewMode?: boolean;
}

const vAlignClass = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
} as const;

const hAlignClass = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

const textAlignClass = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
} as const;

const ctaJustifyClass = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

interface HeroCta {
  text?: string;
  bg?: string;
  color?: string;
  radius?: number;
  intent?: "sell" | "upgrade" | "none";
  url?: string;
}

const HeroSection = ({ section, previewMode = false }: HeroSectionProps) => {
  const layoutData = (() => {
    try {
      return section.layout ? JSON.parse(section.layout) : {};
    } catch {
      return {};
    }
  })();

  const vAlign = (layoutData.vAlign || "center") as keyof typeof vAlignClass;
  const hAlign = (layoutData.hAlign || "center") as keyof typeof hAlignClass;
  const textAlign = (layoutData.textAlign || "center") as keyof typeof textAlignClass;
  const bgPosX = typeof layoutData.bgPosX === "number" ? layoutData.bgPosX : 50;
  const bgPosY = typeof layoutData.bgPosY === "number" ? layoutData.bgPosY : 50;

  // CTA 1: legacy fields on the section (preserves backward compatibility)
  const cta1: HeroCta = {
    text: section.cta_text || undefined,
    bg: section.cta_bg_color || undefined,
    color: section.cta_text_color || undefined,
    radius: section.cta_border_radius ?? undefined,
    intent: (layoutData.cta1_intent as HeroCta["intent"]) || "sell",
    url: layoutData.cta1_url || undefined,
  };

  // CTA 2: stored entirely in layout JSON
  const cta2Raw = layoutData.cta2 || {};
  const cta2Enabled = !!layoutData.cta2_enabled && !!cta2Raw.text;
  const cta2: HeroCta = {
    text: cta2Raw.text,
    bg: cta2Raw.bg,
    color: cta2Raw.color,
    radius: typeof cta2Raw.radius === "number" ? cta2Raw.radius : 8,
    intent: (cta2Raw.intent as HeroCta["intent"]) || "upgrade",
    url: cta2Raw.url || undefined,
  };

  const buildCtaTarget = (cta: HeroCta): string => {
    if (cta.url && cta.url.trim()) return cta.url.trim();
    if (cta.intent === "upgrade") return "/calculadora?mode=upgrade";
    if (cta.intent === "sell") return "/calculadora?mode=sell";
    return "/calculadora";
  };

  const renderCta = (cta: HeroCta, key: string, primary: boolean) => {
    if (!cta.text) return null;
    const target = buildCtaTarget(cta);
    const isExternal = /^https?:\/\//i.test(target);
    const inner = (
      <>
        {cta.text} <ArrowRight className="ml-2 h-4 w-4" />
      </>
    );
    return (
      <Button
        key={key}
        size="lg"
        className={cn(
          "rounded-full shadow-sm transition-shadow hover:shadow-md",
          previewMode ? "h-10 px-5 text-sm" : "h-12 px-8 text-base",
        )}
        style={{
          backgroundColor: cta.bg || undefined,
          color: cta.color || undefined,
          borderRadius: typeof cta.radius === "number" ? `${cta.radius}px` : undefined,
        }}
        variant={primary ? "default" : "secondary"}
        asChild
      >
        {isExternal ? (
          <a href={target} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <Link to={target}>{inner}</Link>
        )}
      </Button>
    );
  };

  // Outer banner-link is suppressed if any CTA is configured (avoid swallowing button clicks)
  const rawLink: string | undefined = section.link_url?.trim() || undefined;
  const isExternalLink = !!rawLink && /^https?:\/\//i.test(rawLink);
  const hasAnyCta = !!cta1.text || cta2Enabled;
  const isClickable = !!rawLink && !previewMode && !hasAnyCta;

  return (
    <section
      className={cn(
        "relative flex w-full items-center overflow-hidden bg-background bg-cover bg-no-repeat",
        previewMode ? "h-full min-h-0" : "min-h-[500px] md:min-h-[600px]",
      )}
    >
      {isClickable && (
        isExternalLink ? (
          <a
            href={rawLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={section.title || "Abrir link do banner"}
            className="absolute inset-0 z-10"
          />
        ) : (
          <Link
            to={rawLink!}
            aria-label={section.title || "Abrir link do banner"}
            className="absolute inset-0 z-10"
          />
        )
      )}
      {section.image_url ? (
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url(${section.image_url})`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundSize: "cover",
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}

      <div
        className={cn(
          "relative z-20 flex w-full px-4 md:px-6 pointer-events-none",
          previewMode ? "h-full py-6 md:py-8" : "py-16 md:py-40",
          vAlignClass[vAlign],
          hAlignClass[hAlign],
        )}
        style={{ color: section.text_color || undefined }}
      >
        <div
          className={cn(
            "pointer-events-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6",
            textAlignClass[textAlign],
          )}
        >
          {section.title && (
            <h1 className={cn(
              "font-semibold leading-[1.1] tracking-tight",
              previewMode ? "text-2xl sm:text-3xl md:text-4xl" : "text-3xl md:text-5xl lg:text-6xl xl:text-7xl",
            )}>
              {section.title}
            </h1>
          )}

          {section.content && (
            <p className={cn(
              "font-normal leading-relaxed opacity-70",
              previewMode ? "text-sm md:text-base" : "text-base md:text-xl",
            )}>
              {section.content}
            </p>
          )}

          {(cta1.text || cta2Enabled) && (
            <div
              className={cn(
                "flex flex-wrap gap-3",
                previewMode ? "mt-2" : "mt-4",
                ctaJustifyClass[textAlign],
              )}
            >
              {renderCta(cta1, "cta1", true)}
              {cta2Enabled && renderCta(cta2, "cta2", false)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
