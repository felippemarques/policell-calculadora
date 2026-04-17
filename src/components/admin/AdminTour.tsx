import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smartphone,
  ListChecks,
  Users,
  LayoutDashboard,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  PartyPopper,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAdminOnboarding } from "@/hooks/use-admin-onboarding";

interface TourStep {
  icon: typeof Smartphone;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  cta: string;
  route: string;
  accent: string; // tailwind gradient class
}

const STEPS: TourStep[] = [
  {
    icon: Smartphone,
    badge: "Catálogo base",
    title: "Cadastre os parâmetros básicos",
    highlight:
      "Sem marcas, modelos, armazenamento e cores você não consegue cadastrar nenhum aparelho.",
    description:
      "Vá em Produtos e Parâmetros e cadastre Marcas, Modelos, Capacidades de Armazenamento e Cores. Só então você poderá criar os aparelhos que aparecerão na calculadora.",
    cta: "Ir para Produtos e Parâmetros",
    route: "/admin/catalogo",
    accent: "from-violet-500 to-indigo-600",
  },
  {
    icon: ListChecks,
    badge: "Regras de preço",
    title: "Monte os critérios de avaliação",
    highlight:
      "Defina como o desconto é calculado quando o cliente avalia o aparelho.",
    description:
      "Ainda em Produtos e Parâmetros, abra a aba Critérios de Avaliação. Crie as condições gerais (novo, usado, com avarias) e os defeitos com seus respectivos descontos. Essa estrutura é o que o cliente vê na página de venda.",
    cta: "Configurar critérios",
    route: "/admin/catalogo",
    accent: "from-sky-500 to-cyan-600",
  },
  {
    icon: Users,
    badge: "Funil de vendas",
    title: "Acompanhe seus clientes",
    highlight:
      "No menu Clientes você vê todos que iniciaram ou concluíram uma avaliação.",
    description:
      "Em Ver Detalhes você consegue tomar ações comerciais: entrar em contato, acompanhar status e fechar a negociação. Nenhum lead se perde.",
    cta: "Abrir Clientes",
    route: "/admin/clientes",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    icon: LayoutDashboard,
    badge: "Performance",
    title: "Acompanhe seu desempenho",
    highlight:
      "O Dashboard mostra a visão clara do andamento da sua operação.",
    description:
      "Avaliações iniciadas, concluídas, aparelhos mais avaliados e métricas de conversão. Use os filtros para entender o que está convertendo e o que precisa de ajuste.",
    cta: "Abrir Dashboard",
    route: "/admin",
    accent: "from-amber-500 to-orange-600",
  },
  {
    icon: Layers,
    badge: "Sua vitrine",
    title: "Personalize sua Landing Page",
    highlight: "Agora deixe sua página pronta para receber os clientes.",
    description:
      "Em Seções LP você configura cada bloco da landing: hero banner, benefícios, depoimentos, vídeos, CTA e mais. Capriche no visual — é a sua vitrine. Boas vendas! 🚀",
    cta: "Configurar Landing Page",
    route: "/admin/secoes",
    accent: "from-rose-500 to-pink-600",
  },
];

export function AdminTour() {
  const navigate = useNavigate();
  const { needsTour, currentStep, setStep, complete, skip, loading } =
    useAdminOnboarding();
  const [dismissed, setDismissed] = useState(false);

  // Reabre o tour automaticamente quando outro componente disparar restart
  useEffect(() => {
    const handler = () => setDismissed(false);
    window.addEventListener("admin-onboarding:restart", handler);
    return () => window.removeEventListener("admin-onboarding:restart", handler);
  }, []);

  if (loading || !needsTour || dismissed) return null;

  const stepIndex = Math.min(Math.max(currentStep - 1, 0), STEPS.length - 1);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const Icon = step.icon;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const handleNext = async () => {
    if (isLast) {
      await complete();
      navigate(step.route);
      return;
    }
    await setStep(stepIndex + 2);
  };

  const handleBack = async () => {
    if (isFirst) return;
    await setStep(stepIndex);
  };

  const handleGo = async () => {
    navigate(step.route);
    if (isLast) {
      await complete();
    } else {
      await setStep(stepIndex + 2);
    }
  };

  // X → apenas fecha nesta sessão; volta a aparecer na próxima visita
  const handleClose = () => {
    setDismissed(true);
  };

  // "Não quero ver mais" → marca como skipped permanentemente
  const handleNeverShow = async () => {
    await skip();
  };

  return (
    <Dialog open={needsTour} onOpenChange={() => { /* tour é obrigatório */ }}>
      <DialogContent
        className="max-w-[640px] w-[calc(100vw-2rem)] p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-3xl [&>button]:hidden bg-card"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* ── Header colorido com gradient do passo ── */}
        <div
          className={`relative bg-gradient-to-br ${step.accent} px-7 sm:px-9 pt-7 pb-16`}
        >
          {/* close button (apenas oculta nesta sessão) */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white/90 hover:text-white transition-colors backdrop-blur-sm"
            aria-label="Fechar tour"
            title="Fechar (volta a aparecer depois)"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 mb-5">
            <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/95">
              Tour guiado · {stepIndex + 1} de {STEPS.length}
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 ring-1 ring-white/25 shadow-lg">
              <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 pt-1">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-white/80 mb-1.5">
                {step.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight">
                {step.title}
              </h2>
            </div>
          </div>

          {/* progress bar grudada na base do header */}
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/20">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-7 sm:px-9 pt-7 pb-6 space-y-5">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {step.highlight}
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 pt-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "h-2 w-8 bg-primary"
                    : i < stepIndex
                      ? "h-2 w-2 bg-primary/70"
                      : "h-2 w-2 bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Footer com ações ── */}
        <div className="border-t border-border/60 bg-muted/30 px-7 sm:px-9 py-4 space-y-3">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirst}
              className="sm:w-auto w-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>

            <div className="flex flex-col sm:flex-row gap-2">
              {!isLast && (
                <Button
                  variant="outline"
                  onClick={handleNext}
                  className="sm:w-auto w-full"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              )}
              <Button
                onClick={handleGo}
                className="sm:w-auto w-full shadow-md hover:shadow-lg transition-shadow"
              >
                {isLast ? (
                  <>
                    {step.cta}
                    <PartyPopper className="h-4 w-4 ml-1.5" />
                  </>
                ) : (
                  <>
                    {step.cta}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleNeverShow}
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4 transition-colors"
            >
              Não quero ver o tour novamente
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
