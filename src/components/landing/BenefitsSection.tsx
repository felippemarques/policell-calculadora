import {
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

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight">{section.title || "Nunca foi tão fácil"}</h2>
        </div>

        {videoUrl && (
          <div className="mb-16">
            <div className="aspect-video rounded-3xl overflow-hidden shadow-sm border border-black/5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card: any, i: number) => (
            <div
              key={i}
              className="bg-card rounded-3xl p-8 shadow-sm border border-black/5 text-center space-y-4 hover:shadow-md transition-shadow duration-300"
            >
              <div
                className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
                style={{ color: card.icon_color || undefined }}
              >
                {iconMap[card.icon] || <span className="font-bold">{i + 1}</span>}
              </div>
              <h3 className="font-semibold text-lg tracking-tight">{card.title}</h3>
              <p className="text-sm opacity-60 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
        <SectionCtaButton section={section} />
      </div>
    </section>
  );
};

export default BenefitsSection;
