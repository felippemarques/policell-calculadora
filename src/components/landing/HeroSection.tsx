import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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

interface HeroSlide {
  image_url?: string | null;
  tablet_image_url?: string | null;
  desktop_image_url?: string | null;
  large_image_url?: string | null;
  title?: string;
  content?: string;
  link_url?: string;
  text_color?: string;
  vAlign?: keyof typeof vAlignClass;
  hAlign?: keyof typeof hAlignClass;
  textAlign?: keyof typeof textAlignClass;
  bgPosX?: number;
  bgPosY?: number;
  bg_color?: string;
  cta1?: HeroCta;
  cta2?: HeroCta & { enabled?: boolean };
}

type MobileFit = "cover" | "contain";
type MobileAspect = "16/10" | "4/5" | "1/1" | "3/4";

const MOBILE_ASPECT_CLASS: Record<MobileAspect, string> = {
  "16/10": "aspect-[16/10]",
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

const buildCtaTarget = (cta: HeroCta): string => {
  if (cta.url && cta.url.trim()) return cta.url.trim();
  if (cta.intent === "upgrade") return "/calculadora?mode=upgrade";
  if (cta.intent === "sell") return "/calculadora?mode=sell";
  return "/calculadora";
};

const renderCta = (cta: HeroCta | undefined, key: string, primary: boolean, previewMode: boolean) => {
  if (!cta?.text) return null;
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

function SlideContent({
  slide,
  previewMode,
  mobileFit,
  mobileBgPosX,
  mobileBgPosY,
  slideIndex,
}: {
  slide: HeroSlide;
  previewMode: boolean;
  mobileFit: MobileFit;
  mobileBgPosX: number;
  mobileBgPosY: number;
  slideIndex: number;
}) {
  const vAlign = (slide.vAlign || "center") as keyof typeof vAlignClass;
  const hAlign = (slide.hAlign || "center") as keyof typeof hAlignClass;
  const textAlign = (slide.textAlign || "center") as keyof typeof textAlignClass;
  const bgPosX = typeof slide.bgPosX === "number" ? slide.bgPosX : 50;
  const bgPosY = typeof slide.bgPosY === "number" ? slide.bgPosY : 50;
  const slideKey = `slide-bg-${slideIndex}`;

  const cta1 = slide.cta1 || {};
  const cta2 = slide.cta2 || {};
  const cta2Enabled = !!cta2.enabled && !!cta2.text;

  const rawLink = slide.link_url?.trim() || undefined;
  const isExternalLink = !!rawLink && /^https?:\/\//i.test(rawLink);
  const hasAnyCta = !!cta1.text || cta2Enabled;
  const isClickable = !!rawLink && !previewMode && !hasAnyCta;

  // Em preview (admin), viewport é desktop — sm: nunca ativa no container 375px.
  // Aplicar mobileFit diretamente sem prefixo de breakpoint.
  const imgFitClass = previewMode
    ? (mobileFit === "contain" ? "object-contain" : "object-cover")
    : (mobileFit === "contain" ? "object-contain sm:object-cover" : "object-cover");

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-background"
      style={
        slide.bg_color && mobileFit === "contain"
          ? { backgroundColor: slide.bg_color }
          : undefined
      }
    >
      {isClickable && (
        isExternalLink ? (
          <a
            href={rawLink!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={slide.title || "Abrir link do banner"}
            className="absolute inset-0 z-10"
          />
        ) : (
          <Link
            to={rawLink!}
            aria-label={slide.title || "Abrir link do banner"}
            className="absolute inset-0 z-10"
          />
        )
      )}

      {/* Background image — uses <img> to avoid edge-cropping on mobile,
          while still respecting the focal point via object-position. */}
      {slide.image_url ? (
        <>
          <style>{`.${slideKey}{object-position:${mobileBgPosX}% ${mobileBgPosY}%}@media(min-width:640px){.${slideKey}{object-position:${bgPosX}% ${bgPosY}%}}`}</style>
          <picture className="contents">
            {slide.large_image_url && <source media="(min-width: 1280px)" srcSet={slide.large_image_url} />}
            {slide.desktop_image_url && <source media="(min-width: 1024px)" srcSet={slide.desktop_image_url} />}
            {slide.tablet_image_url && <source media="(min-width: 640px)" srcSet={slide.tablet_image_url} />}
            <img
              src={slide.image_url}
              alt={slide.title || ""}
              className={cn("absolute inset-0 w-full h-full", imgFitClass, slideKey)}
              loading="eager"
            />
          </picture>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}

      <div
        className={cn(
          "absolute inset-0 z-20 flex w-full h-full px-4 md:px-6 pointer-events-none",
          previewMode ? "py-6 md:py-8" : "py-10 md:py-20",
          vAlignClass[vAlign],
          hAlignClass[hAlign],
        )}
        style={{ color: slide.text_color || undefined }}
      >
        <div
          className={cn(
            "pointer-events-auto flex w-full max-w-2xl flex-col gap-3 md:gap-6",
            textAlignClass[textAlign],
          )}
        >
          {slide.title && (
            <h1
              className={cn(
                "font-semibold leading-[1.1] tracking-tight",
                previewMode
                  ? "text-2xl sm:text-3xl md:text-4xl"
                  : "text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl",
              )}
            >
              {slide.title}
            </h1>
          )}

          {slide.content && (
            <p
              className={cn(
                "font-normal leading-relaxed opacity-80",
                previewMode ? "text-sm md:text-base" : "text-sm md:text-lg lg:text-xl",
              )}
            >
              {slide.content}
            </p>
          )}

          {(cta1.text || cta2Enabled) && (
            <div
              className={cn(
                "flex flex-wrap gap-3",
                previewMode ? "mt-2" : "mt-3 md:mt-4",
                ctaJustifyClass[textAlign],
              )}
            >
              {renderCta(cta1, "cta1", true, previewMode)}
              {cta2Enabled && renderCta(cta2, "cta2", false, previewMode)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const HeroSection = ({ section, previewMode = false }: HeroSectionProps) => {
  const layoutData = (() => {
    try {
      return section.layout ? JSON.parse(section.layout) : {};
    } catch {
      return {};
    }
  })();

  // Build slide list: slide 0 is the section itself; extras come from layout.slides
  const cta1FromSection: HeroCta = {
    text: section.cta_text || undefined,
    bg: section.cta_bg_color || undefined,
    color: section.cta_text_color || undefined,
    radius: section.cta_border_radius ?? undefined,
    intent: (layoutData.cta1_intent as HeroCta["intent"]) || "sell",
    url: layoutData.cta1_url || undefined,
  };
  const cta2FromSection = {
    enabled: !!layoutData.cta2_enabled,
    text: layoutData.cta2?.text,
    bg: layoutData.cta2?.bg,
    color: layoutData.cta2?.color,
    radius: typeof layoutData.cta2?.radius === "number" ? layoutData.cta2.radius : 8,
    intent: (layoutData.cta2?.intent as HeroCta["intent"]) || "upgrade",
    url: layoutData.cta2?.url || undefined,
  };

  const baseSlide: HeroSlide = {
    image_url: section.image_url,
    tablet_image_url: layoutData.tablet_image_url || null,
    desktop_image_url: layoutData.desktop_image_url || null,
    large_image_url: layoutData.large_image_url || null,
    title: section.title,
    content: section.content,
    link_url: section.link_url,
    text_color: section.text_color,
    vAlign: layoutData.vAlign,
    hAlign: layoutData.hAlign,
    textAlign: layoutData.textAlign,
    bgPosX: layoutData.bgPosX,
    bgPosY: layoutData.bgPosY,
    bg_color: section.bg_color,
    cta1: cta1FromSection,
    cta2: cta2FromSection,
  };

  const extraSlides: HeroSlide[] = Array.isArray(layoutData.slides) ? layoutData.slides.slice(0, 2) : [];
  const slides: HeroSlide[] = [baseSlide, ...extraSlides].filter(
    (s) => s.image_url || s.title || s.content,
  );

  const autoplayMs = Number(layoutData.autoplay_ms ?? 5000);
  const isCarousel = slides.length > 1 && !previewMode;

  const mobileFit: MobileFit = layoutData.mobile_fit === "contain" ? "contain" : "cover";
  const mobileAspect: MobileAspect = (
    ["16/10", "4/5", "1/1", "3/4"].includes(layoutData.mobile_aspect)
      ? layoutData.mobile_aspect
      : "16/10"
  ) as MobileAspect;
  const bgPosXMain: number = typeof layoutData.bgPosX === "number" ? layoutData.bgPosX : 50;
  const bgPosYMain: number = typeof layoutData.bgPosY === "number" ? layoutData.bgPosY : 50;
  const mobileBgPosX: number = typeof layoutData.mobile_bg_pos_x === "number" ? layoutData.mobile_bg_pos_x : bgPosXMain;
  const mobileBgPosY: number = typeof layoutData.mobile_bg_pos_y === "number" ? layoutData.mobile_bg_pos_y : bgPosYMain;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    isCarousel && autoplayMs > 0
      ? [Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: true })]
      : [],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  // Wrapper sizing: in preview, fill parent; in production, responsive aspect.
  const wrapperClass = previewMode
    ? "relative w-full h-full"
    : cn(
        "relative w-full",
        MOBILE_ASPECT_CLASS[mobileAspect],
        "sm:aspect-[16/10] md:aspect-[16/7] lg:aspect-[21/8]",
      );

  if (!isCarousel) {
    return (
      <section className={wrapperClass}>
        <SlideContent slide={slides[0] || baseSlide} previewMode={previewMode} mobileFit={mobileFit} mobileBgPosX={mobileBgPosX} mobileBgPosY={mobileBgPosY} slideIndex={0} />
      </section>
    );
  }

  return (
    <section className={cn(wrapperClass, "group/hero")}>
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, i) => (
            <div key={i} className="relative flex-[0_0_100%] min-w-0 h-full">
              <SlideContent slide={slide} previewMode={previewMode} mobileFit={mobileFit} mobileBgPosX={mobileBgPosX} mobileBgPosY={mobileBgPosY} slideIndex={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop arrows */}
      <button
        type="button"
        onClick={scrollPrev}
        aria-label="Slide anterior"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-foreground hover:bg-background opacity-0 group-hover/hero:opacity-100 transition-opacity shadow-md"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        aria-label="Próximo slide"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 h-10 w-10 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm border border-border/60 text-foreground hover:bg-background opacity-0 group-hover/hero:opacity-100 transition-opacity shadow-md"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Ir ao slide ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all duration-300 backdrop-blur-sm",
              selectedIndex === i ? "w-6 bg-foreground" : "w-2 bg-foreground/40 hover:bg-foreground/60",
            )}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
