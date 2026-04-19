

Confirmado: **Banco Opção A** + **UI Opção 1** (substituir aba "Aparelhos" por árvore Modelo → Capacidade → Cor, mantendo abas auxiliares).

## Banco de dados (migração)

**Novas tabelas:**

```text
model_storages
  ├ id                uuid PK
  ├ model_id          uuid → device_models.id (cascade delete)
  ├ storage_id        uuid → storages.id (restrict delete)
  ├ base_price        numeric NOT NULL
  ├ display_order     int default 0
  ├ created_at        timestamptz
  └ UNIQUE(model_id, storage_id)

variant_colors
  ├ id                uuid PK
  ├ model_storage_id  uuid → model_storages.id (cascade delete)
  ├ color_id          uuid → colors.id (restrict delete)
  ├ display_order     int default 0
  ├ created_at        timestamptz
  └ UNIQUE(model_storage_id, color_id)
```

RLS: mesmo padrão das outras tabelas do catálogo (admin CRUD, public SELECT).

**Trigger de sincronização** (`sync_devices_from_variants`): após INSERT/UPDATE/DELETE em `model_storages` ou `variant_colors`, recalcula a linha correspondente em `devices` (uma linha por `model_storage`, com `colors` agregadas em CSV). Mantém calculadora pública intacta.

**Backfill**: script de migração que lê `devices` atuais e popula `model_storages` + `variant_colors` baseado em brand/model/storage/colors existentes.

## Frontend Admin

**Refatorar:**
- `src/pages/admin/AdminCatalog.tsx` — renomeia aba "Aparelhos" para "Catálogo" e troca o componente.
- `src/components/admin/catalog/DevicesTab.tsx` — **substituído** pelo novo `CatalogTreeTab.tsx`.

**Criar:**
- `src/components/admin/catalog/CatalogTreeTab.tsx` — árvore expansível agrupada por marca → modelo.
- `src/components/admin/catalog/ModelStorageRow.tsx` — linha de capacidade com preço, expansível para mostrar cores.
- `src/components/admin/catalog/VariantColorChips.tsx` — chips de cores adicionáveis/removíveis dentro de uma capacidade.
- `src/hooks/use-catalog-tree.ts` — query agregada (`device_models` + `model_storages` + `variant_colors` + joins com `storages` e `colors`).

**Manter intacto:**
- Abas auxiliares `Marcas`, `Modelos`, `Armazenamento`, `Cores`, `Critérios` (continuam como bibliotecas globais).
- `src/components/landing/*`, `src/pages/Calculadora.tsx`, `src/components/trade-in/*`, `useDevices()` — leem de `devices` e seguem funcionando via trigger.

## UX da árvore

```text
Apple
  ▼ iPhone 15 Pro                            [+ Capacidade]
      ▼ 128GB · R$ 4.000          [✎] [🗑]
          [Titânio Natural ×] [Preto ×] [+ Cor ▾]
      ▶ 256GB · R$ 4.500
  ▶ iPhone 14
Samsung
  ▶ Galaxy S24
```

- `+ Capacidade`: dropdown com `storages` ainda não vinculadas àquele modelo + input de preço.
- `+ Cor`: dropdown com `colors` ainda não vinculadas àquela variação (filtrado por brand quando `colors.brand_ids` não vazio).
- Edição de preço inline na linha da capacidade.
- Excluir capacidade pede confirmação (cascateia variantes e remove devices órfãos via trigger).

## Ordem de execução

1. Migração SQL: criar `model_storages`, `variant_colors`, RLS, trigger de sync, backfill a partir de `devices`.
2. Hook `use-catalog-tree.ts` + tipos.
3. Componente `CatalogTreeTab.tsx` + filhos.
4. Trocar `DevicesTab` por `CatalogTreeTab` no `AdminCatalog.tsx`.
5. Smoke test: criar iPhone 15 Pro / 256GB / Preto na árvore, verificar que aparece na calculadora pública.

