# Correções: Header, Banner Mobile e Padrão Apple

## 1) Header do Admin não salva

**Diagnóstico:** Verifiquei o banco e nenhuma das chaves do header (`logo_url`, `phone`, `email`, `whatsapp`, `instagram`, `facebook`, `tiktok`, `header_bg_color`, `header_text_color`, `header_fixed`) existe ainda em `lp_settings`. O código usa `UPDATE … WHERE key = …`, que **não falha mas também não cria a linha** — por isso os campos voltam vazios.

**Correção em `src/pages/admin/AdminHeader.tsx`:**
- Trocar a `saveMutation` para usar `supabase.from("lp_settings").upsert({ key, value }, { onConflict: "key" })` em vez de `update`. Isso cria a linha se não existir e atualiza se já existir.
- Aplicar o mesmo upsert no auto-save da logo (mesma função já no arquivo).
- Após salvar, mostrar toast de confirmação claro com a contagem de campos persistidos.

Sem migração: a tabela já tem `unique(key)` (chaves únicas pelo schema atual de lp_settings).

## 2) Banner principal corta no celular

**Diagnóstico:** O hero mobile usa `aspect-[4/5]` + `object-cover`. Quando a imagem original é horizontal (como a do iPhone enviada), o `cover` corta as laterais — exatamente o que aparece no print ("Ganhe um cupom" cortado à esquerda).

**Correção:**

a) `src/components/landing/HeroSection.tsx`
- Ler dois novos campos do `layoutData`: `mobile_fit` (`"cover"` | `"contain"`, default `cover`) e `mobile_aspect` (`"4/5"` | `"1/1"` | `"3/4"` | `"16/10"`, default `"16/10"` para reduzir corte).
- Trocar `aspect-[4/5]` mobile por classe baseada no `mobile_aspect` escolhido.
- Aplicar `object-${mobile_fit} sm:object-cover` no `<img>`. Quando `contain`, adicionar fundo (`bg` da slide ou `bg-background`) para preencher as bandas laterais.
- Manter focal point (`bgPosX/Y`) funcionando em ambos os modos.

b) `src/pages/admin/AdminSections.tsx` (editor do hero)
- Adicionar dois selects "Proporção no celular" e "Ajuste da imagem no celular (Cobrir / Conter sem cortar)" persistidos no JSON `layout`.
- Texto de ajuda: "Use 'Conter' se a imagem for horizontal e estiver cortando no celular."

## 3) Regra "padrão de escrita Apple" para nomes

Hoje o catálogo tem nomes como `Iphone 14 Pro Max`, com casing inconsistente. Adicionar uma normalização aplicada automaticamente quando o admin digita ou cola nomes de marca/modelo, e um botão "Corrigir nomes existentes" que roda em massa.

**Implementação:**

a) Novo utilitário `src/lib/apple-naming.ts`
- Função `applyAppleCasing(input: string): string` que aplica regras:
  - `iphone` / `ipad` / `ipod` / `imac` / `iwatch` / `airpods` / `macbook` → casing oficial (`iPhone`, `iPad`, `MacBook`, `AirPods`, …).
  - Palavras como `pro`, `max`, `mini`, `plus`, `air`, `ultra`, `se`, `lite` → **Title Case** (`Pro`, `Max`, `Mini`, `Plus`).
  - Numerais romanos / números mantidos.
  - Texto entre parênteses preservado (ex.: `(2nd Gen)` → `(2nd Gen)`).
  - Espaços extras colapsados.
- Suite de testes em `src/lib/apple-naming.test.ts` cobrindo os exemplos do usuário (`Iphone` → `iPhone`, `Pro max` → `Pro Max`, etc.).

b) Aplicar na entrada do admin
- `src/components/admin/catalog/ModelsTab.tsx` e `AuxCrudTab.tsx` (marcas): no `onBlur` do input de nome, chamar `applyAppleCasing` e atualizar o valor antes de salvar. Mostrar mini-hint visual quando o valor mudou ("Ajustado para padrão Apple").
- Toggle por marca: a normalização só roda quando a marca for "Apple" (verificado pelo nome). Para outras marcas, o input permanece livre.

c) Botão de correção em massa
- Em `AdminCatalog` adicionar um botão "Padronizar nomes (padrão Apple)" que:
  1. Lista todos os modelos da marca Apple com nomes que mudariam.
  2. Mostra preview "antes → depois" num diálogo.
  3. Ao confirmar, faz `update` em batch via supabase client (RLS já permite admin).
- Sem migração SQL — apenas UPDATEs disparados pelo client.

d) Documentar no `mem://` 
- Criar `mem://design/apple-naming` com a regra para futuras sessões aplicarem automaticamente.

## Detalhes técnicos

- Sem mudança de schema de banco.
- Sem novas dependências.
- Tudo continua compatível com mobile/responsivo.
- A correção do header não toca chaves de outras seções.

## Resumo dos arquivos

- **edit** `src/pages/admin/AdminHeader.tsx` — upsert
- **edit** `src/components/landing/HeroSection.tsx` — fit/aspect mobile
- **edit** `src/pages/admin/AdminSections.tsx` — controles fit/aspect mobile
- **new**  `src/lib/apple-naming.ts` + teste
- **edit** `src/components/admin/catalog/ModelsTab.tsx` — auto-aplicar no blur
- **edit** `src/components/admin/catalog/AuxCrudTab.tsx` — idem para marcas
- **edit** `src/pages/admin/AdminCatalog.tsx` — diálogo "Padronizar nomes"
- **new**  `mem://design/apple-naming`
