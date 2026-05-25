## Módulo "Comissões e Premiações"

Vou adicionar um novo módulo ao sistema para cadastro de matrículas fechadas, com cálculo automático de comissão (sobre matrícula) e premiação mensal (sobre material acumulado), além de gestão de cargos pelo admin.

### 1. Banco de dados (migration)

**Nova tabela `enrollments` (matrículas fechadas):**
- `seller_id`, `student_name`, `enrollment_date`
- `enrollment_value` (matrícula), `monthly_fee` (mensalidade — só indicador), `material_value`
- `role_snapshot` (cargo no momento do cadastro: `consultor` | `gerente`)
- `commission_rate`, `commission_amount` (calculados via trigger no insert/update)
- `notes`, timestamps

**Novo enum `seller_role`:** `consultor`, `gerente`.

**Coluna `role` em `sellers`** (default `consultor`) — editável só por admin via política RLS + trigger `enforce_seller_update_scope` (já existe, vou estender pra bloquear `role` para não-admins).

**Trigger `enrollments_calc`**: ao inserir/atualizar, lê `sellers.role` do `seller_id` e preenche `role_snapshot`, `commission_rate` (0.30/0.53), `commission_amount = enrollment_value * rate`. Vendedor não consegue sobrescrever esses campos.

**RLS em `enrollments`:**
- Admin: full CRUD
- Vendedor: CRUD apenas onde `seller_id = current_seller_id()`
- Validações: valores ≥ 0 via CHECK; `student_name` not null; `enrollment_date` not null

**Função `material_award(role, total)`** SQL stable retorna o valor da premiação conforme faixa.

### 2. Lógica de cálculo (frontend `src/lib/commissions.ts`)

- `MATERIAL_TIERS` por cargo (3 faixas cada)
- `computeMaterialAward(role, totalMaterial)` → valor + próxima faixa + quanto falta + texto de progresso
- `monthRange(date)`, `periodPresets` (hoje, semana, mês atual, mês anterior, custom)
- Agregadores por vendedor e por equipe

### 3. UI Vendedor — `/minhas-comissoes`

- Header com seletor de período
- Cards: matrículas fechadas, total matrícula, total mensalidade (com tag "indicador"), material acumulado, **Total previsto a receber** (card destaque grande), comissão prevista, premiação prevista, ticket médio matrícula, ticket médio mensalidade, falta pra próxima premiação
- Barra de progresso da premiação de material (textos dinâmicos conforme cargo e faixa)
- Tabela de matrículas com ações editar/excluir
- Modal "Nova matrícula" com campos editáveis (aluno, data, matrícula, mensalidade, material, obs). Cargo/comissão exibidos como read-only

### 4. UI Admin — `/comissoes-equipe`

- Filtros: período + vendedor + cargo
- Cards gerais da equipe
- Tabela por vendedor (todas as métricas + cargo)
- Rankings (7 categorias) em cards visuais com pódio/lista
- Pode criar/editar/excluir matrículas de qualquer vendedor

### 5. UI Admin — Gestão de cargo

Reaproveitar `EditSellerDialog` (ou nova área "Usuários") com select de cargo Consultor/Gerente. Salva em `sellers.role`.

### 6. Navegação

- Adicionar links no `index.tsx`: vendedor vê "Minhas Comissões"; admin vê "Comissões da Equipe"
- Rotas com `_authenticated`-style guard (client-only, igual `minha-programacao`)

### Detalhes técnicos

- Valores em `numeric` no DB, formatados com `formatBRL`
- Cálculo de premiação SEMPRE sobre acumulado do período filtrado (não por matrícula)
- Cargo usado nos cálculos = `role_snapshot` da matrícula (mantém histórico se admin mudar cargo depois)
- Para o dashboard, faixa de premiação usa cargo ATUAL do vendedor (perfil), pois é uma previsão do mês
- Triggers garantem que vendedor não pode alterar `commission_rate`, `commission_amount`, `role_snapshot`, `seller_id`
- Realtime opcional não necessário nesta fase

### Arquivos a criar/editar

- `supabase/migrations/...` — enum, coluna `role`, tabela `enrollments`, RLS, triggers
- `src/lib/commissions.ts` — regras + agregadores
- `src/lib/enrollments.ts` — CRUD
- `src/components/EnrollmentFormDialog.tsx`
- `src/components/MaterialProgressBar.tsx`
- `src/components/CommissionCards.tsx`
- `src/routes/minhas-comissoes.tsx`
- `src/routes/comissoes-equipe.tsx`
- `src/components/EditSellerDialog.tsx` — adicionar select de cargo
- `src/routes/index.tsx` — links de navegação
