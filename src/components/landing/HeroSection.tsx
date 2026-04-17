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

  const rawLink: string | undefined = section.link_url?.trim() || undefined;
  const isExternalLink = !!rawLink && /^https?:\/\//i.test(rawLink);
  const isClickable = !!rawLink && !previewMode;

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
          "relative flex w-full px-4 md:px-6",
          previewMode ? "h-full py-6 md:py-8" : "py-16 md:py-40",
          vAlignClass[vAlign],
          hAlignClass[hAlign],
        )}
        style={{ color: section.text_color || undefined }}
      >
        <div
          className={cn(
            "flex w-full max-w-2xl flex-col gap-4 md:gap-6",
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

          {section.cta_text && (
            <Button
              size="lg"
              className={cn(
                "rounded-full shadow-sm transition-shadow hover:shadow-md",
                previewMode ? "mt-2 h-10 px-5 text-sm" : "mt-4 h-12 px-8 text-base",
              )}
              style={{
                backgroundColor: section.cta_bg_color || undefined,
                color: section.cta_text_color || undefined,
                borderRadius: section.cta_border_radius
                  ? `${section.cta_border_radius}px`
                  : undefined,
              }}
              asChild
            >
              <Link to="/calculadora">
                {section.cta_text} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
