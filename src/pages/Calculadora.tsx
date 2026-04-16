import { TradeInWizard } from "@/components/trade-in/TradeInWizard";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Calculadora = () => {
  return (
    <div className="min-h-screen bg-background antialiased">
      <header className="border-b border-black/5 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <TradeInWizard />
      </main>
    </div>
  );
};

export default Calculadora;
