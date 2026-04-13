import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, ClipboardList, Users, Layers } from "lucide-react";

const AdminDashboard = () => {
  const { data: deviceCount } = useQuery({
    queryKey: ["admin-device-count"],
    queryFn: async () => {
      const { count } = await supabase.from("devices").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: evalCount } = useQuery({
    queryKey: ["admin-eval-count"],
    queryFn: async () => {
      const { count } = await supabase.from("evaluations").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: sectionCount } = useQuery({
    queryKey: ["admin-section-count"],
    queryFn: async () => {
      const { count } = await supabase.from("lp_sections").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Dispositivos", value: deviceCount ?? 0, icon: Smartphone, color: "text-primary" },
    { label: "Avaliações", value: evalCount ?? 0, icon: ClipboardList, color: "text-success" },
    { label: "Seções LP", value: sectionCount ?? 0, icon: Layers, color: "text-warning" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
