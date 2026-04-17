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
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAdminOnboarding } from "@/hooks/use-admin-onboarding";

interface TourStep {
  icon: typeof Smartphone;
  title: string;
  highlight: string;
  description: string;
  cta: string;
  route: string;
}

const STEPS: TourStep[] = [
  {
    icon: Smartphone,
    title: "Passo 1 — Cadastre os parâmetros básicos",
    highlight: "Sem marcas, modelos, armazenamento e cores você não consegue cadastrar nenhum aparelho.",
    description:
      "Vá em Produtos e Parâmetros e comece criando suas Marcas, Modelos, Capacidades de Armazenamento e Cores. Só então você poderá cadastrar os aparelhos que aparecerão na calculadora.",
    cta: "Ir para Produtos e Parâmetros",
    route: "/admin/catalogo",
  },
  {
    icon: ListChecks,
    title: "Passo 2 — Monte os critérios de avaliação",
    highlight: "Defina como o desconto será calculado quando o cliente avaliar o aparelho.",
    description:
      "Ainda em Produtos e Parâmetros, abra a aba Critérios de Avaliação. Crie as condições gerais (ex: novo, usado, com avarias) e os defeitos com seus respectivos descontos. É essa estrutura que aparecerá para o cliente na página de venda.",
    cta: "Configurar critérios",
    route: "/admin/catalogo",
  },
  {
    icon: Users,
    title: "Passo 3 — Acompanhe seus clientes",
    highlight: "No menu Clientes você vê todos que iniciaram ou concluíram uma avaliação.",
    description:
      "Clicando em Ver Detalhes você consegue tomar ações comerciais: entrar em contato, acompanhar status e fechar a negociação. Nenhum lead se perde.",
    cta: "Ver Clientes",
    route: "/admin/clientes",
  },
  {
    icon: LayoutDashboard,
    title: "Passo 4 — Acompanhe seu desempenho",
    highlight: "O Dashboard mostra a visão clara do andamento da sua operação.",
    description:
      "Avaliações iniciadas, concluídas, aparelhos mais avaliados e métricas de conversão. Use os filtros para entender o que está convertendo e o que precisa de ajuste.",
    cta: "Abrir Dashboard",
    route: "/admin",
  },
  {
    icon: Layers,
    title: "Passo 5 — Personalize sua Landing Page",
    highlight: "Agora deixe sua página pronta para receber os clientes.",
    description:
      "No menu Seções LP você configura cada bloco da sua landing page: hero banner, benefícios, depoimentos, vídeos, CTA e mais. Capriche no visual — é a sua vitrine. Boas vendas! 🚀",
    cta: "Configurar Landing Page",
    route: "/admin/secoes",
  },
];

export function AdminTour() {
  const navigate = useNavigate();
  const { needsTour, currentStep, setStep, complete, loading } =
    useAdminOnboarding();

  if (loading || !needsTour) return null;

  const stepIndex = Math.min(Math.max(currentStep - 1, 0), STEPS.length - 1);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const Icon = step.icon;

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

  const handleFinish = async () => {
    await complete();
  };

  return (
    <Dialog open={needsTour} onOpenChange={() => { /* tour é obrigatório, não fecha por fora */ }}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Top progress bar */}
        <div className="h-1.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  Tour {stepIndex + 1} de {STEPS.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Bem-vindo(a) ao painel Pollicell
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Pular tour"
              title="Pular tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <DialogHeader className="text-left space-y-3 mb-4">
            <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
              {step.title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-foreground font-medium flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{step.highlight}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-1.5 py-3">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? "w-6 bg-primary"
                    : i < stepIndex
                      ? "w-1.5 bg-primary/60"
                      : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirst}
              className="sm:w-auto w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleNext}
                className="sm:w-auto w-full"
              >
                {isLast ? (
                  <>
                    Concluir tour
                    <PartyPopper className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
              <Button onClick={handleGo} className="sm:w-auto w-full">
                {step.cta}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
