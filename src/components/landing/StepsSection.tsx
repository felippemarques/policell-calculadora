import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight,
  Smartphone, ClipboardCheck, CreditCard, Gift, Shield, Zap, ThumbsUp, Banknote,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles,
  Star, Mail, Phone, MapPin, ShoppingCart, Truck, Camera, Wifi, Settings, Package,
  Send, Bell, Calendar, FileText, Home, Search, Play, Headphones, Monitor, Wrench, Lightbulb
} from "lucide-react";
import SectionCtaButton from "./SectionCtaButton";

interface StepsSectionProps {
  section: any;
}

const defaultSteps = [
  { icon: "smartphone", title: "Escolha seu aparelho", description: "Selecione o modelo e armazenamento do seu dispositivo." },
  { icon: "clipboard", title: "Avalie o estado", description: "Responda algumas perguntas sobre a condição do aparelho." },
  { icon: "credit-card", title: "Receba a oferta", description: "Veja o valor estimado e ganhe um cupom exclusivo." },
  { icon: "gift", title: "Finalize na loja", description: "Use o cupom na nossa loja e aproveite o desconto." },
];

const iconMap: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-8 w-8" />,
  clipboard: <ClipboardCheck className="h-8 w-8" />,
  "credit-card": <CreditCard className="h-8 w-8" />,
  gift: <Gift className="h-8 w-8" />,
  shield: <Shield className="h-8 w-8" />,
  zap: <Zap className="h-8 w-8" />,
  "thumbs-up": <ThumbsUp className="h-8 w-8" />,
  banknote: <Banknote className="h-8 w-8" />,
  heart: <Heart className="h-8 w-8" />,
  award: <Award className="h-8 w-8" />,
  clock: <Clock className="h-8 w-8" />,
  "check-circle": <CheckCircle className="h-8 w-8" />,
  rocket: <Rocket className="h-8 w-8" />,
  target: <Target className="h-8 w-8" />,
  users: <Users className="h-8 w-8" />,
  globe: <Globe className="h-8 w-8" />,
  lock: <Lock className="h-8 w-8" />,
  sparkles: <Sparkles className="h-8 w-8" />,
  star: <Star className="h-8 w-8" />,
  mail: <Mail className="h-8 w-8" />,
  phone: <Phone className="h-8 w-8" />,
  "map-pin": <MapPin className="h-8 w-8" />,
  "shopping-cart": <ShoppingCart className="h-8 w-8" />,
  truck: <Truck className="h-8 w-8" />,
  camera: <Camera className="h-8 w-8" />,
  wifi: <Wifi className="h-8 w-8" />,
  settings: <Settings className="h-8 w-8" />,
  package: <Package className="h-8 w-8" />,
  send: <Send className="h-8 w-8" />,
  bell: <Bell className="h-8 w-8" />,
  calendar: <Calendar className="h-8 w-8" />,
  "file-text": <FileText className="h-8 w-8" />,
  home: <Home className="h-8 w-8" />,
  search: <Search className="h-8 w-8" />,
  play: <Play className="h-8 w-8" />,
  headphones: <Headphones className="h-8 w-8" />,
  monitor: <Monitor className="h-8 w-8" />,
  wrench: <Wrench className="h-8 w-8" />,
  lightbulb: <Lightbulb className="h-8 w-8" />,
};

function StepCard({ step, index }: { step: any; index: number }) {
  return (
    <div className="bg-card rounded-3xl p-6 md:p-8 shadow-sm border border-black/5 text-center space-y-4 hover:shadow-md transition-shadow duration-300">
      <div
        className="mx-auto w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        style={{ color: step.icon_color || undefined }}
      >
        {iconMap[step.icon] || <span className="text-2xl font-bold">{index + 1}</span>}
      </div>
      <h3 className="font-semibold text-base md:text-lg tracking-tight">{step.title}</h3>
      <p className="text-sm opacity-60 leading-relaxed">{step.description}</p>
    </div>
  );
}

const CAROUSEL_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  4: "grid-cols-4",
};

const StepsSection = ({ section }: StepsSectionProps) => {
  let steps = defaultSteps;
  try {
    if (section.content) steps = JSON.parse(section.content);
  } catch {}

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
        setItemsPerPage(mode === 'grid' ? steps.length : 1);
      } else if (w < 1024) {
        const mode = layoutData.tablet_layout || 'grid';
        setIsGridMode(mode === 'grid');
        setItemsPerPage(mode === 'grid' ? steps.length : 2);
      } else {
        const mode = layoutData.desktop_layout || 'grid';
        setIsGridMode(mode === 'grid');
        setItemsPerPage(mode === 'grid' ? steps.length : 4);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [layoutData.mobile_layout, layoutData.tablet_layout, layoutData.desktop_layout, steps.length]);

  const maxIndex = Math.max(0, steps.length - itemsPerPage);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (isGridMode || steps.length <= itemsPerPage) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, steps.length, itemsPerPage, isGridMode]);

  const visibleItems = steps.slice(currentIndex, currentIndex + itemsPerPage);
  if (visibleItems.length < itemsPerPage) {
    visibleItems.push(...steps.slice(0, itemsPerPage - visibleItems.length));
  }

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-32">
        <div className="text-center mb-10 md:mb-16 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-5xl font-semibold tracking-tight leading-tight">{section.title || "Como funciona"}</h2>
        </div>

        {isGridMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {steps.map((step: any, i: number) => (
              <StepCard key={i} step={step} index={i} />
            ))}
          </div>
        ) : (
          <div className="relative">
            {steps.length > itemsPerPage && (
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
              {visibleItems.map((step: any, i: number) => (
                <StepCard key={`${currentIndex}-${i}`} step={step} index={currentIndex + i} />
              ))}
            </div>

            {steps.length > itemsPerPage && (
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

export default StepsSection;
