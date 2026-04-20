import { RotateCcw, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RestartProposalButtonProps {
  onConfirm: () => void;
  /** Optional handler to fully reset (clears name/email/phone too). */
  onFullReset?: () => void;
  className?: string;
  /** Visual variant — "prominent" makes the button stand out more. */
  prominent?: boolean;
}

/**
 * Botão "Refazer proposta" — reaproveita os dados pessoais (nome, email, telefone)
 * já capturados no início do fluxo e reinicia apenas a partir da escolha do aparelho.
 *
 * Quando `onFullReset` é fornecido, o diálogo também oferece a opção
 * "Começar do zero" (limpa TUDO, inclusive os dados pessoais).
 */
export function RestartProposalButton({
  onConfirm,
  onFullReset,
  className,
  prominent = false,
}: RestartProposalButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={prominent ? "outline" : "ghost"}
          size="sm"
          className={
            prominent
              ? `border-primary/40 text-primary hover:bg-primary/10 hover:text-primary gap-1.5 font-semibold shadow-sm ${className ?? ""}`
              : `text-muted-foreground hover:text-foreground gap-1.5 ${className ?? ""}`
          }
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Refazer proposta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refazer a proposta?</AlertDialogTitle>
          <AlertDialogDescription>
            Vamos reiniciar a partir da escolha do tipo de negociação (troca ou venda).
            Seus dados de contato (nome, e-mail e telefone) serão mantidos para você
            não precisar digitar de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="sm:mr-auto">Cancelar</AlertDialogCancel>
          {onFullReset && (
            <AlertDialogAction
              onClick={onFullReset}
              className="bg-muted text-foreground hover:bg-muted/80 gap-1.5"
            >
              <Eraser className="h-3.5 w-3.5" /> Começar do zero
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={onConfirm} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Sim, refazer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
