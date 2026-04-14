import { Star } from "lucide-react";

interface TestimonialsSectionProps {
  section: any;
}

const defaultTestimonials = [
  { name: "Maria S.", city: "São Paulo", text: "Processo super rápido e recebi um valor justo pelo meu iPhone antigo!", photo: "" },
  { name: "João P.", city: "Rio de Janeiro", text: "Adorei a facilidade. Fiz tudo pelo celular em menos de 5 minutos.", photo: "" },
  { name: "Ana L.", city: "Belo Horizonte", text: "Recomendo! Consegui um ótimo desconto para comprar meu novo aparelho.", photo: "" },
];

const TestimonialsSection = ({ section }: TestimonialsSectionProps) => {
  let testimonials = defaultTestimonials;
  try {
    if (section.content) testimonials = JSON.parse(section.content);
  } catch {}

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">{section.title || "O que nossos clientes dizem"}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t: any, i: number) => (
            <div key={i} className="bg-background/50 backdrop-blur-sm rounded-xl p-6 border space-y-4">
              <div className="flex gap-1 text-yellow-500">
                {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-sm opacity-80 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {t.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  {t.city && <p className="text-xs opacity-60">{t.city}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
