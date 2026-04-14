import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FaqSectionProps {
  section: any;
}

const defaultFaq = [
  { question: "Como funciona o trade-in?", answer: "Você avalia o estado do seu aparelho, recebe uma oferta e pode usar o valor como crédito na nossa loja." },
  { question: "Quais aparelhos são aceitos?", answer: "Aceitamos iPhones de diversas gerações. Confira a lista completa na nossa calculadora." },
  { question: "Em quanto tempo recebo meu crédito?", answer: "Após a verificação presencial do aparelho, o crédito é liberado na hora." },
  { question: "Posso desistir após a avaliação?", answer: "Sim! A avaliação online não é vinculante. Você só confirma na loja." },
];

const FaqSection = ({ section }: FaqSectionProps) => {
  let faqItems = defaultFaq;
  try {
    if (section.content) faqItems = JSON.parse(section.content);
  } catch {}

  return (
    <section style={{ backgroundColor: section.bg_color, color: section.text_color }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">{section.title || "Dúvidas frequentes"}</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqItems.map((item: any, i: number) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium">{item.question}</AccordionTrigger>
              <AccordionContent className="opacity-80">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
