import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Sparkles, Wrench, ShieldAlert, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useEvaluationGroupsConfig,
  useUpdateEvaluationGroupsConfig,
  type EvaluationGroupId,
} from "@/hooks/use-evaluation-groups-config";

/**
 * Visible UI labels (after the rename requested by the client).
 * Reminder: the underlying tables are unchanged.
 *  - "conditions" backed by condition_discounts → label "Categorias de Defeitos"
 *  - "defects"    backed by damage_categories   → label "Condições do Aparelho"
 *  - "rejection"  backed by condition_discounts (rejected) → label "Motivos de Rejeição"
 */
const META: Record<
  EvaluationGroupId,
  { label: string; description: string; Icon: typeof Sparkles; tone: string }
> = {
  conditions: {
    label: "Categorias de Defeitos",
    description: "Itens com desconto fixo ou percentual (ex: bateria fraca, tela com riscos).",
    Icon: Sparkles,
    tone: "text-primary",
  },
  defects: {
    label: "Condições do Aparelho",
    description: "Estado geral e categorias com subopções (ex: tela quebrada → arranhada/trincada).",
    Icon: Wrench,
    tone: "text-amber-500",
  },
  rejection: {
    label: "Motivos de Rejeição",
    description: "Critérios que impedem totalmente a avaliação (zeram o valor).",
    Icon: ShieldAlert,
    tone: "text-destructive",
  },
};

interface SortableCardProps {
  id: EvaluationGroupId;
  visible: boolean;
  onToggleVisible: (next: boolean) => void;
  saving: boolean;
}

function SortableCard({ id, visible, onToggleVisible, saving }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const meta = META[id];
  const Icon = meta.Icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-sm"
      } ${visible ? "" : "opacity-60"}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-muted ${meta.tone}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-none text-foreground">{meta.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
      </div>

      <div className="flex items-center gap-2">
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        <Label htmlFor={`vis-${id}`} className="cursor-pointer text-xs text-muted-foreground">
          Visível
        </Label>
        <Switch
          id={`vis-${id}`}
          checked={visible}
          onCheckedChange={onToggleVisible}
          disabled={saving}
        />
      </div>
    </div>
  );
}

export function EvaluationGroupsOrder() {
  const { data, isLoading } = useEvaluationGroupsConfig();
  const updateMutation = useUpdateEvaluationGroupsConfig();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const order = useMemo(() => data?.order ?? ["conditions", "defects", "rejection"], [data]);
  const visible = useMemo(
    () => data?.visible ?? { conditions: true, defects: true, rejection: true },
    [data],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as EvaluationGroupId);
    const newIndex = order.indexOf(over.id as EvaluationGroupId);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    updateMutation.mutate(
      { order: next },
      {
        onSuccess: () => toast.success("Ordem atualizada"),
        onError: (e: any) => toast.error(e.message ?? "Erro ao salvar ordem"),
      },
    );
  };

  const toggleVisible = (id: EvaluationGroupId, next: boolean) => {
    updateMutation.mutate(
      { visible: { ...visible, [id]: next } },
      {
        onSuccess: () =>
          toast.success(next ? "Grupo ativado na calculadora" : "Grupo oculto da calculadora"),
        onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
      },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ordem das Etapas</h3>
          <p className="text-xs text-muted-foreground">
            Arraste para definir em qual ordem os 3 grupos aparecem na calculadora pública. Use o
            interruptor para esconder um grupo inteiro.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {order.map((id) => (
                <SortableCard
                  key={id}
                  id={id}
                  visible={visible[id]}
                  onToggleVisible={(v) => toggleVisible(id, v)}
                  saving={updateMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
