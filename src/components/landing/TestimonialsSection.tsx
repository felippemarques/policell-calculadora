import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TestimonialsSectionProps {
  section: any;
}

const defaultTestimonials = [
  { name: "Maria S.", role: "Proprietária", company: "Tech Store", text: "Processo super rápido e recebi um valor justo pelo meu iPhone antigo!", photo: "", category: "Eletrônicos • Loja física" },
  { name: "João P.", role: "Gerente", company: "Cell Shop", text: "Adorei a facilidade. Fiz tudo pelo celular em menos de 5 minutos.", photo: "", category: "Celulares • E-commerce" },
  { name: "Ana L.", role: "Proprietária", company: "Mobile Center", text: "Recomendo! Consegui um ótimo desconto para comprar meu novo aparelho.", photo: "", category: "Assistência • Loja física" },
  { name: "Carlos R.", role: "Coordenador", company: "Digital Phones", text: "Ótimo serviço. A avaliação foi transparente e o pagamento rápido.", photo: "", category: "Eletrônicos • Marketplace" },
];

const TestimonialsSection = ({ section }: TestimonialsSectionProps) => {
  let testimonials = defaultTestimonials;
  try {
    if (section.content) {
      const parsed = JSON.parse(section.content);
      if (parsed.length > 0) testimonials = parsed;
    }
  } catch {}

  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 4;
  const maxIndex = Math.max(0, testimonials.length - itemsPerPage);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-play
  useEffect(() => {
    if (testimonials.length <= itemsPerPage) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, testimonials.length, itemsPerPage]);

  const visibleItems = testimonials.slice(currentIndex, currentIndex + itemsPerPage);
  // Handle wrap-around
  if (visibleItems.length < itemsPerPage) {
    visibleItems.push(...testimonials.slice(0, itemsPerPage - visibleItems.length));
  }

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">{section.title || "O que nossos clientes dizem"}</h2>
        </div>

        <div className="relative">
          {testimonials.length > itemsPerPage && (
            <>
              <button
                onClick={prev}
                className="absolute -left-2 md:-left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-colors"
                style={{ color: section.text_color }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={next}
                className="absolute -right-2 md:-right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-colors"
                style={{ color: section.text_color }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 px-4">
            {visibleItems.map((t: any, i: number) => (
              <div
                key={`${currentIndex}-${i}`}
                className="rounded-xl border bg-background/50 backdrop-blur-sm p-6 flex flex-col justify-between space-y-4 transition-all duration-300"
              >
                {/* Quote icon */}
                <div>
                  <div className="text-primary/30 text-3xl font-serif leading-none mb-3">"</div>
                  <p className="text-sm leading-relaxed opacity-80">{t.text}</p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Author info */}
                  <div className="flex items-center gap-3">
                    {t.photo ? (
                      <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                        {t.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs opacity-60">
                        {[t.company, t.role].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>

                  {/* Category tag */}
                  {t.category && (
                    <div className="border-t pt-2">
                      <p className="text-xs opacity-50">{t.category}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dots indicator */}
          {testimonials.length > itemsPerPage && (
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
      </div>
    </section>
  );
};

export default TestimonialsSection;
