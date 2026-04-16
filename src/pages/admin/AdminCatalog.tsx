import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevicesTab } from "@/components/admin/catalog/DevicesTab";
import { EvaluationCriteriaTab } from "@/components/admin/catalog/EvaluationCriteriaTab";
import { AuxCrudTab } from "@/components/admin/catalog/AuxCrudTab";
import { ModelsTab } from "@/components/admin/catalog/ModelsTab";

const AdminCatalog = () => (
  <div className="p-6 space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Produtos e Parâmetros</h2>
      <p className="text-sm text-muted-foreground">Gerencie aparelhos, marcas, modelos, armazenamento, cores e defeitos</p>
    </div>
    <Tabs defaultValue="devices">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="devices">Aparelhos</TabsTrigger>
        <TabsTrigger value="brands">Marcas</TabsTrigger>
        <TabsTrigger value="models">Modelos</TabsTrigger>
        <TabsTrigger value="storages">Armazenamento</TabsTrigger>
        <TabsTrigger value="colors">Cores</TabsTrigger>
        <TabsTrigger value="defects">Critérios de Avaliação</TabsTrigger>
      </TabsList>
      <TabsContent value="devices" className="mt-4"><DevicesTab /></TabsContent>
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
        <AuxCrudTab table="colors" label="Cores" fieldName="name" fieldLabel="Nome da Cor" defaultFormatRule="capitalize" />
      </TabsContent>
      <TabsContent value="defects" className="mt-4"><EvaluationCriteriaTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminCatalog;
