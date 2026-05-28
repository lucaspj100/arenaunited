# Plano técnico — Financeiro Comercial + Equipes

Objetivo: adicionar gestão de equipe (diretor/franqueado) e um módulo financeiro completo (CAC, LTV, MRR, ROI), reutilizando `sellers`, `enrollments`, `interviews`, `user_roles` sem tocar em triggers de comissão, aprovação, ranking ou views existentes.

---

## 1. Novas tabelas (3)

### 1.1 `team_seller_links` — vínculo diretor/franqueado ↔ vendedor
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| manager_user_id | uuid | dono da equipe (auth.users.id) |
| seller_id | uuid | referencia `sellers.id` |
| active | boolean default true | |
| created_at / updated_at | timestamptz | |
| created_by / updated_by | uuid | auditoria |

- **Índice único parcial**: `(seller_id) WHERE active = true` — garante que um vendedor só está em uma equipe ativa por vez. Na UI, se já existir vínculo ativo com outro gestor, mostrar aviso e exigir confirmação (admin pode forçar; diretor/franqueado é bloqueado).
- Não substitui `sellers.director_id` — usado em paralelo, sem migrar dados. Futuro: backfill opcional.

### 1.2 `financial_settings` — configurações globais (1 linha)
Campos conforme spec: `average_lifetime_months` (8), `contract_duration_months` (18), `cancellation_rate` (0.10), `general_automation_cost`, `general_tools_cost`, `paid_traffic_cost`, `other_commercial_costs`, `default_enrollment_fee_type` (`fixed`|`percent`), `default_enrollment_fee_value`, `default_school_retention_percentage`, `updated_at`, `updated_by`.

Seed inicial via migration com defaults.

### 1.3 `seller_financial_settings` — custos por vendedor
| Campo | Tipo |
|---|---|
| id | uuid PK |
| seller_id | uuid UNIQUE → sellers.id |
| monthly_automation_cost | numeric default 0 |
| monthly_tools_cost | numeric default 0 |
| financial_notes | text |
| active_for_financial_analysis | boolean default true |
| updated_at, updated_by | |

---

## 2. Alterações em tabelas existentes

**Nenhuma.** Tudo complementar. `sellers.director_id` continua existindo e é honrado nas policies como fallback (compatibilidade com `is_director_of`).

---

## 3. Funções SQL

### Reaproveitadas (sem alterar)
`is_staff`, `is_seller_like`, `is_director_like`, `is_director_of`, `has_role`, `current_seller_id`.

### Novas (SECURITY DEFINER, search_path=public)
- `is_team_manager(_user_id uuid)` → admin/ceo/presidente/diretor/franqueado (qualquer um que possa ter equipe).
- `manages_seller(_user_id uuid, _seller_id uuid)` → true se existe vínculo ativo em `team_seller_links` **OU** `sellers.director_id = _user_id` (fallback legado).
- `user_can_access_seller(_seller_id uuid)` → true se: `is_staff(auth.uid())` **OU** `manages_seller(auth.uid(), _seller_id)` **OU** vendedor é o próprio (`current_seller_id() = _seller_id`).

Essas funções alimentam as policies novas e os filtros server-side dos dashboards.

---

## 4. RLS / Policies das tabelas novas

### `team_seller_links`
- SELECT: staff (tudo) · gestor dono (`manager_user_id = auth.uid()`) · vendedor vê só linhas do próprio `seller_id`.
- INSERT/UPDATE/DELETE: staff (tudo) · gestor dono apenas em linhas onde `manager_user_id = auth.uid()` E `is_director_like(auth.uid()) OR has_role(auth.uid(),'franqueado')`.
- Vendedor: sem write.

### `financial_settings`
- SELECT: authenticated (todos leem para alimentar fórmulas).
- INSERT/UPDATE/DELETE: somente `is_staff(auth.uid())` (admin/ceo/presidente/diretor) — UI esconde edição para diretor/franqueado puros.

### `seller_financial_settings`
- SELECT: `user_can_access_seller(seller_id)`.
- INSERT/UPDATE/DELETE: `is_staff(auth.uid())` · gestor dono via `manages_seller(auth.uid(), seller_id)`.
- Vendedor: sem write.

GRANTs explícitos: `SELECT,INSERT,UPDATE,DELETE` para `authenticated`; `ALL` para `service_role`. Sem grant `anon`.

---

## 5. Como o filtro de equipe se propaga

Toda query de dashboard passa por um helper único `getAccessibleSellerIds()` (client-side, em `src/lib/access.ts`) que:
1. Carrega `user_roles` do usuário.
2. Se staff → retorna `null` (sem filtro, tudo).
3. Se gestor → `select seller_id from team_seller_links where manager_user_id=auth.uid() and active` + união com `sellers where director_id=auth.uid()` (legado).
4. Se vendedor → `[current_seller_id]`.

Usado para filtrar leituras em: ranking, enrollments, interviews, financeiro. **As policies já bloqueiam**; o helper só evita over-fetch e alimenta selects de filtro.

---

## 6. Arquivos a criar / alterar

