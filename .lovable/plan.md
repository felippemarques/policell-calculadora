

## Plano: Mascaras, validacao e orientacao de imagem no AdminHeader

### O que sera feito

1. **Mascara de telefone** — campo Telefone formatado automaticamente como `(99) 99999-9999`
2. **Validacao de e-mail** — verificar formato valido antes de salvar, exibir erro inline
3. **Validacao de URLs** — campos WhatsApp, Instagram, Facebook e TikTok validam se comecam com `https://`
4. **Orientacao de imagem para logo** — ao fazer upload, ler as dimensoes da imagem com `Image()` e:
   - Exibir as dimensoes detectadas (ex: "1200 x 400px")
   - Recomendar tamanho ideal (ex: "Recomendado: 300x80px, formato PNG transparente")
   - Avisar se a imagem for muito grande ou desproporcional (ex: ratio > 5:1 ou < 2:1)
   - Nao bloquear o upload, apenas orientar

### Detalhes tecnicos

**Arquivo**: `src/pages/admin/AdminHeader.tsx`

- Mascara de telefone: funcao `maskPhone(value)` aplicada no `onChange` do campo phone, permitindo apenas digitos e formatando em tempo real
- Validacao ao salvar (`handleSave`): verificar email com regex simples e URLs com `URL()` constructor; se invalido, exibir `toast.error` e nao prosseguir
- Mensagens de erro inline com `<p className="text-xs text-destructive">` abaixo dos campos invalidos
- Dimensoes da imagem: no `handleLogoUpload`, apos obter o file, criar `new Image()` com `URL.createObjectURL`, ler `naturalWidth/naturalHeight`, armazenar no state e exibir dica abaixo do preview

Nenhuma dependencia nova necessaria.

