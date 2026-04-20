import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogTreeTab } from "@/components/admin/catalog/CatalogTreeTab";
import { DefectsTab } from "@/components/admin/catalog/DefectsTab";
import { AuxCrudTab } from "@/components/admin/catalog/AuxCrudTab";
import { ModelsTab } from "@/components/admin/catalog/ModelsTab";
import { ColorsTab } from "@/components/admin/catalog/ColorsTab";
import { EvaluationGroupsOrder } from "@/components/admin/catalog/EvaluationGroupsOrder";

const AdminCatalog = () => (
  <div className="p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Produtos e Parâmetros</h2>
      <p className="text-sm text-muted-foreground">Gerencie o catálogo hierárquico (Marca → Modelo → Capacidade → Cor) e bibliotecas auxiliares</p>
    </div>
    <Tabs defaultValue="catalog">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="catalog">Catálogo</TabsTrigger>
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="models">Modelos</TabsTrigger>
        <TabsTrigger value="storages">Armazenamento</TabsTrigger>
        <TabsTrigger value="colors">Cores</TabsTrigger>
        <TabsTrigger value="defects">Critérios de Avaliação</TabsTrigger>
      </TabsList>
      <TabsContent value="catalog" className="mt-4"><CatalogTreeTab /></TabsContent>
      <TabsContent value="brands" className="mt-4">
        <AuxCrudTab table="brands" label="Marcas" fieldName="name" fieldLabel="Nome da Marca" defaultFormatRule="capitalize" />
      </TabsContent>
      <TabsContent value="models" className="mt-4">
        <ModelsTab />
      </TabsContent>
      <TabsContent value="storages" className="mt-4">
        <AuxCrudTab table="storages" label="Armazenamento" fieldName="capacity" fieldLabel="Capacidade" defaultFormatRule="uppercase" />
      </TabsContent>
      <TabsContent value="colors" className="mt-4">
        <ColorsTab />
      </TabsContent>
      <TabsContent value="defects" className="mt-4 space-y-6">
        <EvaluationGroupsOrder />
        <DefectsTab />
      </TabsContent>
    </Tabs>
  </div>
);

export default AdminCatalog;

