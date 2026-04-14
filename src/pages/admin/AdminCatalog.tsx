import { DevicesTab } from "@/components/admin/catalog/DevicesTab";
import { DefectsTab } from "@/components/admin/catalog/DefectsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminCatalog = () => (
  <div className="p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Catálogo de Aparelhos</h2>
      <p className="text-sm text-muted-foreground">Gerencie aparelhos, preços e categorias de defeitos</p>
    </div>
    <Tabs defaultValue="devices">
      <TabsList>
        <TabsTrigger value="devices">Aparelhos</TabsTrigger>
        <TabsTrigger value="defects">Defeitos</TabsTrigger>
      </TabsList>
      <TabsContent value="devices" className="mt-4">
        <DevicesTab />
      </TabsContent>
      <TabsContent value="defects" className="mt-4">
        <DefectsTab />
      </TabsContent>
    </Tabs>
  </div>
);

export default AdminCatalog;
