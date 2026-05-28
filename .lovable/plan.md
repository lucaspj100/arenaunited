## Objetivo

Permitir que **admin, CEO, presidente e diretor** cadastrem matrículas para **qualquer vendedor**, e facilitar o acesso ao dashboard individual de cada vendedor.

---

## 1. Permissões no banco (migration)

Hoje só `admin` consegue criar matrícula para qualquer vendedor. Diretor/CEO/presidente só conseguem se forem `director_id` do vendedor.

Vou criar nova policy permitindo que qualquer usuário com role `admin`, `ceo`, `presidente` ou `diretor` cadastre/edite/aprove/exclua matrículas de **qualquer vendedor**:

- Substituir `enrollments_diretor_*` por policies baseadas em `is_staff(auth.uid())` (que já cobre admin/diretor/ceo/presidente).
- Manter as policies de vendedor intactas (cada vendedor só vê/edita as próprias).
- Resultado: staff = acesso total às matrículas.

## 2. Botão "Nova matrícula" no dashboard individual

Em `src/routes/vendedor.$sellerId.tsx`:
- Quando o usuário logado for staff (admin/ceo/presidente/diretor), mostrar botão "Nova matrícula" no header.
- Botão abre o `EnrollmentFormDialog` já com `defaultSellerId` = vendedor da rota e `canEditAll=false` (cadastra direto para ele, sem seletor).
- Após salvar, dar refresh nos dados (realtime já cuida via subscription).

## 3. Atalho "+" no ranking

Em `src/components/SellerRow.tsx`:
- Adicionar prop opcional `onAddEnrollment?: () => void`.
- Quando presente, renderizar ícone "+" (GraduationCap+) ao lado dos botões de editar/remover, com tooltip "Cadastrar matrícula".

Em `src/components/RankingView.tsx`:
- Manter um estado `enrollSellerId: string | null`.
- Passar `onAddEnrollment` para `SellerRow` somente quando `isStaff`.
- Renderizar um único `EnrollmentFormDialog` controlado por esse estado, com `defaultSellerId={enrollSellerId}` e `sellers={...}` (pra mostrar nome).
- Após salvar, fazer `fetchSellers()` para atualizar contagens.

## 4. Affordance visual no nome

`SellerRow.tsx` já tem `<Link>` no nome do vendedor apontando para `/vendedor/$sellerId`. Vou:
- Adicionar `cursor-pointer`, sublinhado discreto no hover e tooltip "Ver dashboard".
- Adicionar ícone pequeno (chevron-right) à direita do nome para indicar clicável.

Já validado que a rota `/vendedor/:sellerId` libera acesso a staff (ver `vendedor.$sellerId.tsx` linhas 42–47: `if (isStaff) return true`), então não há trabalho de permissão de rota.

---

## Arquivos afetados

- **migration**: nova policy `enrollments_staff_*` (insert/update/delete/select) substituindo as `_diretor_*`.
- `src/routes/vendedor.$sellerId.tsx` — header com botão para staff.
- `src/components/SellerDashboardContainer.tsx` — aceitar `headerExtras` à direita também (ou passar via novo slot) para o botão.
- `src/components/SellerRow.tsx` — prop `onAddEnrollment` + affordance no nome.
- `src/components/RankingView.tsx` — estado e diálogo único para cadastro rápido.

Sem alteração em business logic de comissão (a trigger `enrollments_apply_commission` calcula automaticamente).
