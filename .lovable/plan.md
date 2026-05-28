Plano para corrigir esse bug recorrente:

1. Tornar o erro visível para diagnóstico
- Melhorar a tela de erro global para mostrar uma mensagem técnica curta quando estiver no preview/desenvolvimento.
- Manter a mensagem amigável para usuários finais em produção.
- Assim, quando acontecer de novo, não fica só “Esta página não carregou”; teremos pista real do que quebrou.

2. Blindar o dashboard do vendedor contra dados inesperados
- Revisar os pontos recém-adicionados no dashboard: ritual, streak, rival e replay semanal.
- Tratar valores nulos/undefined vindos do banco antes de formatar dinheiro, datas, metas e ranking.
- Evitar que um único card quebre a página inteira.

3. Corrigir os pontos com maior risco de crash
- `ROLE_LABELS[seller.role]`: proteger caso venha um cargo fora de `consultor/gerente`.
- `formatBRL(...)`: proteger contra `null`, `undefined`, string inválida ou `NaN`.
- `weeklyRecap`: proteger slides quando houver poucos dados, datas vazias, comissão nula ou vendedor sem avatar/nome.
- `RivalCard` e gamificação: garantir que gaps negativos, ranking vazio ou vendedor ausente não derrubem a tela.

4. Melhorar isolamento de falhas
- Criar um wrapper simples para os blocos de gamificação do dashboard.
- Se um bloco falhar, ele desaparece ou mostra fallback discreto, mas o dashboard principal continua carregando.

5. Validar o fluxo afetado
- Testar a rota principal e o dashboard do vendedor em cenário autenticado/sem dados completos.
- Conferir console/network depois da correção para garantir que a tela genérica não reaparece pelo mesmo motivo.

Arquivos prováveis:
- `src/routes/__root.tsx`
- `src/components/SellerDashboardContainer.tsx`
- `src/components/SellerDashboard.tsx`
- `src/components/RivalCard.tsx`
- `src/components/WeeklyReplayModal.tsx`
- `src/lib/weeklyRecap.ts`
- `src/lib/commissions.ts` ou ajustes locais de formatação

Resultado esperado: usuários deixam de cair nessa página genérica por dados incompletos/inesperados, e quando houver outro erro real, a gente consegue identificar rapidamente a causa.