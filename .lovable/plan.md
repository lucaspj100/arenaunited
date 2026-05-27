# Plano: Gamificação do dashboard do vendedor

Tudo aparece **apenas no dashboard do próprio vendedor** (não em staff visualizando outro vendedor). Sem novas tabelas — tudo calculado on-the-fly a partir de `enrollments`, `interviews` e `sellers`.

---

## 1. Ritual do Dia

Card logo abaixo do `MotivationCard`, com 3 micro-metas **dinâmicas** calculadas dos números reais.

**Lógica de geração** (`src/lib/ritual.ts`):
- Compara hoje vs ontem (entrevistas marcadas, realizadas, matrículas).
- Compara progresso atual da meta mensal vs dias restantes do mês.
- Tier do vendedor (já existe em `motivation.ts`) modula a dificuldade.

**Exemplos de metas geradas:**
- "Marque mais 2 entrevistas hoje (ontem você marcou 3)"
- "Feche 1 matrícula — faltam 4 pra bater a meta do mês"
- "Realize a próxima entrevista da agenda" (modo crise: 1 ação simples)
- "Você está a R$ 850 da meta de material" (modo voo: empurrão final)

Sem checkbox persistente — cada item mostra **progresso real automático** (✓ verde quando atingido naquele dia, contador "1/2" quando parcial). Atualiza via realtime quando uma matrícula/entrevista nova entra.

---

## 2. Rival da Semana

Card compacto no topo do dashboard mostrando o vendedor **logo acima no ranking**:
- Avatar + nome + gap ("Você está 2 matrículas atrás de Bruno")
- Quando ultrapassa: animação de confete + texto muda para "Você passou Bruno! Próximo: Carla"
- Se já é #1: "Você lidera o ranking — Bruno está colando, 1 matrícula atrás"

Calculado de `rankSellers()` (já existe). Sem persistência.

---

## 3. Streak de Dias Produtivos

Badge com chama 🔥 no header do dashboard mostrando "X dias seguidos".

**Definição de dia produtivo:** ≥1 entrevista marcada OU ≥1 matrícula aprovada naquela data.

**Cálculo on-the-fly** (`src/lib/streak.ts`):
- Busca enrollments + interviews dos últimos ~60 dias do vendedor.
- Conta dias consecutivos para trás a partir de hoje (ou ontem se hoje ainda não teve atividade — não quebra o streak antes do fim do dia).
- Cache leve em memória (1min) pra não recalcular a cada render.

Visual: chama maior conforme o streak cresce (3 níveis: 1-6, 7-29, 30+).

---

## 4. Modo Crise / Modo Voo

Reaproveita o **tier** já existente em `motivation.ts` (`struggling | neutral | rising | top`) e aplica variação visual no dashboard inteiro via classe no container raiz:

| Tier | Visual |
|---|---|
| `struggling` (crise) | Paleta sóbria (menos saturação, accent silenciado), Ritual reduzido a **1 única ação simples**, frase estoica mais curta e direta |
| `neutral` | Padrão atual |
| `rising` | Accent verde sutil, Rival em destaque ("você está subindo") |
| `top` (voo) | Accent gold em destaque, comissão em fonte maior, frase "não relaxe agora" |

Implementação via `data-mode={tier}` no wrapper + variantes Tailwind/CSS em `src/styles.css`. Sem novos componentes — só estilo condicional.

---

## 5. Replay Semanal (Sexta automática)

Modal full-screen estilo **stories** que abre **automaticamente toda sexta-feira** na primeira visita do dia ao dashboard.

**Persistência mínima** sem nova tabela: `localStorage` chave `replay_seen_{sellerId}_{weekStart}`. Se já viu naquela semana, não reabre.

**Slides** (5-6, auto-advance de 4s cada, com setas/tap para navegar):
1. "Sua semana, [nome]" — capa com avatar
2. "X matrículas" (vs semana anterior, com delta colorido)
3. "R$ X em comissão acumulada"
4. Melhor dia da semana (ex: "Terça foi seu dia: 3 matrículas")
5. Posição ganha/perdida no ranking (ex: "Você subiu 2 posições — agora 4º")
6. Frase estoica de fechamento + botão "Bora pra próxima semana"

Botão **"Ver recap da semana"** sempre visível no header também, pra reabrir manualmente.

---

## Arquivos

**Novos:**
- `src/lib/ritual.ts` — geração das 3 micro-metas a partir dos dados
- `src/lib/streak.ts` — cálculo de dias consecutivos
- `src/lib/weeklyRecap.ts` — agregação de dados para o replay
- `src/components/RitualDoDia.tsx`
- `src/components/RivalCard.tsx`
- `src/components/StreakBadge.tsx`
- `src/components/WeeklyReplayModal.tsx`

**Editados:**
- `src/components/SellerDashboard.tsx` — adiciona slots para Rival (topo), Ritual (abaixo do `topSlot`), Streak (no header), aplica `data-mode={tier}`
- `src/components/SellerDashboardContainer.tsx` — passa props dos novos componentes (já tem ranked + enrollments + interviews em mãos), monta o `WeeklyReplayModal` quando `showMotivation` é true
- `src/styles.css` — variantes de `data-mode="struggling|rising|top"` para sutil ajuste de paleta
- `src/lib/motivation.ts` — exporta o helper `getSellerTier()` se já não está exportado, pra reuso

## Detalhes técnicos

- **Sem novas tabelas, sem migrations, sem RLS** — tudo deriva de dados que o container já carrega.
- **Realtime já existe** no `SellerDashboardContainer` (postgres_changes em enrollments/interviews) — Ritual e Rival atualizam automaticamente.
- **Streak precisa de range maior** (~60 dias) que o período selecionado — adiciono um `useEffect` separado no container que busca esse histórico uma vez por sessão.
- **Replay precisa de 2 semanas** de dados para o delta — busca isolada quando o modal vai abrir.
- **Confete do Rival**: usa `framer-motion` (já no projeto via shadcn) com um burst simples de divs animadas, sem nova dependência.
- **Modo visual** muda apenas variáveis CSS dentro do dashboard — não afeta `RankingView` nem outras páginas.

## Aparece apenas para o dono

Tudo (Ritual, Rival, Streak, Modo, Replay) só renderiza quando `showMotivation === true`, ou seja, o vendedor vendo o próprio dashboard. Staff visualizando `/vendedor/:id` continua vendo só os dados puros.
