import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // O Supabase processa o token do hash da URL automaticamente e dispara
    // PASSWORD_RECOVERY. Mantemos um listener para detectar e habilitar o form.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Nova senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina uma nova senha para sua conta
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              Carregando...
            </p>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado. Solicite um novo link de
                recuperação na tela de login.
              </p>
              <Button
                onClick={() => navigate("/admin/login")}
                variant="outline"
                className="w-full"
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {submitting ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminResetPassword;
