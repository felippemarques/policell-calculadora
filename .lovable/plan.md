## Objetivo

Quatro melhorias visuais e configuráveis:

1. **Marca como logo** no passo "Escolha seu aparelho" do fluxo (upload via Admin → Marcas).
2. **Banner principal da LP** com até 3 slides em carrossel (auto-rotate, swipe no mobile, setas no desktop), e correção do recorte no mobile.
3. **Tela de início da calculadora (StepChooseFlow)** totalmente configurável via Admin: banner de fundo, ícones customizados para "Trocar" e "Vender", cores dos cartões, com instruções claras de dimensões.
4. **Bug do upload da logo da loja** (print 2): investigar e corrigir o fluxo de upload em `AdminHeader`.

---

## 1. Logos de marca no fluxo

### Banco
Migração para adicionar coluna em `brands`:
```
ALTER TABLE brands ADD COLUMN logo_url text;
```

### Admin (`AuxCrudTab` quando `table='brands'`)
- Adicionar slot de upload de imagem por linha (idêntico ao `ModelImageUploader`): botão "Logo", preview circular, remover.
- Upload no bucket `lp-images` em `brands/{id}.{ext}`.
- Aceita PNG/SVG transparente. Recomendação: 200×200px, fundo transparente, peso < 100KB.
- Mostrar preview da logo na tabela (ao lado do nome).

> Como `AuxCrudTab` é genérico, vou criar um sub-componente `BrandLogoCell` e ativá-lo só quando `table === "brands"` (prop opcional `enableLogo`), preservando o comportamento de cores/armazenamento.

### Fluxo (`StepSelectDevice` — fase brand)
- `brands` deixa de ser `string[]` e passa a ser `{ name, logo_url }[]` (consultar via `useTradeInData` ou query nova).
- Em vez do texto puro no `SelectionCard`, renderizar a logo (altura ~48px, `object-contain`) com o nome embaixo como fallback/legenda discreta.
- Manter `SelectionCard` por texto quando `logo_url` for nulo (graceful fallback).

---

## 2. Carrossel de Hero na Landing Page + fix mobile

### Banco
Já temos `lp_sections` com `image_url` para a seção `hero`. Para suportar até 3 slides, vamos guardar slides extras no campo `layout` (JSON), sem nova tabela:
```
layout.slides = [
  { image_url, title, content, link_url, cta1?, cta2?, bgPosX, bgPosY, vAlign, hAlign, textAlign },
  ...
]
layout.autoplay_ms = 5000   // 0 = desativado
```
O slide 0 continua sendo o "principal" (campos diretos da seção, para retrocompatibilidade). Slides 1 e 2 ficam dentro de `layout.slides`.

### Componente (`HeroSection.tsx`)
- Refatorar para receber `slides[]` (montado a partir do slide principal + `layout.slides`).
- Usar `embla-carousel-react` (já instalado via `components/ui/carousel`).
- Recursos: autoplay com timer configurável, dots de navegação, setas no desktop (>= md), swipe nativo no mobile.
- **Fix mobile crop**: hoje o background usa `bg-cover` com `min-h-[500px]`. No celular o banner de design largo (16:9 / 21:9) corta as laterais.  
  Solução: alterar a estratégia para `<img>` responsivo dentro do slide com `object-contain` opcional via toggle no admin (`fit: "cover" | "contain"`), padrão `cover` mas com `bgPosX/bgPosY` respeitados, e no mobile usar uma altura proporcional (`aspect-[4/5]` no mobile, `aspect-[16/7]` no desktop) em vez de `min-h` fixo. Isso elimina o corte excessivo nas laterais e mantém o foco do banner.

### Admin (`AdminSections` — editor da seção hero)
- Acordeão "Slides do banner" com lista (drag/up-down) — limite de 3.
- Cada slide tem os mesmos campos do hero atual + upload próprio.
- Campo numérico "Tempo de rotação (ms)" com 0 = desativar autoplay.
- Toggle "Ajuste da imagem no mobile" (cover/contain).
- Texto curto explicando dimensões recomendadas: **1920×800px (desktop)** e **1080×1350px (mobile)**, < 400KB, JPG.

---

## 3. Tela de início da calculadora estilizável

