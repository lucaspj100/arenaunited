## O que vai mudar

### 1. Acessos — ADM gera senha temporária

Na página **Acessos**, apenas para o ADM, vai aparecer ao lado de cada usuário cadastrado:
- O **e-mail** de login (já é visível hoje).
- Um botão **"Gerar senha temporária"** que cria uma nova senha aleatória, mostra **uma única vez** na tela (com botão de copiar) e já a aplica na conta do usuário.
- Depois de fechar o aviso, a senha não pode mais ser vista (fica criptografada no banco, como exige a segurança).

Importante: o sistema não consegue mostrar a senha que o usuário escolheu — só a **nova** que o ADM acabou de gerar. Esse é o padrão usado por bancos, Google, etc.

### 2. Diretor e Franqueado entram no ranking

- Na página de **Ranking** (ou no Perfil), diretor e franqueado que ainda não estão no ranking veem um botão **"Participar do ranking"** que cria o perfil de competidor deles (como consultor ou gerente, à escolha).
- Eles passam a aparecer junto com os outros vendedores no ranking mensal, com suas próprias matrículas, material e conversões.
- Cada gestor pode **editar suas próprias metas** (matrículas e material do mês) direto no perfil dele — mesmo que ele seja diretor/franqueado.

### 3. Dashboard do gestor (versão equipe)

Vai existir uma página **"Meu Dashboard"** específica para diretor/franqueado com o mesmo visual do dashboard do vendedor, mas com foco em equipe:

- **Resumo pessoal**: matrículas, material, conversão e progresso de meta do próprio gestor (caso ele esteja no ranking).
- **Resumo da equipe**: total de matrículas, material vendido, entrevistas marcadas/realizadas e ticket médio do mês — somando todos os liderados.
- **Ranking dos liderados**: lista compacta dos vendedores da equipe ordenada por matrículas no mês.
- **Programação semanal da equipe**: link rápido para a agenda da equipe.
- **Rituais do dia**: mesmo bloco motivacional que o vendedor tem.

## Detalhes técnicos

**Banco:**
- Ajustar `claim_seller_profile()` para aceitar também `diretor`, `ceo`, `presidente` e `franqueado` (hoje só aceita vendedor/franqueado).
- Ajustar o trigger `enforce_seller_update_scope` para permitir que o **próprio dono** do registro (gestor ou vendedor) edite `goal_deals` e `goal_material`.
- Nova função `admin_reset_user_password(user_id)` (security definer, apenas `is_admin`) que gera senha aleatória de 12 caracteres, atualiza via `auth.admin.updateUserById` e retorna a senha em texto puro **uma única vez**. Implementada como **server function** (`createServerFn`) com `supabaseAdmin` para chamar a API admin do Supabase.

**Frontend:**
- `src/lib/adminUsers.functions.ts` — server function `resetUserPassword` (admin only).
- `src/routes/acessos.tsx` — botão "Gerar senha temporária" + dialog para mostrar senha uma vez (só admin).
- `src/components/RankingView.tsx` ou `src/routes/perfil.tsx` — botão "Participar do ranking" para gestores sem perfil de seller.
- `src/components/EditSellerDialog.tsx` ou `src/routes/perfil.tsx` — liberar campo de metas para o próprio gestor.
- `src/routes/meu-dashboard.tsx` (nova) — dashboard com foco em equipe; rota disponível para diretor/franqueado.
- Link no menu/AuthBar para "Meu Dashboard" quando o usuário for gestor.
