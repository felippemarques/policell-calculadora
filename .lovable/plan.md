

# Calculadora Trade-in Pollicell

## Visão Geral
Aplicação web com calculadora de trade-in para dispositivos móveis, onde o cliente informa seus dados, seleciona o aparelho, indica avarias e recebe uma cotação com cupom de desconto para usar na loja.

## Fase 1 — Banco de Dados e Motor de Cálculo
- Criar tabelas no Lovable Cloud (Supabase):
  - **devices**: marca, modelo, preço base
  - **damage_categories**: tipo de dano (tela, botões, câmera, etc.)
  - **damage_deductions**: valor de desconto por dano, vinculado ao modelo
  - **evaluations**: dados do cliente, aparelho, danos, valor final, status, cupom gerado
- Importar dados da planilha do usuário para popular `devices` e `damage_deductions`
- Implementar lógica de cálculo: **Preço Base − Σ Danos = Valor Final**

## Fase 2 — Landing Page + Wizard (Calculadora)
- Landing page minimalista e moderna com cores customizáveis via design tokens
- Seção de vídeos educativos (Trade-in vs Compra) com embed de YouTube/Vimeo
- Wizard step-by-step:
  - **Step 1**: Dados pessoais (nome, email, telefone)
  - **Step 2**: Seleção de marca → modelo (dados do banco)
  - **Step 3**: Checklist de condições/avarias (checkboxes dinâmicos do banco)
- Tela de resultado:
  - Valor final da avaliação
  - Código do cupom gerado
  - Link da loja + botão para copiar cupom
  - 3 botões de ação: Comprar Agora (link + cupom), Aguardar Contato (webhook N8N), Falar com Especialista (webhook N8N)

## Fase 3 — Integrações
- **Edge Function para Tray/Bagy**: criação automática de cupom de desconto via API (com base na doc fornecida pelo usuário)
- **Webhooks N8N**: disparos para os cenários "Aguardar Contato" e "Atendimento Imediato" com dados do lead e cotação
- **Endpoint público para ERP (WM10)**: `GET /api/evaluation/{coupon_code}` retornando dados do cliente e aparelho avaliado

## Fase 4 — Backoffice Admin
- Painel com autenticação para gerenciar:
  - CRUD de aparelhos e preços base
  - CRUD de regras de desconto por avaria
  - Listagem de avaliações realizadas
- Acesso restrito via RLS e tabela de roles

## Fase 5 — Testes e Ajustes
- Validar precisão do cálculo de deduções
- Testar criação de cupons na API Tray
- Validar webhooks N8N
- Garantir responsividade mobile-first

