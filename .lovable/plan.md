## Home personalizada para vendedor

Quando um vendedor logado abre `/`, ele vê o próprio dashboard pessoal (com frase motivacional no topo) em vez do ranking. Staff e usuários não-vendedores continuam vendo o ranking exatamente como hoje.

### Comportamento por tipo de usuário em `/`

- **Vendedor (não staff, com `sellerId` vinculado):** vê o conteúdo de `/vendedor/$sellerId` direto na home (mesma rota `/`, sem redirect — preserva URL e bookmark).
- **Staff (admin/diretor/ceo/presidente):** vê o ranking atual, sem mudanças.
- **Não logado / usuário sem vínculo de vendedor:** vê o ranking atual (igual hoje).

### Frase motivacional

- Sai da home (`<MotivationCard>` é removido de `src/routes/index.tsx`).
- Passa a aparecer no topo do dashboard pessoal (dentro de `SellerDashboard`, acima do cabeçalho do vendedor), tanto na home do vendedor quanto na rota `/vendedor/$sellerId`.
- Mesma lógica de tier (top / rising / struggling / neutral) e seleção determinística por dia.

### Acesso ao ranking para vendedor

- Adicionar link **"Ranking"** na navegação (provavelmente no `AuthBar` ou header global) apontando para uma nova rota `/ranking`.
- Criar `src/routes/ranking.tsx` que renderiza o mesmo conteúdo do ranking atual (extraído de `index.tsx` para um componente reutilizável `<RankingView />`).
- Para staff, o link "Ranking" também aparece, mas é redundante com a home — tudo bem.

### Arquivos

- **Criar** `src/components/RankingView.tsx` — extrai o JSX do ranking atual de `routes/index.tsx` para reuso.
- **Criar** `src/routes/ranking.tsx` — rota dedicada que renderiza `<RankingView />`.
- **Criar** `src/components/SellerHomeView.tsx` (ou reaproveitar a página `vendedor.$sellerId.tsx` extraindo o miolo) — wrapper que carrega dados do vendedor logado e renderiza `SellerDashboard` com `MotivationCard` no topo.
- **Editar** `src/routes/index.tsx` — passa a decidir: se `currentUser` tem `sellerId` e NÃO é staff → renderiza `<SellerHomeView sellerId={...} />`; caso contrário → renderiza `<RankingView />`. Remove o `<MotivationCard>` daqui.
- **Editar** `src/components/SellerDashboard.tsx` — aceita uma prop opcional `topSlot?: ReactNode` (ou monta o `MotivationCard` direto quando recebe `showMotivation`) para renderizar a frase acima do cabeçalho.
- **Editar** `src/routes/vendedor.$sellerId.tsx` — passa `showMotivation` quando o usuário visualizando é o próprio dono do dashboard (não mostra para staff olhando dashboard de outro vendedor).
- **Editar** `src/components/AuthBar.tsx` (ou onde estiver a nav principal) — adiciona `<Link to="/ranking">Ranking</Link>` visível para todos os usuários logados.

### Detalhes técnicos

- Sem mudanças de banco, RLS ou tipos.
- `useCurrentUser()` já expõe `sellerId` e `isStaff` (usado em outras telas), então a decisão na home é síncrona após `loading=false`.
- Loading: enquanto `useCurrentUser` resolve, mostrar skeleton genérico para evitar flash de ranking para vendedores.
- `head()` da home pode permanecer estática ("Arena United — Ranking"); opcional ajustar para "Meu dashboard" quando for vendedor (não essencial).
- A frase motivacional só aparece para o próprio vendedor olhando o próprio dashboard; staff vendo dashboard de terceiro não vê a frase (evita ruído).
