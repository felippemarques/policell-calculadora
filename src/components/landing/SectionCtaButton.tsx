import { useNavigate } from "react-router-dom";

interface SectionCtaButtonProps {
  section: {
    cta_text?: string | null;
    cta_bg_color?: string | null;
    cta_text_color?: string | null;
    cta_border_radius?: number | null;
  };
}

const SectionCtaButton = ({ section }: SectionCtaButtonProps) => {
  const navigate = useNavigate();

  if (!section.cta_text) return null;

  return (
    <div className="flex justify-center mt-8">
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
