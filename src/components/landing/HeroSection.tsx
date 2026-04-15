import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  section: any;
}

const HeroSection = ({ section }: HeroSectionProps) => {
  const layoutData = (() => {
    try { return section.layout ? JSON.parse(section.layout) : {}; } catch { return {}; }
  })();

  const vAlign = layoutData.vAlign || "center";
  const hAlign = layoutData.hAlign || "center";
  const textAlign = (layoutData.textAlign || "center") as "left" | "center" | "right";

  const justifyMap = { left: "flex-start", center: "center", right: "flex-end" } as const;
  const alignMap = { top: "flex-start", center: "center", bottom: "flex-end" } as const;

  return (
    <section className="relative overflow-hidden min-h-[480px] flex items-center">
      {section.image_url ? (
        <img src={section.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}
      <div
        className="relative w-full h-full min-h-[480px] flex px-4 py-20 md:py-28"
        style={{
          justifyContent: justifyMap[hAlign as keyof typeof justifyMap] || "center",
          alignItems: alignMap[vAlign as keyof typeof alignMap] || "center",
          color: section.text_color || undefined,
        }}
      >
        <div className="max-w-5xl" style={{ textAlign }}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {section.title || "Troque ou venda seu aparelho"}
          </h1>
          {section.content && (
            <p className="text-lg mt-4 max-w-xl opacity-80" style={{ marginLeft: textAlign === "center" ? "auto" : undefined, marginRight: textAlign === "center" ? "auto" : textAlign === "left" ? "auto" : undefined }}>
              {section.content}
            </p>
          )}
          <Button
            size="lg"
            className="mt-8"
            style={{
              backgroundColor: section.cta_bg_color || undefined,
              color: section.cta_text_color || undefined,
              borderRadius: section.cta_border_radius ? `${section.cta_border_radius}px` : undefined,
            }}
            asChild
          >
            <Link to="/calculadora">
              {section.cta_text || "Avaliar meu aparelho"} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
