import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wm10SettingsCard } from "@/components/admin/integrations/Wm10SettingsCard";
import { Wm10ProductMappingTable } from "@/components/admin/integrations/Wm10ProductMappingTable";
import { useWm10Settings } from "@/hooks/use-wm10-settings";

export default function AdminIntegrations() {
  const { settings } = useWm10Settings();
  const isConfigured = !!(settings?.store_url && settings?.cnpj && settings?.token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Conecte o sistema ao ERP WM10 para sincronizar produtos.
        </p>
      </div>

      <Tabs defaultValue="configuracao">
        <TabsList>
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          <TabsTrigger value="produtos" disabled={!isConfigured}>
            Mapeamento de Produtos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuracao" className="mt-4">
          <Wm10SettingsCard />
        </TabsContent>

        <TabsContent value="produtos" className="mt-4">
          <Wm10ProductMappingTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
