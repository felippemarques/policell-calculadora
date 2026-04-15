import {
  Smartphone, ClipboardCheck, CreditCard, Gift, Shield, Zap, ThumbsUp, Banknote,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles,
  Star, Mail, Phone, MapPin, ShoppingCart, Truck, Camera, Wifi, Settings, Package,
  Send, Bell, Calendar, FileText, Home, Search, Play, Headphones, Monitor, Wrench, Lightbulb
} from "lucide-react";

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

const StepsSection = ({ section }: StepsSectionProps) => {
  let steps = defaultSteps;
  try {
    if (section.content) steps = JSON.parse(section.content);
  } catch {}

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">{section.title || "Como funciona"}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step: any, i: number) => (
            <div key={i} className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center" style={{ color: step.icon_color || undefined }}>
                {iconMap[step.icon] || <span className="text-2xl font-bold">{i + 1}</span>}
              </div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-sm opacity-70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
