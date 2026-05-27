## Dashboard individual + frase de motivação estoica

### Parte 1 — Dashboard individual do vendedor

Nova página em `/vendedor/$sellerId` mostrando métricas do vendedor com seletor livre de período. Acessível para staff (admin/diretor/ceo/presidente) ou para o próprio vendedor; outros vendedores recebem "Acesso negado".

**Acesso e navegação**
- Rota nova: `src/routes/vendedor.$sellerId.tsx`.
- Permissão: `isStaff` OU `seller.user_id === currentUserId`.
- Entrada: nome do vendedor no `SellerRow` vira `<Link>` para a página (com `preload="intent"`); ícone editar continua como hoje para staff.
- Botão "Voltar" no header.

**Seletor de período (livre)**
- Presets: Hoje, Esta semana, Mês atual, Mês anterior, Personalizado (data inicial + final).
- Default: mês atual.

**Métricas exibidas (refletem o período escolhido)**
- Cabeçalho: avatar, nome, cargo, posição no ranking geral.
- Cards principais: entrevistas marcadas, entrevistas realizadas, taxa de conversão (matrículas/realizadas), matrículas aprovadas, material vendido (R$), mensalidades (R$), comissão prevista (R$), ticket médio.
- Comparação com período anterior de mesma duração: variação % e absoluta para matrículas, material e comissão.
- Meta do mês (só quando período = mês atual): barras de progresso para `goal_deals` e `goal_material` + "falta X para bater a meta".

**Como os dados são buscados** (client-side via `supabase-js`; RLS já cobre):
1. `sellers` por id.
2. `interviews` filtradas por `seller_id` e intervalo de `scheduled_date`.
3. `enrollments` aprovadas filtradas por `seller_id` e intervalo de `enrollment_date`.
4. Posição no ranking reaproveita `fetchSellers()` + `rankSellers()` existentes.

**Realtime:** assina `enrollments` e `interviews` filtrando por `seller_id`, recarregando ao detectar evento.

### Parte 2 — Frase de motivação estoica na página inicial

Card discreto no topo da home (apenas para usuários logados como vendedor; staff não vê). A frase é escolhida automaticamente conforme a performance do vendedor no mês atual.

**Classificação de performance** (calculada no cliente a partir de `sellers` + posição já calculada por `rankSellers`):
- **top**: vendedor está no top 3 do ranking OU já bateu ≥100% da meta de matrículas.
- **rising**: posição entre 4º e metade superior do ranking E entre 50% e 99% da meta.
- **struggling**: metade inferior do ranking OU <30% da meta passada a primeira semana do mês.
- **neutral**: nenhum dos anteriores.

**Pools de frases estoicas** (curadas, Marco Aurélio / Sêneca / Epicteto), com leve adaptação ao contexto de vendas. Exemplos:

- **top** — "não abandonar o processo":
  - "Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis." — Sêneca
  - "Tu tens poder sobre a tua mente, não sobre os acontecimentos. Compreende isso, e encontrarás força." — Marco Aurélio
  - "O sucesso de ontem não te pertence mais. O que importa é o que farás hoje." — adaptado, Marco Aurélio

- **rising** — manter o ritmo:
  - "Pequenas coisas, feitas de modo constante, levam a grandes resultados."
  - "Não diga que vai fazer. Faça." — Epicteto
  - "Cada hábito e faculdade se forma e se fortalece pelo ato correspondente." — Epicteto

- **struggling** — dificuldade/crise:
  - "Sofremos mais na imaginação do que na realidade." — Sêneca
  - "O obstáculo é o caminho." — Marco Aurélio
  - "Não são as coisas que perturbam os homens, mas a opinião que têm das coisas." — Epicteto
  - "Comece. O resto vem com o trabalho."

- **neutral** — disciplina diária:
  - "Toda nova manhã é uma nova chance de fazer melhor."
  - "Não desperdices o que resta da tua vida em opiniões alheias." — Marco Aurélio

A frase é determinística para o dia: `hash(sellerId + YYYY-MM-DD) % pool.length`, então um vendedor vê a mesma frase o dia inteiro mas troca todo dia.

**UI:**
- Card no topo da home (acima do ranking), com ícone discreto, frase em destaque e autor abaixo.
- Aparece somente quando o usuário logado tem `sellerId` vinculado.
- Em performance "struggling" o card ganha leve toque visual de acolhimento (borda mais suave, sem cor de alerta).
- Em performance "top" o card ganha leve toque dourado/bronze.

### Arquivos

- **Criar** `src/routes/vendedor.$sellerId.tsx` — dashboard individual.
- **Criar** `src/lib/period.ts` — `periodPresets`, `getRange`, `previousRange`.
- **Criar** `src/components/PeriodPicker.tsx` — dropdown de presets + inputs de data.
- **Criar** `src/components/SellerDashboard.tsx` — render dos cards/barras.
- **Criar** `src/lib/motivation.ts` — pools de frases + função `pickQuote(sellerId, tier, date)`.
- **Criar** `src/components/MotivationCard.tsx` — card da home.
- **Editar** `src/components/SellerRow.tsx` — nome vira `<Link>` para `/vendedor/$sellerId`.
- **Editar** `src/routes/index.tsx` — montar `<MotivationCard>` no topo quando `sellerId` existe.

### Detalhes técnicos

- Nenhuma alteração no banco / nenhuma nova RLS / nenhuma nova view.
- Tier de performance e frase calculados 100% no cliente a partir dos dados já carregados.
- Loading skeleton enquanto carrega; `errorComponent`/`notFoundComponent` na rota nova.
- `head()` dinâmico com "Dashboard de {nome} — Arena United".