### Criar
- `supabase/migrations/<ts>_team_and_financial.sql` — tabelas + funções + policies + seed.
- `src/lib/access.ts` — `getAccessibleSellerIds`, `useAccessibleSellers` hook.
- `src/lib/financial.ts` — fórmulas puras (CAC, LTV, MRR, ROI) + tipos.
- `src/lib/teamLinks.ts` — CRUD de `team_seller_links`.
- `src/lib/financialSettings.ts` — CRUD de `financial_settings` e `seller_financial_settings`.
- `src/routes/equipe.tsx` — aba "Minha Equipe / Equipe da Franquia" (gestor) ou "Equipes" (staff).
- `src/routes/financeiro.tsx` — layout do módulo com sub-tabs.
- `src/routes/financeiro.geral.tsx` — dashboard rede/equipe (escopo automático por papel).
- `src/routes/financeiro.vendedor.$sellerId.tsx` — drill-down por vendedor.
- `src/routes/financeiro.equipes.tsx` — comparativo por equipe (staff e gestor).
- `src/routes/financeiro.config.tsx` — configurações globais + por vendedor.
- `src/components/financial/*` — cards de KPI, tabelas, gráfico mensal (recharts já instalado).
- `src/components/TeamManager.tsx` — seletor de vendedores com aviso de vínculo existente.

### Alterar (mínimo)
- `src/routes/__root.tsx` — adicionar links "Equipe" e "Financeiro" no menu, condicionados ao papel.
- `src/components/RankingView.tsx` — aplicar `getAccessibleSellerIds()` ao `fetchSellers` para gestores (já funciona para staff e vendedor; só adiciona o filtro de gestor). **Não muda lógica de pontuação nem ordem.**
- `src/lib/enrollments.ts` — opcional: aceitar `sellerIds?: string[]` em `fetchEnrollments` para o financeiro filtrar por equipe sem N+1.

### Não tocar
`enrollments_apply_commission`, `enforce_enrollment_status_*`, `enforce_seller_update_scope`, `enforce_interview_update_scope`, `handle_new_user_signup`, `claim_seller_profile`, views agregadas, `EnrollmentFormDialog`, fluxo de aprovação.

---

## 7. Fórmulas (em `src/lib/financial.ts`, puras, testáveis)

Base: `enrollments.status='approved'` no período.

```
commission        = e.commission_amount ?? e.enrollment_value * e.commission_rate
matriculaLiquida  = e.enrollment_value - commission - taxaMatricula(settings)
mrrNovo           = Σ e.monthly_fee
ltv               = e.monthly_fee * settings.average_lifetime_months
ltvAjustado       = ltv * (1 - settings.cancellation_rate)
receitaEsperada   = matriculaLiquida + ltvAjustado
custoVendedor     = sfs.monthly_automation_cost + sfs.monthly_tools_cost
custoGlobal       = Σ(general_automation, general_tools, paid_traffic, other) + Σ custoVendedor
CAC               = custoGlobal / nMatriculasAprovadas        // null se 0
ROIvendedor       = receitaEsperadaVendedor / custoVendedor   // "sem custo" se custo=0
```

Escopo (rede / equipe / vendedor) muda apenas o conjunto de `enrollments` e o conjunto de `seller_financial_settings` somados — fórmula é a mesma.

---

## 8. Escopo por papel (resumo)

| Papel | Equipe (CRUD) | Financeiro geral | Vendedor drill | Config global | Config vendedor |
|---|---|---|---|---|---|
| admin / ceo / presidente | tudo | rede + filtros | qualquer | editar | editar |
| diretor (staff) | tudo | rede + filtros | qualquer | editar | editar |
| franqueado | só própria | só própria equipe | só da equipe | ver | editar da equipe |
| vendedor | — | só próprio | só próprio | — | — |

Obs.: hoje `is_staff` inclui `diretor`. Para diferenciar "diretor-staff" de "franqueado-gestor", a UI usa: staff = `is_staff`; gestor = `is_director_like OR has_role('franqueado')`.

---

## 9. Impacto no ranking

Zero alteração de lógica. O `RankingView` recebe um filtro de `sellerIds` quando o usuário é gestor (já era o caso para vendedor). Ordenação, pesos, score, função `rankSellers` — intactos. Para staff o comportamento é idêntico ao atual.

---

## 10. Entrega incremental (após aprovação)

1. Migration (tabelas + funções + policies + seed).
2. `access.ts` + `teamLinks.ts` + rota `/equipe` (UI de vínculo + aviso de conflito).
3. Aplicar `getAccessibleSellerIds` ao ranking (sem mudar visual).
4. `financialSettings.ts` + rota `/financeiro/config`.
5. `financial.ts` + `/financeiro/geral` (KPIs + gráfico mensal).
6. `/financeiro/equipes` + `/financeiro/vendedor/$id`.
7. Filtros globais (período, vendedor, equipe, status, cargo) num componente compartilhado.

Sem mocks, sem localStorage para dados de negócio, sem edge functions — tudo via Supabase client + RLS.

---

Confirma este plano para eu seguir com a migration?
