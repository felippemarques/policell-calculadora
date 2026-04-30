
# Esconder valores no fluxo + Toggle de preço base configurável

## Decisões confirmadas
- **IMEI**: mantém como está hoje (cliente preenche IMEI já sabendo o valor — esse momento é proposital).
- **Cupom Especial**: mantém como está hoje.
- **Foco**: esconder cifras e percentuais nas etapas de **avaliação** (danos, riscos, bateria, condição, etc.) e tornar o **preço base do aparelho** (o card "SELECIONADO" do print, mostrado nas telas de armazenamento e cor) **configurável via admin**.

---

## O que muda na prática

### 1. Toggle "Mostrar preço base na calculadora" (Admin)
Novo controle em **Admin → Configurações de Negócio** (`AdminBusinessSettings.tsx`):
- Label: "Mostrar preço base do aparelho na calculadora"
- Descrição: "Quando ligado, o cliente vê o valor base do aparelho ao escolher armazenamento e cor (ideal para campanhas promocionais). Quando desligado, o cliente segue todo o fluxo e só descobre o valor no resultado final."
- Default: **desligado** (esconder).
- Persistido em `lp_settings` com a chave `business_show_device_base_price` (segue o padrão das outras flags da tabela — sem mudança de schema).

### 2. Preço base do aparelho (`StepSelectDevice.tsx`)
Os 3 lugares que hoje mostram "R$ X" passam a respeitar o toggle:
- **Lista de armazenamentos** → R$ ao lado de cada capacidade
- **Card "SELECIONADO" do armazenamento** (o do print)
- **Card "SELECIONADO" da cor**

Comportamento:
- **Toggle ligado**: mostra o valor com tratamento promocional (badge "Oferta especial", cor de destaque) — fica evidente que é uma promoção.
- **Toggle desligado**: o R$ desaparece dos 3 pontos. O card "SELECIONADO" continua aparecendo, mas só com modelo + capacidade + cor (sem cifra).

### 3. Avaliação — esconder TODAS as cifras e percentuais (sempre, sem toggle)
- **`StepEvaluationChecklist.tsx`**: remover os badges de dedução por resposta (ex: "−R$ 50,00", "−15%", "−R$ 80"). As opções aparecem só com texto + emoji, sem revelar o impacto financeiro.
- **`TradeInWizard.tsx`** (e equivalente do fluxo de venda, se houver): remover o **rodapé flutuante "Valor estimado: R$ X"** que acompanha o cliente durante toda a avaliação.
- **Tela de condição geral do aparelho** (impecável / normal / com marcas): se houver percentual ou R$ visível, esconder também.

### 4. O que NÃO muda
- **`StepImei.tsx`**: intacto (mostra "Sua proposta até aqui" e o aviso de bônus +X% — é o momento em que o cliente já precisa ver o valor pra decidir preencher IMEI).
- **`StepSpecialOffer.tsx`** (Cupom Especial): intacto.
- **`StepResult.tsx`**: intacto — é onde o cliente finalmente vê o valor cheio.
- **Lógica de cálculo (`computePricing`)**: intocada. Tudo continua sendo calculado normalmente no backend/estado, só não é exibido.
- **Banco de dados**: nenhuma mudança de estrutura. Apenas um `INSERT` da nova chave em `lp_settings`.

---

## Fluxo do cliente — antes vs depois (com toggle desligado)

```text
ANTES                                    DEPOIS
─────                                    ──────
Escolhe modelo                           Escolhe modelo
Escolhe armazenamento (vê R$)            Escolhe armazenamento (sem R$)
Escolhe cor (vê R$)                      Escolhe cor (sem R$)
Avaliação: "Tela trincada −R$ 200"       Avaliação: "Tela trincada" (sem valor)
Rodapé flutuante: "Valor: R$ 1.450"      [sem rodapé]
IMEI (vê proposta + bônus)               IMEI (vê proposta + bônus) ← igual
Cupom especial                           Cupom especial ← igual
Resultado: R$ final                      Resultado: R$ final ← surpresa
```

Com **toggle ligado** (modo promocional), o preço base reaparece nas telas de armazenamento/cor com destaque "Oferta", mas as cifras de avaliação continuam escondidas.

---

## Detalhes técnicos

### Arquivos alterados
- `src/hooks/use-business-settings.ts` — adicionar `show_device_base_price: boolean` ao tipo e ao mapeamento (chave `business_show_device_base_price`, default `false`).
- `src/pages/admin/AdminBusinessSettings.tsx` — novo Switch + descrição.
- `src/components/trade-in/StepSelectDevice.tsx` — envolver os 3 pontos de R$ em `{showBasePrice && ...}` e aplicar styling promocional quando ativo.
- `src/components/trade-in/StepEvaluationChecklist.tsx` — remover badges de `−R$` e `−%` das opções.
- `src/components/trade-in/TradeInWizard.tsx` — remover footer flutuante de valor estimado.
- Verificar fluxo de venda (`StepSale*` se existir) e aplicar a mesma limpeza visual.

### Banco
Apenas **1 INSERT** (sem migration de schema):
```sql
INSERT INTO lp_settings (key, value)
VALUES ('business_show_device_base_price', 'false')
ON CONFLICT (key) DO NOTHING;
```

### Reversibilidade
- Tudo é UI condicional → reverter = remover os `{flag && ...}`.
- Nenhum dado é apagado, nenhuma coluna é alterada.
- Se quiser voltar tudo a aparecer: basta ligar o toggle (preço base) — porém as deduções da avaliação ficam escondidas por design (não tem toggle pra elas, conforme pedido).

---

Pode aprovar? Assim que aprovar, eu já implemento.
