## Objetivo

1. **Contrato do cliente (fluxo público)**: mostrar **preço base** e **bônus** em **linhas separadas** (hoje saem somados em `final_value`).
2. **Tela do cliente / API n8n**: continuam recebendo o **valor total somado** (cupom). Estrutura do payload **não muda**.
3. **Painel admin (Raio-X)**: comercial pode editar **preço base** e **bônus** (R$ ou %) nos dois fluxos. Ao salvar:
   - O **novo `final_value` ajustado** é gravado e seria o valor usado caso uma nova chamada de API fosse disparada (cupom = total ajustado).
   - O contrato ajustado mostra um bloco **"De: R$ X → Para: R$ Y"** com a diferença identificada como **"Bônus extra do comercial"**.
4. **Painel admin → PDF**: dois botões — **"Original do cliente"** (snapshot do que o cliente assinou) e **"Ajustado pelo comercial"** (com o bloco De/Para).

Banco **não muda de estrutura** — reutilizamos as colunas de `evaluations`.

---

## Como gravar o ajuste sem migrar o banco

Colunas existentes em `evaluations`:
- `base_price`, `condition_discount`, `total_deductions`, `final_value` → recalculados ao salvar o ajuste.
- `internal_notes` → guarda um bloco JSON com **snapshot do original** + **dados do ajuste** (tipo do bônus, valor antigo, novo, quem ajustou, quando).

Formato dentro de `internal_notes`:
```
<observação livre opcional>

<!--PROPOSAL_OVERRIDE_V1
{
  "original": { "basePrice": 2300, "bonusPercent": 5, "bonusValue": 115, "finalValue": 2415 },
  "override": { "basePrice": 2400, "bonusType": "money", "bonusValue": 200, "finalValue": 2500 },
  "extraBonus": 85,                  // diferença = "Bônus extra do comercial"
  "updatedAt": "2026-04-30T22:30:00Z",
  "updatedBy": "<email do admin>"
}
PROPOSAL_OVERRIDE_V1-->
```

Helpers em `src/lib/proposal-override.ts` (novo) fazem parse/serialize do bloco.

---

## Contrato do cliente (passo 8)

Arquivo: `src/lib/contract.ts` (`buildEvaluationReport`) e `DEFAULT_TEMPLATE` em `src/components/trade-in/StepContractPreview.tsx`.

Hoje a "Composição do valor" mistura bônus apenas como `+%`. Vai virar:

```
• Valor base de mercado ........................ R$ 2.300,00
• Desconto percentual (X% sobre base) .......... − R$ Y,YY
• Deduções fixas por defeitos declarados ....... − R$ Z,ZZ
• Bônus de troca/venda (5%) .................... + R$ 115,00
─────────────────────────────────────────────────
• VALOR FINAL DA PROPOSTA ...................... R$ 2.415,00
```

Mudanças:
- `ContractData` ganha campo opcional `bonusValue?: number`.
- `buildEvaluationReport` renderiza o bônus em **R$** explícito (e mantém o "%" entre parênteses), funcionando igual para troca e venda.
- `DEFAULT_TEMPLATE` (seção III) atualizado para listar base e bônus separados.

A tela (`StepSpecialOffer`, `StepResult`) **continua somando** na exibição do cupom — nenhuma alteração ali.

---

## API n8n: payload mantido

`src/hooks/use-submit-evaluation.ts` continua enviando `value: data.finalValue` exatamente como hoje. O `finalValue` que chega ali já é o **total somado** (base − descontos + bônus), e esse comportamento é preservado.

Quando o admin ajustar a proposta no painel:
- O `final_value` na tabela é atualizado para o novo total.
- **Não disparamos nova chamada n8n automaticamente** (o cupom já foi emitido).
- Se a operação exigir reemissão de cupom, fica como ação manual futura. (Caso queira reemissão automática, sinalize que adicionamos esse passo.)

---

## Painel admin — `ProposalDetailSheet.tsx` (Raio-X)

Nova seção **"Ajuste comercial"** (visível apenas para `kind === "evaluation"`), entre "Resumo financeiro" e "Defeitos declarados":

```
┌─ Ajuste comercial ──────────────────────────────────────┐
│ Preço base                                              │
│   Original: R$ 2.300,00                                 │
│   Novo:     [ R$ 2.400,00 ]                             │
│                                                         │
│ Bônus     ( ) %   ( • ) R$                              │
│   Original: 5% (R$ 115,00)                              │
│   Novo:     [ R$ 200,00 ]                               │
│                                                         │
│ ─────────────────────────────────────────────           │
│ Cupom (valor total):                                    │
│   De:   R$ 2.415,00                                     │
│   Para: R$ 2.500,00                                     │
│   Bônus extra do comercial: + R$ 85,00                  │
│                                                         │
│ [ Salvar ajuste ]   [ Reverter para original ]          │
└─────────────────────────────────────────────────────────┘
```

