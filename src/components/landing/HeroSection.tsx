import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  section: any;
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
  left: "text-left",
  center: "text-center",
  right: "text-right",
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

  return (
    <section className="relative overflow-hidden min-h-[600px] flex bg-background">
      {section.image_url ? (
        <img
          src={section.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}

      <div
        className={cn(
          "relative w-full flex px-6 py-28 md:py-40",
          vAlignClass[vAlign] || "items-center",
          hAlignClass[hAlign] || "justify-center",
        )}
        style={{ color: section.text_color || undefined }}
      >
        <div
          className={cn(
            "w-full max-w-2xl flex flex-col gap-6",
            textAlignClass[textAlign] || "text-center",
            textAlign === "center" && "items-center",
            textAlign === "left" && "items-start",
            textAlign === "right" && "items-end",
          )}
        >
          {section.title && (
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight">
              {section.title}
            </h1>
          )}

          {section.content && (
            <p className="text-lg md:text-xl opacity-70 font-normal leading-relaxed">
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