### Banco
Reaproveitar `lp_settings` com novas chaves:
```
calc_hero_bg_image       (url)
calc_hero_bg_color       (hex)
calc_hero_text_color     (hex)
calc_hero_title          (texto)
calc_hero_subtitle       (texto)
flow_trade_icon_url      (url)
flow_trade_card_bg       (hex/gradient)
flow_sale_icon_url       (url)
flow_sale_card_bg        (hex/gradient)
```

### Admin (nova página `/admin/calculator-hero` ou aba dentro de "Fluxos")
- Painel idêntico ao `AdminHeader` (`SectionCard` com upload, color pickers, preview live).
- Uploads no bucket `lp-images/calculator/`.
- Instruções de dimensões:
  - **Banner de fundo**: 1920×600px (desktop) / 1080×1200px (mobile), JPG/WebP, < 300KB.
  - **Ícone Trocar/Vender**: 128×128px, PNG transparente, < 50KB.
- Preview ao vivo do `StepChooseFlow` à direita.

### Componente (`StepChooseFlow` + wrapper no `TradeInWizard`)
- Ler novas chaves via `useFlowSettings` (estendido) ou hook novo `useCalcHeroSettings`.
- Aplicar `backgroundImage`/`backgroundColor` no contêiner do passo 1 (hoje texto fixo "Policell - Garantia de entrega e qualidade" na linha 681 do `TradeInWizard`).
- Substituir os ícones Lucide (`ArrowRightLeft`, `Banknote`) por `<img src={iconUrl}>` quando configurado, mantendo Lucide como fallback.
- Aplicar `card_bg` em cada cartão via `style={{ background }}`.
- Garantir responsividade: imagem de fundo com `object-cover` + altura adaptativa.

---

## 4. Bug: upload da logo (print 2)

Sintoma do print: header renderiza só o texto "Policell" — logo não aparece após upload.

Investigar:
- Confirmar que `supabase.storage.from("lp-images").upload(path, file)` está retornando sucesso (logs).
- O `setForm({ ...form, logo_url: urlData.publicUrl })` salva no estado, mas o usuário **precisa clicar em "Salvar Configurações"** para persistir. Provavelmente usuário fez upload e saiu sem salvar.
- Fix de UX: após upload, **disparar `saveMutation` automaticamente só com a chave `logo_url`** (auto-save), e mostrar toast "Logo salva e publicada".
- Adicionar verificação de tamanho/tipo antes do upload (max 2MB, image/*).
- Mostrar mensagem clara se a URL retornada for inválida.

---

## Detalhes técnicos

**Arquivos a alterar/criar:**

- `supabase/migrations/<new>.sql` — `brands.logo_url`, seeds opcionais para chaves `calc_hero_*` e `flow_*_icon_url`/`*_card_bg` em `lp_settings`.
- `src/components/admin/catalog/AuxCrudTab.tsx` — slot de logo opcional para `brands`.
- `src/pages/admin/AdminCatalog.tsx` — passar `enableLogo` na aba Marcas.
- `src/hooks/use-trade-in-data.ts` — incluir `logo_url` na query de marcas.
- `src/components/trade-in/StepSelectDevice.tsx` — renderização de logo na fase brand.
- `src/components/landing/HeroSection.tsx` — refator carrossel com Embla, fix responsivo.
- `src/pages/admin/AdminSections.tsx` — editor de slides extras (até 3) e autoplay.
- `src/pages/admin/AdminHeader.tsx` — auto-save da logo após upload + validação.
- `src/pages/admin/AdminCalculatorHero.tsx` (novo) — painel de personalização.
- `src/components/admin/AdminLayout.tsx` — adicionar item "Tela da Calculadora" no menu.
- `src/hooks/use-flow-settings.ts` — incluir novas chaves de calc_hero/icons/card_bg.
- `src/components/trade-in/StepChooseFlow.tsx` — usar imagens e cores configuráveis.
- `src/components/trade-in/TradeInWizard.tsx` — aplicar background/título configuráveis na tela inicial.

**Performance:** todos os uploads usarão `lp-images` (bucket público já existente, com cache no Supabase CDN). Ícones e logos pequenos não impactam carregamento.

**Compatibilidade:** todas as mudanças têm fallbacks (sem logo → texto; sem slides extras → comportamento atual; sem icone customizado → Lucide).