
## Análise do que já existe

Confirmado lendo o código:
- **`useLead.createLead`** já faz INSERT em `leads` no Step 0 (nome/email/telefone) com `status: 'in_progress'`
- **`updateLead`** já salva `device_id` no Step 1
- **`updateAssessment`** já faz UPDATE silencioso no JSONB `assessment_responses` a cada resposta + a cada transição de sub-tela
- **`markRejected`** já marca `status: 'rejected'` + `rejection_reason`
- **`handleSubmit`** já marca `status: 'completed'` + cria `evaluation` com `coupon_code`

Ou seja: a granularidade dos status já existe no banco. Não preciso de RPC complexa nem nova tabela. **Basta ler `leads.status` e fazer LEFT JOIN com `evaluations`** para classificar:

| Status do funil          | Regra                                            |
|--------------------------|--------------------------------------------------|
| Lead (só contato)        | `leads.status='in_progress'` AND `device_id IS NULL` |
| Proposta incompleta      | `leads.status='in_progress'` AND `device_id IS NOT NULL` |
| Rejeitado (hard stop)    | `leads.status='rejected'`                        |
| Cliente completo (cupom) | `leads.status='completed'` (tem evaluation+cupom)|

## Plano simplificado (sem complicar)

### 1. Migration mínima
- Adicionar `brand_id uuid` em `devices` + backfill por nome (mantém `brand` text por compat)
- Índices em `leads(status, created_at)` e `evaluations(created_at, device_id)`
- **Nada de RPC.** Queries diretas via supabase-js bastam — RLS já permite admin ler tudo.

### 2. Edge Function única: `get-dashboard-metrics` (REST para ERP)
Um endpoint só, que recebe `?from=&to=&brand_id=` e retorna tudo:
```json
{
  "totals": {
    "leads": 120,            // só contato
    "incomplete": 45,        // device escolhido, sem cupom
    "rejected": 12,
    "completed": 38,         // cliente completo
    "abandonment_rate": 0.55,// (leads+incomplete) / total
    "total_value_brl": 48200 // soma final_value dos completed
  },
  "top_devices": [ { "device_id", "model", "brand", "count", "total_value" } ]
}
```
- Auth via header `x-api-key` (novo secret `DASHBOARD_API_KEY`) — para o ERP externo
- Frontend chama a mesma function via `supabase.functions.invoke` (sem precisar da key, JWT do admin)

### 3. Frontend (mínimo)
- **`AdminDashboard.tsx`**: 4 cards (Leads / Incompletos / Rejeitados / Completos + valor) + filtros simples (DateRange + Select de marca) + ranking top 5 modelos (lista, sem gráfico pesado)
- **`AdminCustomers.tsx`**: adicionar filtro por status do funil (chips: Todos / Só contato / Incompleto / Rejeitado / Completo) na listagem que já existe
- **Export**: 1 botão "Exportar CSV" no Dashboard (sem XLSX, sem dropdown — CSV puro abre em Excel/ERP, zero dependência)

### 4. Documentação
Adicionar seção em `docs/coupon-format.md` com o contrato do endpoint `/get-dashboard-metrics` (params, response, exemplo curl com `x-api-key`).

## O que **descartei** do plano anterior
- ❌ 3 edge functions separadas → **1 só**
- ❌ RPC + Edge wrapper → **só Edge**
- ❌ XLSX com dynamic import → **só CSV**
- ❌ Recharts → **lista simples top 5** (já temos `chart.tsx` se quiser depois)
- ❌ Hooks separados (`use-dashboard-metrics`, `use-top-devices`, `use-leads-list`) → **1 hook só**, `useDashboardMetrics`
- ❌ Lógica nova de "abandono" → **já é `status='in_progress'`**, sem janela de tempo

## Arquivos afetados
- **Novo**: `supabase/functions/get-dashboard-metrics/index.ts`
- **Novo**: `src/hooks/use-dashboard-metrics.ts`
- **Novo**: `src/components/admin/dashboard/DashboardFilters.tsx`
- **Novo**: `src/lib/export-csv.ts` (pequeno helper)
- **Refatorado**: `src/pages/admin/AdminDashboard.tsx`
- **Refatorado**: `src/pages/admin/AdminCustomers.tsx` (adiciona filtro status)
- **Migration**: add `brand_id` em devices + índices
- **Atualizado**: `docs/coupon-format.md` (seção API métricas)

Resultado: 1 endpoint REST limpo pro ERP, dashboard funcional, e nada de over-engineering. Quer que eu execute?
