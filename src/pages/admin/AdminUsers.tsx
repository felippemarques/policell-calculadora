import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus, Loader2, ShieldCheck } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "list" },
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar administradores");
      return;
    }
    setAdmins(data?.admins ?? []);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    if (password.length < 8) {
      toast.error("Senha deve ter ao menos 8 caracteres");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "create", email, password },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "Erro ao criar administrador");
      return;
    }
    toast.success("Administrador criado");
    setCreateOpen(false);
    setEmail("");
    setPassword("");
    fetchAdmins();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "delete", user_id: deleteTarget.id },
    });
    if (error || data?.error) {
      toast.error(data?.error ?? "Erro ao remover");
      return;
    }
    toast.success("Administrador removido");
    setDeleteTarget(null);
    fetchAdmins();
  };

  const handleResetPassword = async (admin: AdminUser) => {
    const { data, error } = await supabase.functions.invoke("manage-admins", {
      body: { action: "reset_password", email: admin.email },
    });
    if (error || data?.error) {
      toast.error(data?.error ?? "Erro ao enviar link");
      return;
    }
    toast.success(`Link de recuperação enviado para ${admin.email}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Administradores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie quem tem acesso ao painel administrativo
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Administrador
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum administrador encontrado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.email}
                    {a.id === user?.id && (
                      <Badge variant="secondary" className="ml-2">você</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.last_sign_in_at
                      ? new Date(a.last_sign_in_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(a)}
                    >
                      <KeyRound className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Resetar senha</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(a)}
                      disabled={a.id === user?.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 md:mr-1" />
                      <span className="hidden md:inline">Excluir</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Administrador</DialogTitle>
            <DialogDescription>
              O usuário será criado já confirmado e com permissão de admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@policell.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-password">Senha (mín. 8 caracteres)</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar administrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o acesso de{" "}
              <strong>{deleteTarget?.email}</strong> ao painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
