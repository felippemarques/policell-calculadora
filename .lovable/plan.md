## Plano de implementação

### 1. Busca por IMEI (Clientes + Avaliações)

**Clientes (`AdminCustomers.tsx`)**
- Atualizar placeholder do campo de busca para incluir IMEI.
- Estender o filtro `filtered` para também buscar pelo `imei` do lead (fazendo `select` do campo `imei` na query e comparando com dígitos normalizados — ex.: `359 123` casa com `359123...`).
- Mostrar o IMEI no card/sheet de detalhes (já existe no `ProposalDetailSheet`).

**Avaliações (`AdminEvaluations.tsx`)**
- Adicionar campo de busca no topo (hoje não tem nenhum).
- Buscar `imei` no `select` da query de evaluations e filtrar por nome/email/telefone/IMEI/cupom.

### 2. Exclusão (arquivamento) de proposta + filtro

Já existe `archived_at` em `leads` e `evaluations`, e RPCs `archive_lead` / `archive_evaluation`. Vamos usar essas funções (soft delete) — proposta "excluída" = arquivada.

**Em Clientes**
- Adicionar ação "Excluir proposta" no menu de cada linha → chama `archive_lead(id, true)` com `AlertDialog` de confirmação.
- Adicionar filtro "Mostrar excluídas" (Select com 3 opções: Ativas / Excluídas / Todas). Por padrão a query carrega só com `archived_at IS NULL`.
- Em linhas excluídas, mostrar badge "Excluída" e botão "Restaurar" → `archive_lead(id, false)`.

**Em Avaliações**
- Mesma lógica usando `archive_evaluation`.
- Botão "Excluir" + filtro de visibilidade + ação "Restaurar".

### 3. Expiração configurável da proposta (e nova validação de IMEI)

**Configuração nova em `AdminBusinessSettings.tsx`**
- Novo campo `business_proposal_expiration_days` (número, default `30`, `0` = nunca expira).
- UI: card "Expiração de propostas" — input numérico + helper text explicando que após N dias o cliente pode refazer com o mesmo IMEI.

**Mudança no índice único (migração SQL)**
- Hoje: `uniq_evaluations_imei_flow_active` bloqueia qualquer evaluation `pending|approved|completed` com mesmo `(imei, flow_type)`. Isso é estático, não respeita expiração.
- Trocar a estratégia: remover o índice único e mover a validação para um **trigger BEFORE INSERT** que:
  1. Lê `business_proposal_expiration_days` de `lp_settings` (default 30).
  2. Procura evaluation existente com mesmo `imei + flow_type`, status em `pending|completed|approved`, `archived_at IS NULL`, e `created_at > now() - interval 'N days'` (ou sem janela se N=0).
  3. Se encontrar, levanta erro `23505` (mantém compatibilidade com `DuplicateImeiError` no front).

**Mensagem transparente para o cliente**
- Em `TradeInWizard.tsx` (catch do `DuplicateImeiError`) e em `StepImei.tsx` (via `serverError`): trocar texto atual por algo explícito como:
  > "Já existe uma proposta em andamento para este IMEI (válida até DD/MM/AAAA). Para garantir a melhor condição, fale diretamente com nosso comercial: [botão WhatsApp]."
- Adicionar botão "Falar com comercial" abaixo do erro, abrindo o WhatsApp configurado em `flow_sale_whatsapp` (ou criar novo setting `business_commercial_whatsapp` — ver pergunta abaixo).
- Para isso o erro precisa carregar `expires_at`. Vamos retornar via RPC nova `check_imei_availability(_imei, _flow_type)` chamada antes do submit OU enriquecer o erro consultando a evaluation existente quando o `23505` é detectado.

### 4. Bônus para o fluxo "Vender por dinheiro"

Hoje só existe `business_upgrade_bonus_percent` (aplicado se `flowType === "trade"`). Adicionar simétrico para venda:

- Novo setting `business_sale_bonus_percent` (default `0`).
- Em `AdminBusinessSettings.tsx`: card "Bônus em caso de Venda em dinheiro" (cópia visual do card de Troca/Upgrade), input %.
- Em `use-business-settings.ts`: expor `saleBonusPercent`.
- Aplicar na `StepSpecialOffer` e `StepImei`:
  - Mostrar a tela de oferta especial também no fluxo `sale` quando `saleBonusPercent > 0`.
  - Texto adaptado: "Bônus de venda" / "Total a receber em dinheiro".
- No cálculo final (gravação da evaluation): aplicar o bônus correspondente ao `flowType` no `finalValue` salvo (hoje o bônus de troca é apenas exibido — confirmar com você se deve ser aplicado ao valor salvo do cupom; ver pergunta).

---

### Detalhes técnicos

**Migração SQL nova:**
```sql
-- 1. Drop do índice estático
DROP INDEX IF EXISTS uniq_evaluations_imei_flow_active;

-- 2. Trigger dinâmico que respeita expiração
CREATE OR REPLACE FUNCTION public.check_imei_duplicate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _exp_days int;
  _exists uuid;
BEGIN
  IF NEW.imei IS NULL OR NEW.imei = '' THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(value,'')::int, 30) INTO _exp_days
    FROM public.lp_settings WHERE key = 'business_proposal_expiration_days';
  SELECT id INTO _exists FROM public.evaluations
    WHERE imei = NEW.imei
      AND flow_type = NEW.flow_type
      AND archived_at IS NULL
      AND status IN ('pending','approved','completed')
      AND (_exp_days = 0 OR created_at > now() - (_exp_days || ' days')::interval)
    LIMIT 1;
  IF _exists IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe proposta ativa para este IMEI'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_check_imei_duplicate
BEFORE INSERT ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.check_imei_duplicate();
```

**Arquivos editados:**
- `src/pages/admin/AdminCustomers.tsx` — busca IMEI, ação excluir, filtro arquivadas
- `src/pages/admin/AdminEvaluations.tsx` — busca, ação excluir, filtro arquivadas
- `src/pages/admin/AdminBusinessSettings.tsx` — campo expiração + bônus de venda + (opcional) WhatsApp comercial
- `src/hooks/use-business-settings.ts` — expor `saleBonusPercent`, `proposalExpirationDays`
- `src/components/trade-in/TradeInWizard.tsx` — usar `saleBonusPercent` no `showSpecialOffer`, mensagem nova de duplicidade
- `src/components/trade-in/StepSpecialOffer.tsx` — variante "venda"
- `src/components/trade-in/StepImei.tsx` — passar bônus de venda + UI do erro com botão WhatsApp
- `src/hooks/use-submit-evaluation.ts` — incluir `expires_at` no erro de duplicidade (consulta extra ao detectar 23505)
- Nova migração SQL conforme acima

---

### Perguntas antes de começar

1. **Bônus de troca aplicado ao cupom**: hoje o bônus de upgrade aparece nas telas mas o `finalValue` salvo na evaluation é só o valor da avaliação. Quer que tanto o bônus de troca quanto o de venda passem a ser **somados ao valor do cupom gerado**?

2. **Contato comercial na mensagem de duplicidade**: usar o WhatsApp do fluxo de venda (`flow_sale_whatsapp`) ou criar um novo campo "WhatsApp comercial" exclusivo para esse caso?

3. **Default de expiração**: 30 dias ok como padrão, ou prefere outro valor (ex.: 7, 15)?
