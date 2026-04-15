import { Phone, Mail, Instagram, Facebook } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/landing/HeroSection";
import StepsSection from "@/components/landing/StepsSection";
import HowToSellSection from "@/components/landing/HowToSellSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FaqSection from "@/components/landing/FaqSection";
import MegaFooterSection from "@/components/landing/MegaFooterSection";
import FooterSection from "@/components/landing/FooterSection";
import CtaBannerSection from "@/components/landing/CtaBannerSection";
import VideoSection from "@/components/landing/VideoSection";

const sectionComponents: Record<string, React.ComponentType<any>> = {
  hero: HeroSection,
  steps: StepsSection,
  "how-to-sell": HowToSellSection,
  benefits: BenefitsSection,
  testimonials: TestimonialsSection,
  faq: FaqSection,
  "mega-footer": MegaFooterSection,
  footer: FooterSection,
  "cta-banner": CtaBannerSection,
  video: VideoSection,
};

const Index = () => {
  const { data: sections } = useQuery({
    queryKey: ["lp-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_sections")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

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

  const hasSocials = settings.instagram || settings.facebook || settings.tiktok || settings.whatsapp;
  const hasContact = settings.phone || settings.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Configurable Header */}
      <header
        className={`border-b ${settings.header_fixed === "true" ? "sticky top-0 z-50" : ""}`}
        style={{ backgroundColor: settings.header_bg_color || undefined, color: settings.header_text_color || undefined }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-8 max-w-[140px] object-contain" />
            ) : (
              <span className="text-lg font-bold">Pollicell</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            {hasContact && (
              <div className="hidden md:flex items-center gap-4">
                {settings.phone && (
                  <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    <Phone className="h-3.5 w-3.5" /> {settings.phone}
                  </a>
                )}
                {settings.email && (
                  <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    <Mail className="h-3.5 w-3.5" /> {settings.email}
                  </a>
                )}
              </div>
            )}
            {hasSocials && (
              <div className="flex items-center gap-2">
                {settings.instagram && (
                  <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {settings.facebook && (
                  <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {settings.whatsapp && (
                  <a href={settings.whatsapp} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
                {settings.tiktok && (
                  <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.71a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.14z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Render fixed sections */}
      {sections?.map((section: any) => {
        const Component = sectionComponents[section.section_type];
        if (!Component) return null;
        const extraProps = section.section_type === "mega-footer" ? { settings } : {};
        return <Component key={section.id} section={section} {...extraProps} />;
      })}
    </div>
  );
};

export default Index;
