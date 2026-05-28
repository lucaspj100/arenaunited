
# Plano — Financeiro Comercial como calculadora editável por equipe/franquia

## 1. Remoção completa de "automação"

Itens a remover (UI, código, banco, textos):

- **UI / Componentes**
  - `src/routes/financeiro.config.tsx`: campo "Custo automações (R$)" (global) e coluna "Automação (R$/mês)" por vendedor.
  - `src/routes/financeiro.geral.tsx`, `financeiro.equipes.tsx`, `financeiro.vendedor.$sellerId.tsx`: qualquer KPI/card/legenda mencionando automação, "investimento em automação", "capacidade de automação", "limite saudável", "simulador de automação".
- **Lógica** (`src/lib/financial.ts`): remover `generalAutomationCost` e `monthlyAutomationCost` das somas; ajustar `FinancialScopeKpis` (remover `generalAutomationCost`, renomear/somar custos individuais sem automação).
- **Tipagem/persistência** (`src/lib/financialSettings.ts`): remover `generalAutomationCost` e `monthlyAutomationCost`.
- **Banco** (migration): `ALTER TABLE financial_settings DROP COLUMN general_automation_cost`; `ALTER TABLE seller_financial_settings DROP COLUMN monthly_automation_cost`.

Nenhuma menção a "automação" sobra no módulo.

## 2. Novas tabelas e ajustes de schema

### 2.1 Nova tabela `team_financial_settings` (LTV editável por escola/franquia)

```
team_financial_settings
  id uuid pk
  manager_user_id uuid unique  -- diretor/franqueado dono
  average_lifetime_months int default 8
  contract_duration_months int default 18
  cancellation_rate numeric default 0.10
  enrollment_fee_type text default 'fixed'   -- 'fixed' | 'percent'
  enrollment_fee_value numeric default 0
  school_retention_percentage numeric default 0
  general_tools_cost numeric default 0
  paid_traffic_cost numeric default 0
  other_commercial_costs numeric default 0
  created_at / updated_at / updated_by
```

- `financial_settings` (global) continua como **fallback** para staff e quando manager não configurou.
- Resolução do escopo: ao calcular para um vendedor, busca `team_financial_settings` do `manager_user_id` (via `team_seller_links` ou `sellers.director_id`); se não existir, usa `financial_settings` global.

### 2.2 Ajustes em `seller_financial_settings`

Adicionar:
- `manager_user_id uuid` (quem cadastrou/é responsável)
- `monthly_salary numeric default 0`
- `other_individual_costs numeric default 0`

Remover:
- `monthly_automation_cost`

Manter: `monthly_tools_cost`, `financial_notes`, `active_for_financial_analysis`.

### 2.3 Ajustes em `financial_settings` (globais)

Remover `general_automation_cost`. Demais campos permanecem como default de rede para staff.

## 3. Onde cada coisa fica salva

| Dado | Tabela |
|---|---|
| LTV/cancelamento/custos gerais da **escola/franquia** | `team_financial_settings` (por `manager_user_id`) |
| LTV/cancelamento/custos gerais **globais (rede)** | `financial_settings` (fallback) |
| Salário e custos individuais do vendedor | `seller_financial_settings` (por `seller_id`) |
| Vínculo vendedor↔gestor | `team_seller_links` (já existe) |

## 4. Permissões (RLS)

### `team_financial_settings`
- `SELECT`: `is_staff(auth.uid())` OR `manager_user_id = auth.uid()` OR usuário é vendedor gerenciado por esse manager (via `manages_seller`).
- `INSERT/UPDATE/DELETE`: `is_staff(auth.uid())` OR (`manager_user_id = auth.uid()` AND (`is_director_like` OR `has_role(..., 'franqueado')`)).
- Vendedor **não edita**; pode ler somente os campos necessários para seu próprio dashboard (sem ver custos comerciais sensíveis — filtrado na app layer).

