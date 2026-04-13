import { Smartphone, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Smartphone className="h-4 w-4" />
            Trade-in Inteligente
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Quanto vale seu{" "}
            <span className="text-primary">iPhone</span>?
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            Descubra o valor do seu aparelho em segundos e ganhe um cupom de desconto exclusivo para usar na nossa loja.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/calculadora">
              Avaliar meu aparelho <ArrowDown className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Video Section */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground">Como funciona o Trade-in?</h2>
          <p className="text-muted-foreground mt-2">
            Entenda as vantagens de trocar seu aparelho antigo
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center border">
            <p className="text-muted-foreground text-sm">📹 Vídeo: O que é Trade-in?</p>
          </div>
          <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center border">
            <p className="text-muted-foreground text-sm">📹 Vídeo: Trade-in vs Compra Nova</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Pollicell. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
