import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevicesTab } from "@/components/admin/catalog/DevicesTab";
import { DefectsTab } from "@/components/admin/catalog/DefectsTab";
import { AttributeTab } from "@/components/admin/catalog/AttributeTab";

const AdminCatalog = () => (
  <div className="p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Catálogo de Aparelhos</h2>
      <p className="text-sm text-muted-foreground">Gerencie aparelhos, atributos, preços e defeitos</p>
    </div>
    <Tabs defaultValue="devices">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="devices">Aparelhos</TabsTrigger>
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="models">Modelos</TabsTrigger>
        <TabsTrigger value="storages">Armazenamento</TabsTrigger>
        <TabsTrigger value="colors">Cores</TabsTrigger>
        <TabsTrigger value="defects">Defeitos</TabsTrigger>
      </TabsList>
      <TabsContent value="devices" className="mt-4"><DevicesTab /></TabsContent>
      <TabsContent value="brands" className="mt-4">
        <AttributeTab field="brand" label="Marca" description="Renomear uma marca altera todos os aparelhos que a utilizam." />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <AttributeTab field="model" label="Modelo" description="Renomear um modelo altera todos os aparelhos com esse nome." />
      </TabsContent>
      <TabsContent value="storages" className="mt-4">
        <AttributeTab field="storage" label="Armazenamento" description="Renomear um armazenamento altera todos os aparelhos com esse valor." />
      </TabsContent>
      <TabsContent value="colors" className="mt-4">
        <AttributeTab field="colors" label="Cor" description="Gerencie as cores disponíveis. Renomear ou remover afeta todos os aparelhos." />
      </TabsContent>
      <TabsContent value="defects" className="mt-4"><DefectsTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminCatalog;