### `seller_financial_settings`
- Manter políticas atuais (`seller_fin_select`, `seller_fin_manager_*`, `seller_fin_staff_all`).
- App layer **omite `monthly_salary` e `other_individual_costs`** quando o usuário visualizando é o próprio vendedor (não-staff/não-manager).
- Função SQL helper já existe: `user_can_access_seller(_seller_id)`.

### Funções helper
- Reaproveitar `is_staff`, `is_director_like`, `manages_seller`, `user_can_access_seller`.

## 5. Edição restrita por equipe

- Diretor/franqueado: UI de "Custos por Vendedor" lista apenas `getAccessibleSellerIds()` (já implementado).
- `team_financial_settings`: cada manager edita apenas a linha onde `manager_user_id = auth.uid()` (garantido por RLS).
- Admin/CEO/presidente: seletor de equipe para escolher qual `manager_user_id` editar; podem editar qualquer linha.

## 6. Vendedor protegido

- `financeiro.vendedor.$sellerId.tsx`: se usuário logado for o próprio vendedor e **não** for staff/manager, esconder `monthly_salary`, `other_individual_costs`, CAC e ROI individuais. Mostrar apenas: matrículas, receita bruta/líquida, MRR, LTV, LTV ajustado, comissão, receita esperada.
- Lista de equipe e dashboards de outras pessoas: não acessíveis (já filtrado por `getAccessibleSellerIds`).

## 7. Recálculo de CAC e ROI com salários

```
custo_individual_vendedor = monthly_salary + monthly_tools_cost + other_individual_costs
custo_total_equipe = Σ custo_individual + general_tools_cost + paid_traffic_cost + other_commercial_costs
CAC = custo_total_equipe / nº matrículas aprovadas no período
ROI_vendedor = receita_esperada_vendedor / custo_individual_vendedor
ROI_equipe   = receita_esperada_equipe   / custo_total_equipe
```

- Quando `custo_total == 0` ou não há custos cadastrados → exibir aviso **"Cadastre salários e custos para calcular CAC e ROI"** em vez de `R$ 0,00` / `0x`.
- Os settings usados em `computeScopeKpis` passam a vir de `team_financial_settings` do manager do escopo (com fallback global).

## 8. Filtros do Financeiro

Topo do `/financeiro/*`: período (mês), equipe/franquia (staff vê todas), vendedor, cargo. Para diretor/franqueado o seletor de equipe é fixado na própria.

## 9. Preservação do ranking

- **Nenhuma alteração** em `sellers`, `enrollments`, `interviews`, triggers de score, `RankingView.tsx` (já filtra por `getAccessibleSellerIds`), nem em comissões.
- Só são tocadas: `financial_settings` (drop coluna), `seller_financial_settings` (drop+add colunas) e nova `team_financial_settings`.
- Cálculos financeiros leem dados existentes; não escrevem em `enrollments`/`sellers`.

## 10. Arquivos afetados

- **Migration nova**: drop colunas de automação + add `monthly_salary`/`other_individual_costs`/`manager_user_id` em `seller_financial_settings` + criar `team_financial_settings` com GRANTs e RLS.
- **Edit** `src/lib/financialSettings.ts`: remover automação, adicionar salário/outros custos, novo módulo `teamFinancialSettings.ts`.
- **Edit** `src/lib/financial.ts`: nova fórmula de custo individual, remoção de automação, suporte a settings por equipe.
- **Edit** `src/routes/financeiro.config.tsx`: separar em duas seções — "Configurações da minha equipe/franquia" (team) e "Custos por vendedor" (com salário). Staff ganha seletor de manager.
- **Edit** `financeiro.geral.tsx`, `financeiro.equipes.tsx`, `financeiro.vendedor.$sellerId.tsx`: novos cards, remoção de automação, aviso quando custos zerados, ocultação de salário para vendedor.
- **Edit** `src/components/financial/KpiCard.tsx`: suporte a hint/fórmula e estado "sem dados".

## 11. O que NÃO muda

- Ranking, score, triggers, comissões em `enrollments`, autenticação, gestão de equipe (`/equipe`), navegação principal.

---

Aguardando aprovação para implementar.
