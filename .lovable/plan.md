

## Plano: Seções fixas da Landing Page (atualizado)

### Estrutura das 8 seções fixas

```text
1. HERO BANNER
   - Imagem de fundo, título, subtítulo
   - CTA customizável (texto, cor bg, cor texto, radius)
   - Toggle ativo/inativo

2. PASSO A PASSO
   - Título, subtítulo
   - 3-4 passos (ícone/título/descrição) em JSON
   - Cores bg/texto, toggle ativo

3. COMO VENDER (info cards)
   - Título, subtítulo, imagem lateral opcional
   - Lista de bullets/cards em JSON
   - Cores, toggle ativo

4. BENEFÍCIOS / FACILIDADES (ATUALIZADO)
   - Título, subtítulo
   - Linha 1: vídeo do YouTube (URL embed, largura completa)
   - Linha 2: até 4 cards (ícone/título/descrição) em JSON
   - Cores bg/texto, toggle ativo

5. DEPOIMENTOS
   - Título, lista de depoimentos (nome, cidade, texto, foto) em JSON
   - Cores, toggle ativo

6. DÚVIDAS FREQUENTES (FAQ)
   - Título, itens pergunta/resposta em JSON (accordion)
   - Cores, toggle ativo

7. MEGA FOOTER
   - Colunas de links em JSON, texto institucional
   - Cores bg/texto, toggle ativo

8. FOOTER
   - Texto de copyright
   - Cores bg/texto, toggle ativo
```

### Mudanças técnicas

**1. Migração de banco**
- `ALTER COLUMN title DROP NOT NULL` em `lp_sections`
- Adicionar coluna `video_url text` para seções que usam vídeo (seção 4)
- Deletar seções existentes e inserir 8 seções fixas com `section_type`: `hero`, `steps`, `how-to-sell`, `benefits`, `testimonials`, `faq`, `mega-footer`, `footer`
- Campo `content` (text/JSON) armazenará dados estruturados (passos, cards, FAQ items, depoimentos, links)

**2. AdminSections.tsx — reescrita**
- Sem botão "Adicionar" ou "Deletar" — apenas editar e toggle ativo/inativo
- Formulário contextual por `section_type`:
  - **Hero**: imagem de fundo + CTA (texto, cores, radius)
  - **Passo a passo**: editor de lista de passos
  - **Como vender**: título + bullets/cards + imagem
  - **Benefícios**: campo de URL YouTube + editor de até 4 cards
  - **Depoimentos**: editor de lista (nome, cidade, texto, foto)
  - **FAQ**: editor de lista pergunta/resposta
  - **Mega Footer**: editor de colunas de links
  - **Footer**: campo de copyright + cores

**3. Index.tsx — reescrita com componentes por seção**
- Hero: banner fullwidth + CTA
- Passo a passo: grid numerado
- Como vender: layout lado a lado
- **Benefícios**: linha 1 com iframe YouTube 100% largura + linha 2 com grid de até 4 cards
- Depoimentos: grid de cards com foto/nome/cidade
- FAQ: accordion (componente existente)
- Mega Footer: grid de colunas
- Footer: barra simples
- Cada seção renderiza apenas se `is_active = true`

**4. Arquivos afetados**
- `supabase/migrations/` — nova migração (schema + seed)
- `src/pages/admin/AdminSections.tsx` — reescrita completa
- `src/pages/Index.tsx` — reescrita com renderizadores dedicados

