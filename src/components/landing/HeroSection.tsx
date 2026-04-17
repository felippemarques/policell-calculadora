import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  section: any;
}

// Mobile-first: small screens are always centered (vert. + horiz.) for legibility.
// On md+ we honor the admin's choice from the layout JSON.
const vAlignClass = {
  top: "md:items-start",
  center: "md:items-center",
  bottom: "md:items-end",
} as const;

const hAlignClass = {
  left: "md:justify-start",
  center: "md:justify-center",
  right: "md:justify-end",
} as const;

const textAlignClass = {
  left: "md:text-left md:items-start",
  center: "md:text-center md:items-center",
  right: "md:text-right md:items-end",
} as const;

const HeroSection = ({ section }: HeroSectionProps) => {
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

  return (
    <section className="relative flex w-full min-h-[500px] md:min-h-[600px] overflow-hidden bg-background bg-cover bg-no-repeat">
      {section.image_url ? (
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url(${section.image_url})`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}

      <div
        className={cn(
          "relative w-full flex px-4 md:px-6 py-16 md:py-40",
          // Mobile defaults: centered
          "items-center justify-center",
          vAlignClass[vAlign],
          hAlignClass[hAlign],
        )}
        style={{ color: section.text_color || undefined }}
      >
        <div
          className={cn(
            "w-full max-w-2xl flex flex-col gap-5 md:gap-6",
            // Mobile defaults: centered
            "text-center items-center",
            textAlignClass[textAlign],
          )}
        >
          {section.title && (
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight">
              {section.title}
            </h1>
          )}

          {section.content && (
            <p className="text-base md:text-xl opacity-70 font-normal leading-relaxed">
              {section.content}
            </p>
          )}

          {section.cta_text && (
            <Button
              size="lg"
              className="mt-4 h-12 px-8 text-base rounded-full shadow-sm hover:shadow-md transition-shadow"
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
