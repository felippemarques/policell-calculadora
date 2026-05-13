## Migração Lovable Cloud → Supabase próprio + Vercel

Objetivo: deixar o projeto 100% independente do Lovable, rodando frontend na Vercel e backend num Supabase da sua conta.

---

### Fase 1 — Preparação (sem mexer em nada ainda)

1. **Criar projeto novo no Supabase** (sua conta) — região igual ou próxima do atual (provavelmente `sa-east-1`).
2. **Anotar credenciais novas**: `Project URL`, `anon key`, `service_role key`, `project ref`.
3. **Backup completo do Lovable Cloud atual**:
   - Exportar dump SQL via `pg_dump` (schema + dados) usando a connection string do Lovable Cloud.
   - Exportar arquivos dos buckets `lp-images` e `device-images` (download via API com service role).
   - Salvar lista de secrets atuais (nomes — valores você precisa ter em mãos por outras fontes, secrets nunca são exportados).

### Fase 2 — Recriar schema no Supabase novo

4. **Rodar o dump SQL** no Supabase novo via SQL editor ou `psql`:
   - Tipos (`app_role`)
   - Tabelas (devices, device_models, brands, storages, colors, model_storages, variant_colors, evaluations, leads, lp_sections, lp_settings, lp_videos, profiles, user_roles, condition_discounts, damage_categories, damage_deductions, assessment_criteria, assessment_options, admin_onboarding)
   - Funções (~25: `has_role`, `create_lead`, `update_lead_progress`, `sync_device_for_model_storage`, `is_valid_imei`, etc.)
   - Triggers (`on_auth_user_created`, `validate_evaluation_imei`, `check_imei_duplicate`, `trg_sync_devices_*`, etc.)
   - Políticas RLS de todas as tabelas
5. **Recriar storage buckets** `lp-images` e `device-images` (públicos) + políticas.
6. **Reupload dos arquivos** dos buckets.

### Fase 3 — Migrar dados

7. **Importar dados** do dump (ou via `COPY`/CSV se preferir granular).
8. **Recriar usuários admin** — duas opções:
   - a) Criar manualmente no painel Auth + inserir em `user_roles` com role `admin`.
   - b) Migrar via Auth Admin API (script Node usando service_role, copia `auth.users`).

### Fase 4 — Edge Functions

9. Instalar **Supabase CLI** localmente: `npm i -g supabase`.
10. `supabase link --project-ref <novo-ref>`.
11. **Deploy** das 3 functions: `get-dashboard-metrics`, `get-evaluations`, `manage-admins`.
12. **Recriar secrets** no Supabase novo (Project Settings → Edge Functions → Secrets):
    - `EVALUATIONS_ACCESS_TOKEN`
    - `DASHBOARD_API_KEY`
    - `LOVABLE_API_KEY` → **substituir** por chave direta do provider (Google AI / OpenAI), porque o gateway Lovable deixa de funcionar fora do Lovable.
    - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (geralmente injetados automaticamente).

### Fase 5 — Frontend e Vercel

13. **Atualizar `.env`** local e na Vercel com as 3 variáveis novas:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_PUBLISHABLE_KEY` (= anon key novo)
    - `VITE_SUPABASE_PROJECT_ID`
14. **Regenerar tipos** TypeScript: `supabase gen types typescript --project-id <novo-ref> > src/integrations/supabase/types.ts` (esse arquivo deixa de ser auto-gerado pelo Lovable).
15. **Deploy na Vercel** apontando para o repo Git, com build `npm run build` e output `dist`.
16. **Testar** o fluxo completo: calculadora → resultado → cupom, login admin, dashboard.

### Fase 6 — Integrações externas

17. **Reapontar webhooks/URLs** no N8N e Tray para os novos endpoints `https://<novo-ref>.supabase.co/functions/v1/...`.
18. Atualizar tokens se mudarem.

### Fase 7 — Cutover e cancelamento

19. Validar tudo em paralelo (Lovable Cloud ainda ativo).
20. Apontar domínio `pollicell.lovable.app` para Vercel (ou usar domínio próprio).
21. Só **depois de 1–2 semanas estável**, cancelar a conta Lovable.

---

### Detalhes técnicos importantes

- **Lovable AI Gateway some**: qualquer função que use `LOVABLE_API_KEY` precisa migrar pra API direta do provider escolhido (com chave própria e billing próprio).
- **Tipos Supabase**: `src/integrations/supabase/client.ts` e `types.ts` deixam de ser "intocáveis" — passam a ser arquivos normais que você mantém.
- **`supabase/config.toml`**: trocar `project_id` para o novo ref.
- **Triggers de auth** (`handle_new_user`) precisam ser recriados no Supabase novo manualmente — não vêm em `pg_dump` padrão de schema público.
- **RLS**: validar política por política após import (políticas com `auth.uid()` continuam funcionando porque dependem do JWT, não do projeto).

### Riscos

- Downtime se algum lead/cupom for criado durante o cutover → fazer em janela de baixa demanda.
- Perda de IDs de evaluation se você reimportar dados parcialmente → sempre import completo.
- IMEIs duplicados podem bloquear inserts se o trigger `check_imei_duplicate` rodar antes do bulk insert → desabilitar trigger durante import e reabilitar depois.

### Estimativa de esforço

- Fase 1–2: 2–3h
- Fase 3: 1h
- Fase 4: 1–2h
- Fase 5: 1h
- Fase 6: depende dos integradores
- Total: ~1 dia de trabalho focado + janela de validação

---

### Próximo passo sugerido

Quando você sair do plan mode, eu posso:
1. Gerar o **script de export** (pg_dump + download de buckets) pra você rodar.
2. Gerar o **script de import** pra rodar no Supabase novo.
3. Listar exatamente quais secrets recriar e onde.

Confirma se quer seguir nessa direção?
