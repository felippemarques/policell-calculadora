import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FooterSectionProps {
  section: any;
}

const FooterSection = ({ section }: FooterSectionProps) => {
  const { data: settingsRaw } = useQuery({
    queryKey: ["lp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lp_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  const settings: Record<string, string> = {};
  settingsRaw?.forEach((s: any) => { settings[s.key] = s.value; });

  const bgColor = section.bg_color || settings.footer_bg_color || undefined;
  const textColor = section.text_color || settings.footer_text_color || undefined;

  return (
    <footer style={{ backgroundColor: bgColor, color: textColor }} className="border-t border-black/5">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-7 max-w-[120px] object-contain opacity-80" />
          ) : (
            <span className="font-semibold tracking-tight">Pollicell</span>
          )}
        </div>
        <p className="opacity-60 text-center">
          {section.content || `© ${new Date().getFullYear()} Pollicell. Todos os direitos reservados.`}
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;
