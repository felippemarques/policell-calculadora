

Vou explorar primeiro as tabelas de critérios e a UI atual antes de planejar.
<lov-tool-use id="toolu_vrtx_012aLjofeWm8J5pXRZg5xB5K" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/catalog/DefectsTab.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LAeBqKA28yp2BDh1iTu63S" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT 'condition_discounts' AS t, count(*) FROM condition_discounts UNION ALL SELECT 'damage_categories', count(*) FROM damage_categories UNION ALL SELECT 'damage_deductions', count(*) FROM damage_deductions UNION ALL SELECT 'assessment_criteria', count(*) FROM assessment_criteria UNION ALL SELECT 'assessment_options', count(*) FROM assessment_options;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018ez7arosGpxdmvYjVkhwkM" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/catalog/DefectsTab.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KkzMeAoWeBGUbXtUK4ViTx" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT 'condition_discounts' AS t, count(*) FROM condition_discounts UNION ALL SELECT 'damage_categories', count(*) FROM damage_categories UNION ALL SELECT 'damage_deductions', count(*) FROM damage_deductions UNION ALL SELECT 'assessment_criteria', count(*) FROM assessment_criteria UNION ALL SELECT 'assessment_options', count(*) FROM assessment_options;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01XNFiY9TGN8rHn9zMjqEUxG" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/trade-in/StepEvaluationChecklist.tsx\"}">
</lov-tool-use>
I have enough context. Let me check existing fields on `condition_discounts` and `damage_deductions` for fixed-value discounts and how categories link models.
<lov-tool-use id="toolu_vrtx_01EAifRDHjdavL6iNqtjReqW" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('condition_discounts','damage_categories','damage_deductions') ORDER BY table_name, ordinal_position;\"}">
</lov-tool-use>
I have all I need. Tem agora o quadro completo:

- **3 entidades**: `condition_discounts` (Tela A + Rejeições), `damage_categories` + `damage_deductions` (Tela B).
- **Hoje**: só `damage_categories` tem filtro por marca (`brand_ids`); `condition_discounts` não tem nenhum filtro. Nenhuma das 3 tem desconto fixo (R$) — só `damage_deductions` tem `deduction_value`. Nenhuma tem campo de vídeo.
- **Filtro pedido** é por **modelo** (não marca) — exige nova coluna `model_ids uuid[]`.
- **UI Admin** vive em `DefectsTab.tsx` (1613 linhas), com seções para Condições, Categorias de Defeitos e Rejeições.

<lov-plan>

## Escopo

Estender o motor de avaliação com 3 capacidades: filtro por modelo, vídeo educativo do YouTube, e desconto em R$ ou %. Mais um simulador reativo no formulário do admin. Restrição mantida: zero mudança no frontend público (calculadora pública continua funcionando — campos novos têm default seguro).

## 1. Banco de dados (migração)

**`condition_discounts`** (hoje só tem %):
- `+ discount_fixed numeric NOT NULL DEFAULT 0` — valor em R$ alternativo
- `+ discount_mode text NOT NULL DEFAULT 'percent'` — `'percent'` ou `'fixed'`
- `+ model_ids uuid[] NOT NULL DEFAULT '{}'` — vazio = aplica a todos
- `+ youtube_url text` — link explicativo

**`damage_categories`** (já tem brand_ids):
- `+ model_ids uuid[] NOT NULL DEFAULT '{}'`
- `+ youtube_url text`
- `brand_ids` continua existindo para retrocompat; passa a ser tratado como filtro adicional (AND).

**`damage_deductions`** (hoje só tem R$ via `deduction_value`):
- `+ deduction_percent numeric NOT NULL DEFAULT 0`
- `+ deduction_mode text NOT NULL DEFAULT 'fixed'` — `'fixed'` ou `'percent'`

Defaults garantem que registros antigos seguem comportamento atual sem código novo.

## 2. Lógica de pricing (`src/lib/trade-in-pricing.ts`)

Atualizar `computePricing` para respeitar `_mode`:
- Condition: se `discount_mode='fixed'` aplica `discount_fixed` em R$ (somado ao `fixedDeductions`); senão soma % como hoje.
- Damage option: se `deduction_mode='percent'` soma ao `percentDiscount`; senão R$ como hoje.

Frontend público (`StepEvaluationChecklist`, `StepResult`) lê via essa função — mudança transparente.

## 3. Filtro por modelo no checklist público

`StepEvaluationChecklist.tsx`: adicionar prop `selectedModelId`. Filtro:
- categoria/condição visível se `model_ids` vazio OU contém `selectedModelId` (E também passa no filtro de marca já existente para categories).
- `TradeInWizard.tsx` passa o `model_id` do device escolhido.

## 4. UI Admin — `DefectsTab.tsx`

Para os 3 formulários (Condição, Categoria de Defeito, Opção de Defeito, Rejeição):
- **Multi-select de modelos** (componente novo `ModelMultiSelect`): popover com checkbox-list agrupada por marca, busca, "Todos os modelos" quando vazio.
- **Campo `youtube_url`**: input simples com validação de URL do YouTube.
- **Toggle R$ / %** (Condition + Damage option): segmented control que troca o input ativo (R$ via `CurrencyInput`, % via `Input number`).

## 5. Simulador de Impacto (componente novo)

`src/components/admin/catalog/DiscountImpactSimulator.tsx`:
- Recebe `mode`, `value`, e renderiza:
  - `CurrencyInput` "Preço Base Fictício" (default R$ 2.000, persiste em localStorage por sessão admin).
  - 3 linhas: `Base R$ X` → `Desconto: −R$ Y (Z%)` → `Final: R$ W` em destaque.
- Reativo: recalcula em tempo real conforme admin digita o valor/percentual no formulário irmão.

Encaixado ao lado de cada input de desconto nos 4 fluxos de cadastro/edição.

## 6. Tipos

Regenerar `src/integrations/supabase/types.ts` automaticamente após migração. Atualizar interfaces em `src/lib/trade-in-pricing.ts` (`ConditionRow`, `DamageOption`, `DamageCategory`) para incluir os novos campos.

## Arquivos tocados

**Banco:** 1 migration nova.
**Editar:** `src/lib/trade-in-pricing.ts`, `src/components/admin/catalog/DefectsTab.tsx`, `src/components/trade-in/StepEvaluationChecklist.tsx`, `src/components/trade-in/TradeInWizard.tsx`.
**Criar:** `src/components/admin/catalog/ModelMultiSelect.tsx`, `src/components/admin/catalog/DiscountImpactSimulator.tsx`, `src/components/admin/catalog/YouTubeUrlInput.tsx` (validação leve + ícone).
**Não toca:** demais componentes públicos (`HeroSection`, `Calculadora.tsx`, `StepResult`, etc.).

## Smoke test final (execução)

1. Cadastrar condição "Tela quebrada" com desconto fixo R$ 300, vinculada só ao iPhone 15 Pro, com vídeo YouTube.
2. Conferir simulador mostra "R$ 2000 → −R$ 300 → R$ 1700" enquanto digita.
3. Iniciar avaliação na calculadora pública: a) com iPhone 15 Pro → critério aparece; b) com Galaxy S24 → critério some.
4. Cadastrar opção de defeito em % (ex: "Bateria viciada" −5%) e validar cálculo final.

