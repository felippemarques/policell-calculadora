# Cupom Trade-in Pollicell — Formato e Validação

Documento de referência para qualquer desenvolvedor (interno ou da API externa)
que precise **gerar, ler ou validar** os cupons emitidos pela calculadora de
trade-in.

---

## 1. Visão geral

Quando o cliente conclui uma avaliação na calculadora, o frontend gera um
**cupom curto e assinado** e o salva na coluna `coupon_code` da tabela
`evaluations` no Supabase.

O cupom NÃO é aleatório. Ele é uma string Base64URL que carrega, de forma
compacta, **três informações + uma assinatura**:

| Campo | O que é | Por que está no cupom |
|------|---------|----------------------|
| `lead8` | Primeiros 8 chars do `lead_id` (sem hífens) | Permite localizar o lead na base |
| `cents` | `final_value * 100` (inteiro, em centavos) | Trava o valor que foi prometido ao cliente |
| `ts36` | Timestamp Unix em **segundos**, em base36 | Permite expirar cupons antigos |
| `hash6` | FNV-1a 32-bit dos 3 campos acima, 6 chars hex | Assinatura — detecta adulteração |

Resultado final: uma string Base64URL de **até 12 caracteres**, ex.: `Yzg5MS4xMjM0`.

---

## 2. Como o cupom é gerado (frontend)

Arquivo: [`src/hooks/use-submit-evaluation.ts`](../src/hooks/use-submit-evaluation.ts)

### 2.1. Payload em texto

```
<lead8>.<cents>.<ts36>.<hash6>
```

Exemplo concreto:

```
lead_id     = "c891f0a4-7e2b-4d9c-9a01-..."  → lead8 = "c891f0a4"
final_value = 1234.50                         → cents = "123450"
Date.now()  = 1734567890000                   → ts36  = "m4q9k2"  (segundos em base36)
hash6       = fnv1a("c891f0a4.123450.m4q9k2") → "a3f1e7"

payload     = "c891f0a4.123450.m4q9k2.a3f1e7"
coupon      = base64url(payload).slice(0, 12)
```

### 2.2. Hash FNV-1a (assinatura)

A função usada é o **FNV-1a 32-bit** — leve, determinística, sem dependências
e fácil de portar para qualquer linguagem. **Não é criptograficamente seguro**
(não use para autenticação real); serve para **detectar adulteração casual**
do cupom (cliente trocando o valor manualmente, por exemplo).

```ts
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
```

> Para upgrade futuro: trocar FNV-1a por **HMAC-SHA256** com uma `secret`
> guardada em Supabase Secrets, gerando o cupom dentro de uma edge function.
> Veja seção 6.

### 2.3. Base64URL (sem `+`, `/`, `=`)

Codificação URL-safe — o cupom pode ser colado em links, QR codes, query
strings, sem escape:

```ts
function base64UrlEncode(input: string): string {
  const utf8 = unescape(encodeURIComponent(input));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
```

---

## 3. Como a API externa valida o cupom

A API externa (Tray, N8N, qualquer endpoint que precise honrar o desconto)
deve seguir **5 passos**:

### Passo 1 — Decodificar Base64URL

Reverter `-` → `+`, `_` → `/`, adicionar padding `=` até múltiplo de 4, e
aplicar `atob` (ou equivalente na linguagem).

### Passo 2 — Split por `.`

O resultado deve ter **exatamente 4 partes**: `[lead8, cents, ts36, hash6]`.
Se tiver outra quantidade → cupom inválido.

### Passo 3 — Recomputar o hash

```
expectedHash = fnv1a(`${lead8}.${cents}.${ts36}`).slice(0, 6)
```

Se `expectedHash !== hash6` → **cupom adulterado, rejeitar**.

### Passo 4 — Buscar o lead/evaluation no Supabase

Usar o `lead8` como prefixo para encontrar o registro:

```sql
SELECT id, final_value, created_at, status
FROM evaluations
WHERE coupon_code = $1   -- forma mais direta: lookup pelo cupom inteiro
LIMIT 1;
```

ou, se preferir validar pelo lead:

```sql
SELECT id, final_value
FROM leads
WHERE replace(id::text, '-', '') LIKE ($1 || '%')
LIMIT 1;
```

