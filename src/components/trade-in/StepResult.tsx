import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Copy, ShoppingCart, Clock, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  result: { finalValue: number; couponCode: string };
  onReset: () => void;
}

export function StepResult({ result, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result.couponCode);
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const storeUrl = "https://pollicell.com.br"; // TODO: configurar

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mx-auto">
            <Check className="h-8 w-8 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor estimado do seu aparelho:</p>
            <p className="text-4xl font-bold text-foreground mt-1">
              R$ {result.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border">
            <p className="text-xs text-muted-foreground mb-1">Seu cupom de desconto:</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono font-bold text-primary tracking-wider">
                {result.couponCode}
              </code>
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={() => {
            copyToClipboard();
            window.open(storeUrl, "_blank");
          }}
        >
          <ShoppingCart className="mr-2 h-4 w-4" /> Comprar Agora
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // TODO: webhook N8N
            toast.success("Solicitação enviada! Entraremos em contato em breve.");
          }}
        >
          <Clock className="mr-2 h-4 w-4" /> Aguardar Contato
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // TODO: webhook N8N
            toast.success("Um especialista entrará em contato agora!");
          }}
        >
          <MessageCircle className="mr-2 h-4 w-4" /> Falar com Especialista
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="mr-2 h-3 w-3" /> Nova avaliação
        </Button>
      </div>
    </div>
  );
}
