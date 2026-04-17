
## Diagnóstico

Ao clicar em **Começar avaliação**, o frontend chama:

```ts
supabase.from("leads").insert({...}).select("id").single()
```

A migração de segurança recente removeu o `SELECT` público da tabela `leads` (agora só admin pode ler). O `INSERT` funciona, mas o `.select("id").single()` que vem em seguida **retorna 0 linhas pelo RLS**, fazendo `.single()` lançar erro → toast "Não foi possível salvar seus dados".

Mesmo padrão usado em `upsertLeadByEmail` (`findLeadByEmail` faz `SELECT` por email — também bloqueado para anônimos).

`evaluations` não tem esse problema (só faz `.insert()` puro, sem `.select()`).

## Correção

**1 migration + 0 mudanças em código de UI.**

Adicionar uma policy de RLS que permite ao **autor do INSERT** ler de volta a linha que acabou de criar, sem expor a tabela inteira para anônimos:

```sql
-- Permite RETURNING após INSERT/UPDATE para o cliente que está
-- criando/atualizando o lead, mantendo a tabela privada para listagem.
-- Truque: usar uma policy SELECT que casa pelo id contido no statement
-- não funciona; em vez disso, devolvemos o id via uma RPC SECURITY DEFINER.
```

Como o RLS do Postgres não distingue "ler a linha que acabei de inserir" de "ler qualquer linha", a forma correta e segura é trocar o caminho que precisa de retorno por uma **RPC `SECURITY DEFINER`**:

### Passo 1 — migration

Criar duas funções no banco (rodam com privilégios elevados, mas com lógica controlada):

```sql
create or replace function public.create_lead(
  _name text, _email text, _phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.leads (customer_name, customer_email, customer_phone,
                            assessment_responses, status)
  values (_name, _email, _phone, '{}'::jsonb, 'in_progress')
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.upsert_lead_by_email(
  _name text, _email text, _phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare existing_id uuid;
begin
  select id into existing_id from public.leads
   where customer_email = _email
   order by created_at desc limit 1;

  if existing_id is not null then
    update public.leads
       set customer_name = coalesce(nullif(_name,''), customer_name),
           customer_phone = coalesce(nullif(_phone,''), customer_phone),
           status = 'in_progress'
     where id = existing_id;
    return existing_id;
  end if;

  return public.create_lead(_name, _email, _phone);
end $$;

grant execute on function public.create_lead(text,text,text) to anon, authenticated;
grant execute on function public.upsert_lead_by_email(text,text,text) to anon, authenticated;
```

Isso preserva a segurança (anônimos continuam **sem SELECT** na tabela) mas permite o fluxo público da calculadora.

### Passo 2 — `src/hooks/use-lead.ts`

- `createLead`: trocar `insert().select().single()` por `supabase.rpc("create_lead", {...})`.
- `upsertLeadByEmail`: trocar a busca + update/insert por `supabase.rpc("upsert_lead_by_email", {...})` e remover `findLeadByEmail` da lógica pública (mantém o helper só para uso interno autenticado, ou remove).
- `updateLead` / `updateAssessment` / `markRejected` continuam usando `.update().eq("id", id)` — funciona porque a policy `Anyone can update leads by id` permite UPDATE público, e essas chamadas não fazem `.select()` depois.

### Passo 3 — verificação

`npm run build` para garantir que os types regenerados das RPCs compilam, e teste manual da calculadora anônima.

## Por que não simplesmente reabrir SELECT público

Reabrir `SELECT` em `leads` quebra a auditoria de segurança feita anteriormente: qualquer pessoa conseguiria listar todos os leads (nome, email, telefone). A RPC `SECURITY DEFINER` resolve só o caso específico de "devolver o id recém-criado" sem vazar nada além disso.

## Arquivos afetados

- **novo**: `supabase/migrations/<timestamp>_lead_rpcs.sql`
- **editado**: `src/hooks/use-lead.ts`
