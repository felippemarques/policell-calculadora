import { Button } from "@/components/ui/button";

interface CtaBannerSectionProps {
  section: any;
}

const CtaBannerSection = ({ section }: CtaBannerSectionProps) => {
  const contentData = (() => {
    try { return section.content ? JSON.parse(section.content) : {}; } catch { return {}; }
  })();

  const subtitle = contentData.subtitle || "";
  const ctaUrl = contentData.cta_url || "#";

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: section.bg_color || "#1a5c3a", color: section.text_color || "#ffffff" }}
    >
      {section.image_url && (
        <picture className="contents">
          {contentData.large_image_url && <source media="(min-width: 1280px)" srcSet={contentData.large_image_url} />}
          {contentData.desktop_image_url && <source media="(min-width: 1024px)" srcSet={contentData.desktop_image_url} />}
          {contentData.tablet_image_url && <source media="(min-width: 640px)" srcSet={contentData.tablet_image_url} />}
          <img src={section.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </picture>
      )}
      <div className="relative max-w-5xl mx-auto px-4 py-8 md:py-14 flex flex-col md:flex-row items-center gap-5 md:gap-10">
        <div className="flex-1 text-center md:text-left space-y-2">
          {section.title && (
            <p className="text-sm md:text-base opacity-80">{section.title}</p>
          )}
          {subtitle && (
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight">
              {subtitle}
            </h2>
          )}
          {section.cta_text && (
            <div className="pt-3">
              <Button
                size="lg"
                className="text-base font-bold px-8 py-3"
                style={{
                  backgroundColor: section.cta_bg_color || "#6ee7b7",
                  color: section.cta_text_color || "#1a5c3a",
                  borderRadius: section.cta_border_radius ? `${section.cta_border_radius}px` : "25px",
                }}
                asChild
              >
                <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                  {section.cta_text}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CtaBannerSection;
