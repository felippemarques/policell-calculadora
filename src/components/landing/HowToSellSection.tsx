import {
  Smartphone, ClipboardCheck, CreditCard, Gift, Shield, Zap, ThumbsUp, Banknote,
  Heart, Award, Clock, CheckCircle, Rocket, Target, Users, Globe, Lock, Sparkles
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
};

interface HowToSellSectionProps {
  section: any;
}

const defaultCards = [
  {
    title: "VENDA AGORA",
    subtitle: "Ideal para quem quer vender rápido e com praticidade.",
    items: [
      { icon: "check-circle", text: "Avaliação imediata após envio das informações" },
      { icon: "check-circle", text: "Pagamento em até 10 dias corridos" },
      { icon: "check-circle", text: "Aceitamos aparelhos em qualquer condição" },
    ],
  },
  {
    title: "VENDA MAIS VALOR",
    subtitle: "Para modelos elegíveis, com potencial de valor mais alto.",
    items: [
      { icon: "check-circle", text: "Receba até 20% a mais pelo seu aparelho" },
      { icon: "check-circle", text: "Venda com reparo e revenda garantidos" },
      { icon: "check-circle", text: "Pós-venda com garantia" },
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
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          {section.title || "Saiba como vender"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cards.map((card: any, cardIdx: number) => (
            <div
              key={cardIdx}
              className="rounded-2xl border bg-white/80 backdrop-blur-sm p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg md:text-xl font-extrabold text-orange-500 tracking-wide">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-xs md:text-sm font-semibold mt-1 opacity-75 uppercase tracking-wide">
                    {card.subtitle}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {card.items?.map((item: any, i: number) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-orange-500 flex-shrink-0 mt-0.5">
                      {iconMap[item.icon] || <CheckCircle className="h-5 w-5" />}
                    </span>
                    <p className="text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToSellSection;
