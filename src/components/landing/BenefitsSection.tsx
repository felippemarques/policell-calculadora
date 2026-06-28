import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight,
  Shield, Zap, ThumbsUp, Banknote, Smartphone, ClipboardCheck, CreditCard, Gift,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles,
  Star, Mail, Phone, MapPin, ShoppingCart, Truck, Camera, Wifi, Settings, Package,
  Send, Bell, Calendar, FileText, Home, Search, Play, Headphones, Monitor, Wrench, Lightbulb
} from "lucide-react";
import SectionCtaButton from "./SectionCtaButton";

interface BenefitsSectionProps {
  section: any;
}

const defaultCards = [
  { icon: "shield", title: "Segurança", description: "Processo 100% seguro e transparente." },
  { icon: "zap", title: "Rapidez", description: "Avaliação em menos de 2 minutos." },
  { icon: "thumbs-up", title: "Facilidade", description: "Sem burocracia, tudo online." },
  { icon: "banknote", title: "Melhor valor", description: "Ofertas justas baseadas no mercado." },
];

const iconMap: Record<string, React.ReactNode> = {
  shield: <Shield className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  "thumbs-up": <ThumbsUp className="h-6 w-6" />,
  banknote: <Banknote className="h-6 w-6" />,
  smartphone: <Smartphone className="h-6 w-6" />,
  clipboard: <ClipboardCheck className="h-6 w-6" />,
  "credit-card": <CreditCard className="h-6 w-6" />,
  gift: <Gift className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  award: <Award className="h-6 w-6" />,
  clock: <Clock className="h-6 w-6" />,
  "check-circle": <CheckCircle className="h-6 w-6" />,
  rocket: <Rocket className="h-6 w-6" />,
  target: <Target className="h-6 w-6" />,
  users: <Users className="h-6 w-6" />,
  globe: <Globe className="h-6 w-6" />,
  lock: <Lock className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
  mail: <Mail className="h-6 w-6" />,
  phone: <Phone className="h-6 w-6" />,
  "map-pin": <MapPin className="h-6 w-6" />,
  "shopping-cart": <ShoppingCart className="h-6 w-6" />,
  truck: <Truck className="h-6 w-6" />,
  camera: <Camera className="h-6 w-6" />,
  wifi: <Wifi className="h-6 w-6" />,
  settings: <Settings className="h-6 w-6" />,
  package: <Package className="h-6 w-6" />,
  send: <Send className="h-6 w-6" />,
  bell: <Bell className="h-6 w-6" />,
  calendar: <Calendar className="h-6 w-6" />,
  "file-text": <FileText className="h-6 w-6" />,
  home: <Home className="h-6 w-6" />,
  search: <Search className="h-6 w-6" />,
  play: <Play className="h-6 w-6" />,
  headphones: <Headphones className="h-6 w-6" />,
  monitor: <Monitor className="h-6 w-6" />,
  wrench: <Wrench className="h-6 w-6" />,
  lightbulb: <Lightbulb className="h-6 w-6" />,
};

function BenefitCard({ card, index }: { card: any; index: number }) {
  return (
    <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-black/5 text-center space-y-4 hover:shadow-md transition-shadow duration-300">
      <div
        className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
        style={{ color: card.icon_color || undefined }}
      >
        {iconMap[card.icon] || <span className="font-bold">{index + 1}</span>}
      </div>
      <h3 className="font-semibold text-base md:text-lg tracking-tight">{card.title}</h3>
      <p className="text-sm opacity-60 leading-relaxed">{card.description}</p>
    </div>
  );
}

const CAROUSEL_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  4: "grid-cols-4",
};

const BenefitsSection = ({ section }: BenefitsSectionProps) => {
  let cards = defaultCards;
  try {
    if (section.content) cards = JSON.parse(section.content);
  } catch {}

  const videoUrl = section.video_url;

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("embed")) return url;
    const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const layoutData = (() => {
    try { return section.layout ? JSON.parse(section.layout) : {}; } catch { return {}; }
  })();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [isGridMode, setIsGridMode] = useState(true);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 640) {
        const mode = layoutData.mobile_layout || 'grid';
        setIsGridMode(mode === 'grid');
        setItemsPerPage(mode === 'grid' ? cards.length : 1);
      } else if (w < 1024) {
        const mode = layoutData.tablet_layout || 'grid';
        setIsGridMode(mode === 'grid');
        setItemsPerPage(mode === 'grid' ? cards.length : 2);
      } else {
        const mode = layoutData.desktop_layout || 'grid';
        setIsGridMode(mode === 'grid');
        setItemsPerPage(mode === 'grid' ? cards.length : 4);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [layoutData.mobile_layout, layoutData.tablet_layout, layoutData.desktop_layout, cards.length]);

  const maxIndex = Math.max(0, cards.length - itemsPerPage);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (isGridMode || cards.length <= itemsPerPage) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, cards.length, itemsPerPage, isGridMode]);

  const visibleItems = cards.slice(currentIndex, currentIndex + itemsPerPage);
  if (visibleItems.length < itemsPerPage) {
    visibleItems.push(...cards.slice(0, itemsPerPage - visibleItems.length));
  }

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-32">
        <div className="text-center mb-10 md:mb-16 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-5xl font-semibold tracking-tight leading-tight">{section.title || "Nunca foi tão fácil"}</h2>
        </div>

        {videoUrl && (
          <div className="mb-10 md:mb-16">
            <div className="aspect-video rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-black/5">
              <iframe
                src={getEmbedUrl(videoUrl)}
                title="Vídeo"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {isGridMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {cards.map((card: any, i: number) => (
              <BenefitCard key={i} card={card} index={i} />
            ))}
          </div>
        ) : (
          <div className="relative">
            {cards.length > itemsPerPage && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-0 md:-left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-colors"
                  style={{ color: section.text_color }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-0 md:-right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-colors"
                  style={{ color: section.text_color }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className={`grid ${CAROUSEL_GRID[itemsPerPage] || "grid-cols-1"} gap-4 md:gap-6 px-2 md:px-4`}>
              {visibleItems.map((card: any, i: number) => (
                <BenefitCard key={`${currentIndex}-${i}`} card={card} index={currentIndex + i} />
              ))}
            </div>

            {cards.length > itemsPerPage && (
              <div className="flex justify-center gap-1.5 mt-6">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIndex ? "bg-primary w-6" : "bg-primary/20"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <SectionCtaButton section={section} />
      </div>
    </section>
  );
};

export default BenefitsSection;
