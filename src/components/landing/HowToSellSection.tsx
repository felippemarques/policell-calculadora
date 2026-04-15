import {
  Smartphone, ClipboardCheck, CreditCard, Gift, Shield, Zap, ThumbsUp, Banknote,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles,
  Star, Mail, Phone, MapPin, ShoppingCart, Truck, Camera, Wifi, Settings, Package,
  Send, Bell, Calendar, FileText, Home, Search, Play, Headphones, Monitor, Wrench, Lightbulb
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-5 w-5" />,
  clipboard: <ClipboardCheck className="h-5 w-5" />,
  "credit-card": <CreditCard className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  "thumbs-up": <ThumbsUp className="h-5 w-5" />,
  banknote: <Banknote className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  "check-circle": <CheckCircle className="h-5 w-5" />,
  rocket: <Rocket className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  lock: <Lock className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  mail: <Mail className="h-5 w-5" />,
  phone: <Phone className="h-5 w-5" />,
  "map-pin": <MapPin className="h-5 w-5" />,
  "shopping-cart": <ShoppingCart className="h-5 w-5" />,
  truck: <Truck className="h-5 w-5" />,
  camera: <Camera className="h-5 w-5" />,
  wifi: <Wifi className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  send: <Send className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  "file-text": <FileText className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  play: <Play className="h-5 w-5" />,
  headphones: <Headphones className="h-5 w-5" />,
  monitor: <Monitor className="h-5 w-5" />,
  wrench: <Wrench className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
};

interface HowToSellSectionProps {
  section: any;
}

const defaultCards = [
  {
    title: "Concorrente",
    subtitle: "COMO FAZEM:",
    items: [
      { icon: "lock", text: "Demoram te atender" },
      { icon: "lock", text: "Não valorizam seu aparelho" },
      { icon: "lock", text: "Não emitem laudo homologado" },
    ],
  },
  {
    title: "Policell",
    subtitle: "COMO FAZEMOS:",
    items: [
      { icon: "check-circle", text: "Te atendemos em até 10 min" },
      { icon: "check-circle", text: "Valorizamos seu bem" },
      { icon: "check-circle", text: "Emitimos laudo e certificado" },
    ],
  },
];

const HowToSellSection = ({ section }: HowToSellSectionProps) => {
  let cards = defaultCards;
  try {
    if (section.content) {
      const parsed = JSON.parse(section.content);
      if (parsed.cards && parsed.cards.length > 0) cards = parsed.cards;
    }
  } catch {}

  return (
    <section style={{ backgroundColor: section.bg_color || "#f8f9fa", color: section.text_color || "#1a1a1a" }}>
      <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          {section.title || "Saiba como vender"}
        </h2>

        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
            {cards.map((card: any, cardIdx: number) => (
              <div
                key={cardIdx}
                className="rounded-2xl bg-white p-8 md:p-10 shadow-md border border-gray-100"
              >
                <div className="text-center mb-8">
                  <h3 className="text-xl md:text-2xl font-extrabold text-orange-500 tracking-wide">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="text-xs md:text-sm font-bold mt-2 text-gray-700 uppercase tracking-widest">
                      {card.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-5">
                  {card.items?.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 items-center">
                      <span className="text-orange-500 flex-shrink-0">
                        {iconMap[item.icon] || <CheckCircle className="h-5 w-5" />}
                      </span>
                      <p className="text-sm md:text-base leading-relaxed font-medium text-gray-800">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowToSellSection;
