
# Ranking mensal + Histórico

Hoje o ranking lê colunas acumuladas em `sellers` (`deals`, `material`, `week_*`). Por isso ele "carrega" mês passado. A solução é calcular o ranking sempre a partir de fatos datados (matrículas e entrevistas) filtrados pelo mês vigente, e snapshotar o fechamento.

## 1. Banco de dados (migration nova)

**Tabela `monthly_ranking_snapshots`** (histórico fechado):
- `id`, `seller_id`, `seller_name` (snapshot), `role_snapshot`, `manager_user_id` (snapshot do franqueado/diretor), `month` (int 1-12), `year` (int), `final_position`, `total_scheduled`, `total_completed`, `total_enrollments`, `total_material` (numeric), `total_score` (numeric), `conversion_rate` (numeric), `closed_at`.
- Unique (`seller_id`, `month`, `year`).
- RLS:
  - staff (admin/ceo/diretor/presidente): SELECT tudo
  - franqueado/gerente: SELECT onde `manages_seller(auth.uid(), seller_id)`
  - vendedor: SELECT do próprio (`seller_id = current_seller_id()`)
  - INSERT/UPDATE só service_role (job de fechamento)

**Cron de fechamento** (`pg_cron` + função SQL `public.close_previous_month_ranking()`):
- Roda dia 1 às 00:05 do fuso do projeto.
- Para o mês anterior: agrega `enrollments` (status=approved) e `interviews` por seller_id, calcula posição final usando o mesmo critério (matrículas → material → score), insere em `monthly_ranking_snapshots` (ON CONFLICT DO NOTHING).
- Snapshot também `manager_user_id` via `team_seller_links` ativo no momento do fechamento.

## 2. Camada de dados (frontend)

**Novo `src/lib/monthlyRanking.ts`**:
- `fetchCurrentMonthRanking()`: lê `enrollments` (mês vigente, approved) + `interviews` (mês vigente) agrupados por seller, junta com `sellers` (nome/role/avatar/metas) e devolve no formato `Seller` que o ranking já consome — mas com `deals`/`material`/`weekScheduled`/`weekCompleted`/`weekEnrollments` = totais **do mês**.
- `fetchRankingHistory({ month, year, sellerId?, managerUserId?, role? })`: lê `monthly_ranking_snapshots` com filtros, respeitando RLS.
- `closeCurrentMonthClient()` (opcional, admin): chama a SQL function manualmente para reprocessar.

## 3. `RankingView.tsx`

- Substituir `fetchSellers()` por `fetchCurrentMonthRanking()` na origem dos dados do ranking principal (manter `fetchSellers` para edição/cadastro/CRUD em outras telas).
- KPIs "Material vendido", "Matrículas fechadas", "Líder do mês" passam a refletir o mês.
- Adicionar duas abas no topo da seção principal: **Ranking Atual** | **Histórico**.

## 4. Nova aba "Histórico"

Componente `RankingHistory.tsx` com:
- Seletor de **mês** e **ano** (padrão: mês anterior).
- Filtros conforme perfil:
  - vendedor: bloqueado em si mesmo, só vê seus meses.
  - franqueado/gerente: filtro de vendedor (lista da equipe via `team_seller_links`).
  - admin/ceo/diretor/presidente: filtro de vendedor, franqueado/unidade (manager_user_id), cargo.
- Tabela: Posição · Vendedor · Cargo · Marcadas · Realizadas · Matrículas · Conversão · Pontuação.
- Botão "Copiar CSV" para admin/diretor/franqueado.

## 5. "Meu histórico" do vendedor

Na página `/perfil` (ou em `vendedor.$sellerId.tsx` quando é o próprio), adicionar bloco "Meu histórico" mostrando lista mensal do próprio vendedor + delta vs mês anterior (matrículas e pontuação).

## 6. Preservação dos dados antigos

Nada é apagado:
- `sellers.deals`, `sellers.material`, `sellers.week_*` continuam existindo (são usados em outras telas e na edição manual). O ranking simplesmente para de **lê-los** como fonte de verdade; passa a derivar do fato datado.
- O primeiro fechamento populará `monthly_ranking_snapshots` para o(s) mês(es) anteriores que já têm `enrollments`/`interviews` registrados.

## 7. Etapas de entrega

1. Migration: tabela `monthly_ranking_snapshots` + função SQL `close_previous_month_ranking()` + cron + backfill dos meses anteriores existentes.
2. `src/lib/monthlyRanking.ts` (current + history).
3. Refator de `RankingView.tsx`: abas Atual/Histórico, fonte de dados mensal.
4. Componente `RankingHistory.tsx` com filtros por perfil.
5. Bloco "Meu histórico" em `/perfil`.

## Pontos a confirmar

- **Fuso para virada do mês**: usar `America/Sao_Paulo`? (afeta a função SQL e o filtro do mês vigente).
- **`monthScheduled`/`monthCompleted`** já existem nas queries de `fetchSellers` (vejo o campo em `Seller`); confirmar se são totais do mês — se sim, posso reutilizar a mesma lógica para o ranking mensal.
- Posso assumir que **matrículas pendentes** NÃO contam no ranking (só `approved`)?
