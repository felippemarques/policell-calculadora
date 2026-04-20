import { RotateCcw } from "lucide-react";
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
  className?: string;
}

/**
 * Botão "Refazer proposta" — reaproveita os dados pessoais (nome, email, telefone)
 * já capturados no início do fluxo e reinicia apenas a partir da escolha do aparelho.
 */
export function RestartProposalButton({ onConfirm, className }: RestartProposalButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`text-muted-foreground hover:text-foreground gap-1.5 ${className ?? ""}`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Refazer proposta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refazer a proposta?</AlertDialogTitle>
          <AlertDialogDescription>
            Vamos reiniciar a partir da escolha do aparelho. Seus dados de contato
            (nome, e-mail e telefone) serão mantidos para você não precisar digitar de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sim, refazer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
