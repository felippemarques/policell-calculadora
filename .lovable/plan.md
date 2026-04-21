

## Refatorar o Drawer de Proposta para o time comercial

Tornar o `ProposalDetailSheet` num "dossiê do cliente" completo, com tudo que o vendedor precisa antes de ligar — sem nova migration (todos os campos já existem em `leads` / `evaluations`).

### O que muda no drawer

**1. Cabeçalho rico** (sempre visível, sticky)
- Nome do cliente em destaque + telefone clicável (`tel:`) + e-mail (`mailto:`)
- Badge da modalidade (Troca/Venda) e status (Em andamento / Concluído / Rejeitado)
- 3 botões grandes lado a lado: **WhatsApp** (mensagem pré-preenchida com aparelho + valor + cupom se houver), **Ligar agora**, **Copiar dossiê**

**2. Bloco "Aparelho do cliente"** (novo, sempre visível)
- Marca, modelo, armazenamento, cor (se houver no catálogo)
- Preço base do aparelho no catálogo (referência)
- IMEI em fonte mono **com botão copiar individual** (funciona pra lead E pra evaluation)
- Aviso visual se IMEI inválido/ausente

**3. Bloco "Resumo financeiro"** (nas evaluations)
- Mantém o breakdown atual (base / desconto condição / deduções / final)
- Adiciona: condição declarada (normal/usado/etc) e número de defeitos
- Cupom em destaque com copiar

**4. Bloco "Defeitos declarados"** (já existe, melhorar)
- Mostrar o impacto monetário/% de cada defeito (não só o nome)

**5. Bloco "Onde parou" (só nos leads in_progress)** — novo
- Lista o que já foi preenchido vs faltando: aparelho ✓, IMEI ✓/✗, endereço ✓/✗, termos ✓/✗, contrato ✓/✗
- Ajuda o comercial saber exatamente o que pedir no WhatsApp

**6. Endereço** (como já está, mas com botão "Copiar endereço")

**7. Linha do tempo curta**
- Criado em / atualizado em / termos aceitos / contrato aceito / cupom emitido
- Em uma linha cada, com ícones

**8. Anotação interna + Arquivar** (mantém como está)

### Função "Copiar dossiê"

Gera texto pronto para colar no CRM/WhatsApp interno, ex.:
```
Cliente: Carlos Lopes — (11) 97187-2128
Aparelho: Apple iPhone 15 Pro Max 128GB
IMEI: 356335104637640
Modalidade: Troca · Em andamento
Valor estimado: R$ 2.808,00 (cupom: ABC123)
Endereço: Rua X, 123 — Assis/SP
Pendente: contrato não aceito
```

### WhatsApp pré-preenchido (melhor)

Mensagem adaptada por contexto:
- **Lead parado**: "Olá Carlos! Vi que você começou a avaliar um iPhone 15 Pro Max 128GB. Posso te ajudar a finalizar?"
- **Evaluation com cupom**: "Olá Carlos! Seu cupom **ABC123** de R$ 2.808 para o iPhone 15 Pro Max está ativo. Posso te ajudar a usar?"
- **Rejeitado**: "Olá Carlos! Sobre seu iPhone 15 Pro Max — temos outras opções, posso te apresentar?"

### Arquivos afetados

- `src/components/admin/ProposalDetailSheet.tsx` — refatoração completa do conteúdo
- `src/lib/whatsapp.ts` — adicionar `buildContextualMessage(kind, lead/eval, device)` 
- `src/lib/proposal-dossier.ts` (novo, ~30 linhas) — função `buildDossierText(...)` reaproveitável

Sem mudanças no banco, sem novas dependências.

