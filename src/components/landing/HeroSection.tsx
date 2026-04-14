import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  section: any;
}

const HeroSection = ({ section }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden min-h-[480px] flex items-center">
      {section.image_url ? (
        <img src={section.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      )}
      <div
        className="relative w-full max-w-5xl mx-auto px-4 py-20 md:py-28 text-center"
        style={{ color: section.text_color || undefined }}
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
          {section.title || "Troque ou venda seu aparelho"}
        </h1>
        {section.content && (
          <p className="text-lg mt-4 max-w-xl mx-auto opacity-80">{section.content}</p>
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
    </section>
  );
};

export default HeroSection;