### Passo 5 — Conferir integridade dos dados

- `cents / 100 === evaluation.final_value` → o valor não foi adulterado
- `Date.now()/1000 - parseInt(ts36, 36) < TTL` → cupom não expirou (recomendado: 7 dias)
- `evaluation.status` em estado válido (`pending`, não `used`/`expired`)

Se tudo bater → cupom **válido**, pode aplicar o desconto.

---

## 4. Implementação de referência (Node.js)

Cole isto na sua API externa (qualquer runtime JS/TS):

```ts
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (input.length % 4)) % 4);
  // Node: Buffer.from(padded, "base64").toString("utf8")
  // Browser: decodeURIComponent(escape(atob(padded)))
  return Buffer.from(padded, "base64").toString("utf8");
}

interface CouponPayload {
  leadShort: string;
  finalValue: number;   // já em reais (não centavos)
  issuedAt: Date;
  isValid: boolean;     // true se o hash bate
}

export function decodeCoupon(coupon: string): CouponPayload | null {
  try {
    const decoded = base64UrlDecode(coupon);
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;

    const [leadShort, cents, ts36, hash6] = parts;
    const expected = fnv1aHash(`${leadShort}.${cents}.${ts36}`).slice(0, 6);

    return {
      leadShort,
      finalValue: parseInt(cents, 10) / 100,
      issuedAt: new Date(parseInt(ts36, 36) * 1000),
      isValid: expected === hash6,
    };
  } catch {
    return null;
  }
}

// Uso:
const payload = decodeCoupon("Yzg5MS4xMjM0");
if (!payload || !payload.isValid) {
  // rejeitar
}
// payload.leadShort  → "c891f0a4"
// payload.finalValue → 1234.50
// payload.issuedAt   → Date
```

---

## 5. Exemplo de fluxo end-to-end

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Cliente     │──────▶│  Frontend    │──────▶│  Supabase    │       │  API Externa │
│ /calculadora │       │ (hook gera   │ INSERT│  evaluations │       │  (Tray/N8N)  │
└──────────────┘       │  cupom)      │ row   │  coupon_code │       └──────────────┘
                       └──────────────┘       └──────────────┘              ▲
                              │                                              │
                              │ mostra cupom na tela                         │
                              ▼                                              │
                       ┌──────────────┐                                      │
                       │  Cliente     │  POST /validate { coupon }           │
                       │  cola cupom  │─────────────────────────────────────▶│
                       │  no checkout │                                      │
                       └──────────────┘                                      │
                                                                             │
                                            decode → split → recompute hash  │
                                            → lookup no Supabase             │
                                            → conferir cents/expiração       │
                                            → aplicar desconto ou rejeitar   │
```

---

## 6. Roadmap — upgrade para HMAC-SHA256

FNV-1a é **detecção de adulteração casual**, não autenticação criptográfica.
Se em algum momento o cupom valer dinheiro real e for atacado, mover a
geração para uma edge function:

```ts
// supabase/functions/issue-coupon/index.ts
const secret = Deno.env.get("COUPON_SIGNING_SECRET")!;
const payload = `${leadShort}.${cents}.${ts36}`;

const key = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(secret),
  { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
);
const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
const sig = base64url(new Uint8Array(sigBuf)).slice(0, 8);

const coupon = base64UrlEncode(`${payload}.${sig}`);
```

A API externa valida com a mesma `secret` (compartilhada via env var).

---

## 7. Resumo rápido (TL;DR)

- **Cupom** = `base64url("lead8.cents.ts36.hash6")`, ≤ 12 chars
- **Gerado** em [`src/hooks/use-submit-evaluation.ts`](../src/hooks/use-submit-evaluation.ts) → `generateCouponCode()`
- **Validar** = decodificar Base64URL → split `.` → recomputar FNV-1a → comparar `hash6` → conferir `cents` contra `final_value` no banco
- **Hash atual** = FNV-1a (suficiente para anti-adulteração casual; para autenticação real usar HMAC-SHA256 em edge function)
- **Lookup no banco**: `SELECT * FROM evaluations WHERE coupon_code = $1`
