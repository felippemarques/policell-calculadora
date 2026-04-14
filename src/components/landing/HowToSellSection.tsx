interface HowToSellSectionProps {
  section: any;
}

const defaultItems = [
  { title: "Avaliação rápida", description: "Em poucos minutos você sabe quanto vale seu aparelho." },
  { title: "Sem burocracia", description: "Processo simples e direto, sem complicação." },
  { title: "Pagamento seguro", description: "Receba o valor diretamente ou como crédito na loja." },
];

const HowToSellSection = ({ section }: HowToSellSectionProps) => {
  let items = defaultItems;
  try {
    if (section.content) items = JSON.parse(section.content);
  } catch {}

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center md:gap-12">
          <div className="md:flex-1">
            <h2 className="text-2xl md:text-3xl font-bold">{section.title || "Saiba como vender"}</h2>
            <div className="mt-6 space-y-4">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm opacity-70 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {section.image_url && (
            <div className="mt-8 md:mt-0 md:flex-1">
              <img src={section.image_url} alt={section.title} className="rounded-xl w-full max-h-96 object-cover" loading="lazy" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HowToSellSection;
