import { useNavigate } from "react-router-dom";

interface SectionCtaButtonProps {
  section: {
    cta_text?: string | null;
    cta_bg_color?: string | null;
    cta_text_color?: string | null;
    cta_border_radius?: number | null;
    layout?: string | null;
  };
}

const SectionCtaButton = ({ section }: SectionCtaButtonProps) => {
  const navigate = useNavigate();

  if (!section.cta_text) return null;

  const layoutData = (() => {
    try { return section.layout ? JSON.parse(section.layout) : {}; } catch { return {}; }
  })();

  const marginTop    = typeof layoutData.cta_margin_top    === "number" ? layoutData.cta_margin_top    : 32;
  const marginBottom = typeof layoutData.cta_margin_bottom === "number" ? layoutData.cta_margin_bottom : 0;
  const marginLeft   = typeof layoutData.cta_margin_left   === "number" ? layoutData.cta_margin_left   : 0;
  const marginRight  = typeof layoutData.cta_margin_right  === "number" ? layoutData.cta_margin_right  : 0;

  return (
    <div
      className="flex justify-center"
      style={{
        marginTop:    `${marginTop}px`,
        marginBottom: `${marginBottom}px`,
        marginLeft:   `${marginLeft}px`,
        marginRight:  `${marginRight}px`,
      }}
    >
      <button
        onClick={() => navigate("/calculadora")}
        className="px-8 py-3 font-semibold text-base transition-transform hover:scale-105 active:scale-95 shadow-lg"
        style={{
          backgroundColor: section.cta_bg_color || "#f97316",
          color: section.cta_text_color || "#ffffff",
          borderRadius: `${section.cta_border_radius ?? 8}px`,
        }}
      >
        {section.cta_text}
      </button>
    </div>
  );
};

export default SectionCtaButton;
