import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
}

export interface DashboardFiltersValue {
  from?: Date;
  to?: Date;
  brandId?: string;
}

interface Props {
  value: DashboardFiltersValue;
  onChange: (next: DashboardFiltersValue) => void;
}

export function DashboardFilters({ value, onChange }: Props) {
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["dashboard-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = (patch: Partial<DashboardFiltersValue>) => onChange({ ...value, ...patch });

  const hasFilter = !!(value.from || value.to || value.brandId);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <DateField
        label="De"
        date={value.from}
        onChange={(d) => set({ from: d })}
      />
      <DateField
        label="Até"
        date={value.to}
        onChange={(d) => set({ to: d })}
      />

      <Select
        value={value.brandId ?? "all"}
        onValueChange={(v) => set({ brandId: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

function DateField({
  label,
  date,
  onChange,
}: {
  label: string;
  date?: Date;
  onChange: (d?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal sm:w-44",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
