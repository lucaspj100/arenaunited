## Causa raiz

O erro `NotFoundError: Failed to execute 'removeChild' on 'Node'` quase nunca vem do nosso código de negócio. Ele acontece quando uma extensão ou o **tradutor automático do Chrome** (Google Translate) substitui nós de texto da página por `<font>...</font>`. Quando o React tenta remover o nó de texto original durante uma re-renderização (ex: modal abrindo/fechando, recap mudando slide, ranking atualizando), o nó não é mais filho do pai esperado → exceção global → tela "Esta página não carregou".

Sinais que batem com esse diagnóstico:
- Stack só com nomes minificados do React (`gg`, `Ot`, `vg`) — sem nenhum arquivo nosso.
- Acontece em usuários específicos (os que têm tradução ativada).
- Reproduz mais em telas com muito texto curto solto: WeeklyReplayModal, RitualDoDia, RivalCard, ranking.

## Plano de correção

### 1. Bloquear tradução automática do navegador
No `src/routes/__root.tsx`, dentro do `head()`:
- Adicionar `<meta name="google" content="notranslate" />`
- Adicionar `translate="no"` no `<html>` (via shellComponent) e `className="notranslate"` no `<body>`.

Isso resolve >90% dos casos desse erro em apps PT-BR.

### 2. Patch defensivo do `removeChild` / `insertBefore`
Em `src/routes/__root.tsx`, no topo do RootComponent (executa só no client):
- Sobrescrever `Node.prototype.removeChild` e `Node.prototype.insertBefore` para, quando o nó não for filho do pai esperado, fazer fallback silencioso (`node.remove()` ou ignorar) em vez de lançar.
- Esse patch é o workaround oficial recomendado pela comunidade React para conviver com Google Translate e extensões tipo Grammarly. Não muda comportamento em DOM "limpo".

### 3. Endurecer pontos de texto solto mais arriscados
Pequenas mudanças cirúrgicas (sem mexer em lógica):
- `WeeklyReplayModal.tsx`: envolver textos plurais/contadores em `<span>` único em vez de text nodes irmãos (`{slide.count} matrícula(s)` → um único `<span>`).
- `RitualDoDia.tsx`, `RivalCard.tsx`: mesma higienização nos trechos `{n} {n===1?"x":"xs"}`.

Isso reduz a superfície que o tradutor consegue quebrar mesmo se o usuário forçar tradução manual.

### 4. Validar
- Abrir preview com Chrome em "traduzir esta página" forçado e navegar Login → Dashboard → abrir WeeklyReplay → trocar slides.
- Confirmar console limpo, sem `removeChild`.

## Arquivos afetados
- `src/routes/__root.tsx` (meta notranslate + patch defensivo)
- `src/components/WeeklyReplayModal.tsx` (higienização de text nodes)
- `src/components/RitualDoDia.tsx` (higienização)
- `src/components/RivalCard.tsx` (higienização)

Nenhuma mudança em dados, queries ou regras de negócio.