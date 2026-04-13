import { Smartphone, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: allSections } = useQuery({
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

  const hero = allSections?.find((s: any) => s.section_type === "hero");
  const sections = allSections?.filter((s: any) => s.section_type !== "hero") ?? [];

  const { data: videos } = useQuery({
    queryKey: ["lp-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lp_videos")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section — from DB or fallback */}
      <section
        className="relative overflow-hidden"
        style={hero ? { backgroundColor: hero.bg_color, color: hero.text_color } : undefined}
      >
        {!hero && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />}
        {hero?.image_url && (
          <img src={hero.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        )}
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Smartphone className="h-4 w-4" />
            Trade-in Inteligente
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {hero ? hero.title : (
              <>Quanto vale seu <span className="text-primary">iPhone</span>?</>
            )}
          </h1>
          <p className="text-lg mt-4 max-w-xl mx-auto opacity-80">
            {hero?.content || "Descubra o valor do seu aparelho em segundos e ganhe um cupom de desconto exclusivo para usar na nossa loja."}
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/calculadora">
              Avaliar meu aparelho <ArrowDown className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Dynamic Sections from DB */}
      {sections.map((section: any) => (
        <section key={section.id} style={{ backgroundColor: section.bg_color, color: section.text_color }}>
          <div className="max-w-5xl mx-auto px-4 py-16">
            {section.layout === "text-only" ? (
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold">{section.title}</h2>
                {section.content && <p className="mt-4 text-lg opacity-80 whitespace-pre-line">{section.content}</p>}
              </div>
            ) : (
              <div className={`flex flex-col md:flex-row md:items-center md:gap-12 ${section.layout === "image-text" ? "md:flex-row-reverse" : ""}`}>
                <div className="md:flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold">{section.title}</h2>
                  {section.content && <p className="mt-4 text-lg opacity-80 whitespace-pre-line">{section.content}</p>}
                </div>
                {section.image_url && (
                  <div className="mt-6 md:mt-0 md:flex-1">
                    <img src={section.image_url} alt={section.title} className="rounded-xl w-full max-h-80 object-cover" loading="lazy" />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ))}

      {/* Video Section */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">Como funciona o Trade-in?</h2>
          <p className="text-muted-foreground mt-2">Entenda as vantagens de trocar seu aparelho antigo</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {videos && videos.length > 0 ? (
            videos.map((video: any) => (
              <div key={video.id} className="space-y-2">
                <div className="aspect-video rounded-xl overflow-hidden border">
                  <iframe src={video.embed_url} title={video.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
                <h3 className="text-sm font-medium text-foreground">{video.title}</h3>
                {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
              </div>
            ))
          ) : (
            <>
              <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center border">
                <p className="text-muted-foreground text-sm">📹 Vídeo: O que é Trade-in?</p>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center border">
                <p className="text-muted-foreground text-sm">📹 Vídeo: Trade-in vs Compra Nova</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Pollicell. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
