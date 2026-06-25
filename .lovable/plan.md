# Integração Arena ← Funil Pro (CRM)

Objetivo: receber eventos comerciais do Funil Pro via webhook seguro, atualizar agenda/matrículas apenas para vendedores **vinculados**, e nunca quebrar o fluxo manual atual da Arena.

---

## 1. Banco de dados (migration)

### Tabela `crm_arena_seller_links`
Vincula um `crm_user_id` (UUID do usuário no Funil Pro) a um vendedor da Arena.
- `id`, `crm_user_id` (uuid, unique), `arena_seller_id` (fk sellers, on delete cascade)
- `active` (bool, default true), `created_at`, `updated_at`
- Índice único parcial: apenas um vínculo ativo por `crm_user_id`.

### Tabela `crm_integration_events`
Log auditável de tudo que entra pelo webhook.
- `id`, `event_type` (text), `crm_lead_id` (text), `crm_user_id` (uuid),
  `arena_seller_id` (uuid, nullable), `payload` (jsonb),
  `status` (text: `received` | `processed` | `ignored` | `error`),
  `error_message` (text, nullable), `created_at`, `processed_at`
- Índice em `crm_lead_id`, `event_type`, `created_at`.

### Coluna em `interviews` e `enrollments`
- `crm_lead_id text` (nullable, indexado) — permite deduplicação e UPSERT por lead.

### RLS / GRANT
- `crm_arena_seller_links`: leitura/escrita apenas por staff (admin/diretor/ceo/presidente). `service_role` total.
- `crm_integration_events`: leitura por staff. Escrita apenas via `service_role`.

---

## 2. Endpoint público seguro

Rota TanStack: `src/routes/api/public/crm-webhook.ts` (POST).

Segurança:
- Header `x-crm-signature`: HMAC-SHA256 do raw body usando segredo `CRM_WEBHOOK_SECRET` (gerado via `generate_secret`).
- Comparação `timingSafeEqual`.
- Validação de payload com Zod.
- Usa `supabaseAdmin` (carregado dentro do handler).

Fluxo do handler:
1. Verificar assinatura → 401 se inválida.
2. Validar payload.
3. Inserir log `crm_integration_events` com status `received`.
4. Buscar vínculo ativo por `crm_user_id`. Se não houver → atualizar log para `ignored`, retornar 200 (não erra do lado do CRM).
5. Despachar por `event_type` para o handler correspondente.
6. Atualizar log para `processed` + `processed_at`, ou `error` + `error_message`.

### Mapeamento de eventos
| event_type | Ação na Arena |
|---|---|
| `crm_interview_scheduled` | UPSERT `interviews` por `crm_lead_id` (status `marcada`) |
| `crm_interview_done` | UPSERT `interviews` (status `realizada`) |
| `crm_interview_no_show` | UPDATE `interviews` por `crm_lead_id` → `nao_compareceu` |
| `crm_interview_rescheduled` | UPDATE data/hora + status `reagendada` |
| `crm_enrollment_created` | INSERT em `enrollments` se não existir matrícula com mesmo `crm_lead_id`; marca entrevista relacionada como `fechada` |
| `crm_lost_after_interview` | UPDATE entrevista relacionada → `perdida` |

Deduplicação:
- Entrevistas: chave única parcial `(arena_seller_id, crm_lead_id)` quando `crm_lead_id` não nulo → UPSERT seguro.
- Matrículas: idem; segundo evento `enrollment_created` para o mesmo lead é ignorado (já existe).

---

## 3. UI administrativa

Nova rota `src/routes/integracoes.tsx` (acesso apenas staff), com 2 abas:

### Aba "Vínculos CRM"
- Lista vínculos (`crm_user_id` ↔ vendedor da Arena, status ativo/inativo).
- Form: input `crm_user_id` + select de vendedor + toggle ativo → criar.
- Toggle ativo/inativo inline + botão remover.

### Aba "Logs da integração"
- Tabela paginada (mais recentes primeiro) com filtros por `status` e `event_type`.
- Colunas: data, evento, lead, vendedor, status, erro (se houver).
- Botão "Ver payload" → dialog com JSON.

Acesso via `createServerFn` + `requireSupabaseAuth` (verifica `is_staff`).

Link no menu lateral/AuthBar visível apenas para staff.

---

## 4. Garantias de não-regressão

- Nenhuma alteração em fluxos manuais existentes (`interviews`, `enrollments`, `sellers`, ranking).
- Apenas **adicionamos** coluna `crm_lead_id` nullable (não afeta inserts manuais).
- Vendedores sem vínculo em `crm_arena_seller_links` continuam 100% manuais — eventos do CRM para eles são logados como `ignored` e ignorados.
- Triggers existentes (`enforce_*`, `enrollments_apply_commission`) continuam funcionando — o webhook usa `service_role` mas respeita a lógica de comissão recalculada pelo trigger.

---

## 5. Detalhes técnicos

- Segredo: `CRM_WEBHOOK_SECRET` gerado via `generate_secret` (64 chars).
- URL estável para o Funil Pro: `https://arenaunited.lovable.app/api/public/crm-webhook`.
- Documentação: incluo um README curto em `docs/crm-integration.md` com exemplo de payload, formato da assinatura e exemplo de curl para o time do Funil Pro testar.

---

## Posso aplicar?
Se confirmar, executo nesta ordem:
1. Migration (tabelas + colunas + RLS + GRANTs).
2. Gerar `CRM_WEBHOOK_SECRET`.
3. Criar rota webhook + server functions de admin.
4. Criar UI `/integracoes` com as duas abas.
5. Adicionar link de menu para staff.
6. Doc curta para o time do Funil Pro.
