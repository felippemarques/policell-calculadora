## Objetivo

Você quer que o **Ajuste comercial** e os **botões de download do contrato** apareçam na tela da **proposta** (a tela do print, com "Aparelho selecionado" + "Raio-X do aparelho") — e não na Visão por Cliente. Essa tela hoje abre num painel lateral estreito; vamos transformá-la em **modal em tela cheia**, com botão de fechar (X) bem visível, organizando os campos em colunas para o vendedor ter visão e agilidade.

A API/integração **não muda** — continua recebendo o `final_value` total, como já está hoje.

---

## O que muda

### 1. Tela da Proposta (a do print) vira full-screen

Arquivo: `src/pages/admin/AdminCustomers.tsx` (componente interno `LeadDetail` + Sheet que o envolve).

- Trocar o `Sheet` lateral (`sm:max-w-lg`) por um **Dialog full-screen** (90vh × 95vw, com scroll interno).
- Header fixo no topo com nome do cliente, status e botão **X** para fechar.
- Layout em **2 colunas** (≥ lg): 
  - **Coluna esquerda** — Contato, Aparelho selecionado, Endereço, Linha do tempo.
  - **Coluna direita** — Raio-X do aparelho (todas as 11 respostas), Resumo financeiro, **Ajuste comercial**, **Botões de contrato (Original / Ajustado)**, anotações internas.
- No mobile, vira coluna única empilhada.
- Mantém o card "Pronto para fechar?" com envio de WhatsApp no topo.

### 2. Mover blocos comerciais para a tela da Proposta

- Importar `CommercialAdjustmentSection` e `ContractDownloadButtons` em `AdminCustomers.tsx`.
- Renderizá-los dentro do `LeadDetail` quando existir uma `evaluation` correspondente ao lead (mesmo `customer_email` + `device_id`, já temos em `finalValueMap` — ampliar para guardar a row inteira da evaluation).
- Quando o lead ainda não virou evaluation (status `in_progress` puro), mostrar uma nota "Ajuste comercial disponível após o cliente concluir a proposta."

### 3. Remover blocos comerciais da Visão por Cliente

Arquivo: `src/components/admin/ProposalDetailSheet.tsx`

- Remover as linhas 472-478 (`CommercialAdjustmentSection` + `ContractDownloadButtons`) e os imports relacionados.
- Esse sheet (usado em `AdminCustomerView.tsx`) volta a ser apenas leitura/contexto rápido.

### 4. Sem mudanças em banco / API

- A função RPC `apply_proposal_override` continua existindo e sendo usada.
- O override continua persistido em `evaluations.internal_notes` (formato JSON em comentário HTML, como já está).
- O webhook n8n / API Tray continua recebendo o `final_value` total como sempre — nada na `use-submit-evaluation.ts` muda.

---

## Layout proposto da tela cheia

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Alan Bulgarelli   [Aberto]                                       [X]  │
│ Cadastrado em 30/04 às 12:13                                          │
├───────────────────────────┬───────────────────────────────────────────┤
│ CONTATO                   │ RAIO-X DO APARELHO  (11 respostas)        │
│  nome / email / fone      │  ✓ Biometria: Sim                         │
│                           │  ✓ Tela: Não, perfeita                    │
│ APARELHO SELECIONADO      │  ✓ Liga: Sim                              │
│  iPhone 13 Pro Max 128GB  │  ✓ NFC: Sim ...                           │
│  Preço base: R$ 2.300,00  │                                           │
│                           │ RESUMO FINANCEIRO                         │
│ ENDEREÇO                  │  Preço base       R$ 2.300,00             │
│  ...                      │  Bônus            R$    50,00  (extra)    │
│                           │  Deduções         − R$ 100,00             │
│ LINHA DO TEMPO            │  Valor final      R$ 2.250,00             │
│  Criado / Termos / ...    │                                           │
│                           │ AJUSTE COMERCIAL                          │
│ [Enviar Proposta WA]      │  [Toggle R$ / %] [Bônus] [Salvar]         │
│                           │                                           │
│                           │ CONTRATO                                  │
│                           │  [Baixar original]  [Baixar ajustado]     │
│                           │                                           │
│                           │ ANOTAÇÃO INTERNA                          │
└───────────────────────────┴───────────────────────────────────────────┘
```

---

## Detalhes técnicos

**Arquivos modificados**
- `src/pages/admin/AdminCustomers.tsx` — substituir `Sheet` por `Dialog` full-screen, refatorar `LeadDetail` para grid 2-col, integrar `CommercialAdjustmentSection` + `ContractDownloadButtons`, ampliar `evaluations` query para retornar a row completa (não só `final_value`).
- `src/components/admin/ProposalDetailSheet.tsx` — remover bloco "Ajuste comercial + Contratos" (linhas 472-478) e imports não usados.

**Sem mudanças em**
- `src/components/admin/CommercialAdjustmentSection.tsx`
- `src/components/admin/ContractDownloadButtons.tsx`
- `src/lib/proposal-override.ts`, `src/lib/admin-contract.ts`, `src/lib/contract.ts`
- `src/hooks/use-submit-evaluation.ts` (API/webhook intactos)
- Banco / RPCs

**Compatibilidade**
- Todo fluxo público (calculadora cliente) e integrações externas permanecem idênticos.
- Cupom já emitido continua válido; ajuste só re-grava `base_price`/`final_value` localmente para refletir no contrato ajustado.
