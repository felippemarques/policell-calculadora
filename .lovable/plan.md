

## Escopo

Adicionar um **Passo 0** ("Como você quer negociar?") com 2 cards: **Trocar por outro aparelho** ou **Vender por dinheiro**. A escolha define preço base diferente por aparelho e CTA final distinto. Admin configura textos, ícones e habilita/desabilita cada fluxo.

## 1. Banco de dados (migração)

**`model_storages`** (preço base hoje único):
- `+ trade_price numeric NOT NULL DEFAULT 0` — preço quando cliente quer trocar
- `+ sale_price numeric NOT NULL DEFAULT 0` — preço quando cliente quer vender
- Backfill: `trade_price = base_price`, `sale_price = base_price` para registros existentes (zero quebra).
- `base_price` continua existindo (fallback/legado).
- Trigger `sync_device_for_model_storage` atualizada para escrever ambos em `devices` (novas colunas `trade_price`, `sale_price`).

**`devices`** (sincronizada via trigger):
- `+ trade_price numeric NOT NULL DEFAULT 0`
- `+ sale_price numeric NOT NULL DEFAULT 0`

**`leads`** + **`evaluations`**:
- `+ flow_type text NOT NULL DEFAULT 'trade'` — `'trade'` ou `'sale'`. Permite filtrar/relatar no admin.

**`lp_settings`** (chave-valor já existente, sem migração de schema):
- Novas chaves inseridas via `supabase--insert` depois da migração:
  - `flow_trade_enabled` ('true'/'false')
  - `flow_trade_title`, `flow_trade_description`, `flow_trade_cta_text`
  - `flow_sale_enabled`, `flow_sale_title`, `flow_sale_description`, `flow_sale_cta_text`
  - `flow_sale_whatsapp` — número (já pode ter um, conferir e usar fallback)

## 2. Admin — preço por aparelho

`src/components/admin/catalog/ModelStorageRow.tsx` (linha que edita capacidade + preço):
- Substituir o único campo de preço por **dois `CurrencyInput`** lado a lado: "Preço Troca" (azul) e "Preço Venda" (verde).
- Mutação inclui ambos na atualização de `model_storages`.

`CatalogTreeTab.tsx` exibe os dois preços compactos no nó da capacidade.

`DeviceMatrixGenerator.tsx` (criação em massa): adicionar dois inputs ao gerar variantes; default `trade=sale`.

## 3. Admin — configuração dos fluxos

Nova aba simples em `AdminBusinessSettings.tsx` (já existe a página): seção **"Fluxos da Calculadora"** com:
- Toggle on/off para cada fluxo (Troca / Venda).
- Campos editáveis por fluxo: Título, Descrição curta, Texto do CTA.
- Campo único: WhatsApp para o fluxo Venda.
- Tudo persistido em `lp_settings` via upsert.

Pequeno hook novo: `use-flow-settings.ts` que lê todas as chaves `flow_*` em uma query e devolve um objeto tipado.

## 4. Frontend público — Passo 0

`TradeInWizard.tsx`:
- Adicionar `flowType: 'trade' | 'sale' | null` ao `WizardData`.
- Inserir `step = -1` (ou renumerar para 0..4): novo `StepChooseFlow` antes de `StepPersonalInfo`.
- Persistir `flowType` em localStorage (já existe persistência) e no lead via `updateLead`.
- Atualizar barra de progresso (`totalSteps` vira 4).
- Selecionar `basePrice` correto: `selectedDevice.trade_price` se `flowType==='trade'`, senão `sale_price`. Fallback para `base_price` se ambos zero (compat).

Novo arquivo: `src/components/trade-in/StepChooseFlow.tsx`:
- Dois cards grandes (motion + hover), respeitando design tokens.
- Lê settings via novo hook `use-flow-settings`.
- Esconde card desabilitado; se só um habilitado, **pula automaticamente** essa tela e seta `flowType` direto.

## 5. Resultado diferenciado

`StepResult.tsx`:
- Se `flowType==='trade'`: mantém comportamento atual (link da loja + cupom).
- Se `flowType==='sale'`: substitui CTA por botão "Falar no WhatsApp" que abre `https://wa.me/<numero>?text=...` com mensagem pré-preenchida (nome + modelo + valor proposto + protocolo do lead).
- Texto explicativo do card muda conforme o fluxo.

`use-submit-evaluation.ts`: passar `flow_type` no insert de `evaluations`.
`use-lead.ts`: helper `setFlowType(leadId, type)`.

## 6. Tipos

Após migração, `src/integrations/supabase/types.ts` é regenerado automaticamente. Atualizar:
- `src/hooks/use-trade-in-data.ts`: device query inclui `trade_price`, `sale_price`.
- `src/lib/trade-in-pricing.ts`: nada muda — `computePricing` continua recebendo `basePrice` resolvido.

## Arquivos tocados

**Banco:** 1 migration + 1 insert (settings defaults).
**Criar:** `src/components/trade-in/StepChooseFlow.tsx`, `src/hooks/use-flow-settings.ts`.
**Editar:** `TradeInWizard.tsx`, `StepResult.tsx`, `use-trade-in-data.ts`, `use-submit-evaluation.ts`, `use-lead.ts`, `ModelStorageRow.tsx`, `DeviceMatrixGenerator.tsx`, `CatalogTreeTab.tsx`, `AdminBusinessSettings.tsx`.

## Smoke test final

1. Admin define iPhone 15 Pro 256GB: Troca R$ 3.000, Venda R$ 2.700.
2. Admin habilita ambos fluxos com textos custom; cadastra WhatsApp.
3. Cliente abre calculadora → vê 2 cards → escolhe **Troca** → vai pelos passos → resultado mostra R$ 3.000 + cupom.
4. Reset → escolhe **Venda** → resultado mostra R$ 2.700 + botão WhatsApp com mensagem.
5. Admin desativa "Venda" → cliente novo entra direto em Troca, sem ver Passo 0.