- Toggle %/R$ para o tipo do bônus.
- Inputs com `<CurrencyInput>` (já existe em `src/components/ui/currency-input.tsx`).
- "Salvar ajuste" chama RPC nova `apply_proposal_override` que faz `UPDATE evaluations SET base_price, final_value, internal_notes`.
- "Reverter" chama `revert_proposal_override` que restaura `base_price`/`final_value` originais lidos do JSON e remove o bloco override.
- O bloco do **Cupom destacado** no topo do sheet passa a exibir o `final_value` ajustado com badge **"Ajustado pelo comercial"**.

---

## Botões de PDF no painel

Logo abaixo do bloco do Cupom, dois botões:

```
[ Baixar contrato — original do cliente ]
[ Baixar contrato — ajustado pelo comercial ]   ← desabilitado se sem override
```

Cada botão monta um `ContractData` e chama `renderContractText` + `generateContractPdf` (já existem):

- **Original**: usa o snapshot `original` do JSON (ou os valores atuais se nunca houve ajuste).
- **Ajustado**: usa `override`, e injeta um **novo bloco extra no contrato**, logo após o "LAUDO TÉCNICO":

```
REVISÃO COMERCIAL DA PROPOSTA

Valor original da proposta: R$ 2.415,00
Bônus extra concedido pelo comercial: + R$ 85,00
NOVO VALOR FINAL: R$ 2.500,00

Ajuste registrado em 30/04/2026 22:30 por <admin>.
Este valor substitui o valor da proposta original para fins
de geração do cupom de desconto.
```

Esse bloco extra fica isolado em `buildOverrideAddendum()` no novo `src/lib/admin-contract.ts`, que também reconstrói:
- `evaluationItems` (a partir de `evaluations.damages`, fazendo lookup em `condition_discounts`/`damage_deductions`/`damage_categories`).
- `customerAddress` e `imei` (lendo do `lead` correspondente — match por `customer_email` ou `imei`).

---

## Migração SQL (mínima)

Sem coluna nova. Apenas duas funções `SECURITY DEFINER`:

```sql
create or replace function public.apply_proposal_override(
  _evaluation_id uuid,
  _base_price numeric,
  _final_value numeric,
  _internal_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.evaluations
     set base_price     = _base_price,
         final_value    = _final_value,
         internal_notes = _internal_notes
   where id = _evaluation_id;
end $$;

create or replace function public.revert_proposal_override(
  _evaluation_id uuid,
  _original_base_price numeric,
  _original_final_value numeric,
  _internal_notes text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.evaluations
     set base_price     = _original_base_price,
         final_value    = _original_final_value,
         internal_notes = _internal_notes
   where id = _evaluation_id;
end $$;
```

---

## Arquivos afetados

**Novos**
- `src/lib/proposal-override.ts` — parse/serialize do bloco JSON em `internal_notes`.
- `src/lib/admin-contract.ts` — monta `ContractData` (original e ajustado) + `buildOverrideAddendum`.
- `supabase/migrations/<timestamp>_proposal_override.sql`.

**Editados**
- `src/lib/contract.ts` — `ContractData.bonusValue?`; `buildEvaluationReport` mostra base e bônus em linhas separadas (R$ explícito) para troca **e** venda.
- `src/components/trade-in/StepContractPreview.tsx` — atualizar `DEFAULT_TEMPLATE` (seção III).
- `src/components/trade-in/TradeInWizard.tsx` — passar `bonusValue` para `ContractData` ao montar o passo 8.
- `src/components/admin/ProposalDetailSheet.tsx` — seção "Ajuste comercial" + 2 botões de PDF + badge "Ajustado" no cupom.

**Não tocados** (intencional)
- `src/hooks/use-submit-evaluation.ts` (payload n8n preservado).
- `create_public_evaluation`, `attach_evaluation_coupon`.
- `StepSpecialOffer.tsx` e `StepResult.tsx` (seguem mostrando o total somado).

---

## QA manual

1. **Cliente, fluxo de troca com bônus 5%**: PDF mostra "Valor base R$ 2.300,00" e "Bônus de troca (5%) + R$ 115,00" em linhas separadas; tela do cupom mostra R$ 2.415,00 somado; n8n recebe 2415.
2. **Cliente, fluxo de venda com bônus**: idem, com label "Bônus de venda".
3. **Admin Raio-X**: ajustar base 2.300 → 2.400 e bônus 5% → R$ 200; ver "De: R$ 2.415,00 / Para: R$ 2.500,00 / Bônus extra: + R$ 85,00"; salvar; cupom no topo mostra R$ 2.500,00 com badge "Ajustado".
4. **PDF original** continua com R$ 2.415,00 e a estrutura assinada pelo cliente.
5. **PDF ajustado** mostra o contrato + bloco extra "REVISÃO COMERCIAL" com De/Para e "Bônus extra do comercial".
6. **Reverter**: restaura base_price e final_value originais; botão "Ajustado" volta a ficar desabilitado.