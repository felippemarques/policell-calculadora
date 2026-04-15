

## Plano: Elevar UX de todas as seções ao nível do Hero Banner

### Contexto
O Hero Banner já tem controles de posição, pré-visualizações em tempo real, tooltips, hints e máscaras. As demais 7 seções (Passo a Passo, Como Vender, Benefícios, Depoimentos, FAQ, Mega Footer, Footer) ainda usam editores genéricos sem previews nem validações.

### O que será feito

**1. Passo a Passo** — Preview em tempo real dos 4 passos com ícones renderizados; seletor de ícone via dropdown (smartphone, clipboard, credit-card, gift, etc.) em vez de campo texto livre; contador de caracteres nos campos título (30) e descrição (80).

**2. Como Vender** — Preview ao vivo da seção com itens numerados + imagem lateral; validação de dimensões da imagem (600×800px recomendado) com detecção automática como feito na logo do AdminHeader; contadores de caracteres.

**3. Benefícios / Facilidades** — Preview dos cards renderizados; seletor de ícone dropdown (shield, zap, thumbs-up, banknote); validação de URL do YouTube com mensagem inline; preview do vídeo embed se URL válida; limite visual de 4 cards reforçado.

**4. Depoimentos** — Preview dos cards de depoimento com estrelas; validação de URL da foto (https://); preview da foto inline ao colar URL; contadores: nome (30), texto (200).

**5. Dúvidas Frequentes** — Preview em accordion funcional dentro do editor; contadores: pergunta (80), resposta (300); reordenação drag visual (setas ▲▼).

**6. Mega Footer** — Preview renderizado das colunas com links; validação de URLs dos links (https://); hint sobre limites (máx. 4 colunas, 6 links por coluna).

**7. Footer** — Preview do rodapé final com cores aplicadas; placeholder dinâmico com ano atual; hint de caracteres (100).

### Melhorias transversais

- **Reordenação** — Botões ▲/▼ em todos os ListEditor para mover itens sem precisar excluir e recriar
- **Validação ao salvar** — URLs com https://, campos obrigatórios não vazios, toast de erro específico
- **Preview de seção** — Cada seção terá um mini-preview estilizado mostrando como ficará na landing page, similar ao que o Hero já tem
- **Detecção de imagem** — Reutilizar lógica de dimensões do AdminHeader no ImageUploader (mostrar WxH detectados + aviso de proporção)

### Detalhes técnicos

**Arquivo**: `src/pages/admin/AdminSections.tsx`

- Expandir `ImageUploader` para detectar dimensões via `new Image()` + `URL.createObjectURL` e exibir feedback
- Criar componente `IconPicker` com dropdown dos ícones disponíveis (lucide) mapeados ao `iconMap` existente nas seções
- Criar previews específicos: `StepsPreview`, `BenefitsPreview`, `TestimonialsPreview`, `FaqPreview`, `FooterPreview`, `MegaFooterPreview`, `HowToSellPreview`
- Adicionar funções `moveUp(i)` / `moveDown(i)` ao `ListEditor`
- Validação no `handleSave`: iterar content array e verificar campos obrigatórios preenchidos

Nenhuma dependência nova. Nenhuma alteração de banco de dados.

