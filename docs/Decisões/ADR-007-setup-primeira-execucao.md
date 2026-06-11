# ADR-007 — Setup de primeira execução (atalho, idioma, modelo)

## Status
Aceito (2026-06)

## Contexto
O atalho, o idioma e o modelo viviam fixos em `src/main/config.js`. Para o app ser
usável por qualquer pessoa (e não só editando código), a **primeira execução**
precisa de uma tela que capture essas escolhas — em especial o **atalho** que invoca
o MestreWrite. A tela também precisava ter a **mesma identidade visual** do overlay
(orb iridescente, estética Apple Intelligence), sem emojis.

A primeira versão foi um **cartão escuro centralizado com gradiente roxo** — rejeitada
pelo usuário por parecer **genérica** ("cara de template feito por IA") e por não ser
**branca**.

## Decisão

### Persistência da configuração
- `src/main/configManager.js` lê/escreve `~/.mestrewrite/config.json` com merge sobre
  defaults (`atalho`, `idioma`, `modelo`, `threads`, `flashAttn`, etc.).
- `src/main/config.js` passou a **carregar** desse arquivo (com fallback p/ defaults).
- `main.js`: se `!configExiste()` no `app.whenReady`, abre o setup e **não** inicia o
  fluxo normal; ao concluir, salva e faz `app.relaunch()` + `app.exit(0)` para subir
  já com a config real (evita import cacheado de valores default).

### Janela
- `BrowserWindow` 800×640, `frame:false`, `transparent:true`, `hasShadow:false`,
  `center:true`, `resizable:false`. Preload com `contextIsolation` e `sandbox`.
- O **cartão** flutua sobre a janela transparente e tem sombra própria (CSS).

### Identidade visual (tema CLARO)
- Coerente com a **pílula branca frosted** do overlay ([[ADR-005-overlay-pilula-webgl]]):
  superfície **branca**, o **orb é o único ponto de cor**.
- **Layout em duas regiões** (não cartão centralizado): um **rail** lateral com o orb
  herói + marca + etapas verticais clicáveis, e o **conteúdo** branco à direita.
  Isso dá um ponto de vista e foge do clichê genérico.
- **Orb real**: reúso de `src/overlay/orb-core.js` (mesmo shader WebGL), dirigido por
  um `requestAnimationFrame` próprio; **energiza** durante a captura do atalho e
  **pulsa** ao concluir, junto do **chime** sintetizado (Web Audio).
- **Keycaps táteis** para mostrar o atalho; modificadores usam glifos de tecla mac
  (⌘ ⌥ ⌃ ⇧, símbolos tipográficos — **não** emojis). Bandeiras de idioma viram
  nome nativo + tag de código (`pt-BR`); ícones de modelo viram **medidores** de
  velocidade/precisão em CSS.

### Captura de atalho
- Em modo captura, o `keydown` monta um **acelerador válido do Electron**:
  `CommandOrControl` (meta/ctrl) + `Alt` + `Shift` + tecla principal (letras, dígitos,
  F1–F24, Space, setas, pontuação…). Exige ao menos um modificador; `Esc` cancela.

### Honestidade (sem UI morta)
- Só o modelo **base** está instalado por padrão; os demais marcam **"Requer download"**
  e, ao serem selecionados, mostram o comando `curl` exato. (O downloader automático
  fica para depois.)

### Acessibilidade
- Foco visível por teclado (rail, opções, captura, botões); `prefers-reduced-motion`
  desliga animações; `aria-label`/`role` nos grupos.

## Consequências

**Positivas**
- Qualquer usuário configura atalho/idioma/modelo sem editar código.
- Visual branco e distinto, coerente com o overlay; sem emojis.
- O orb reativo conecta a tela ao significado (o atalho "acorda" o orb).

**Negativas / trade-offs**
- Sem janela de **preferências** pós-setup ainda (só reabre apagando o `config.json`).
- Modelos além do `base` não baixam sozinhos (apenas instruem o comando).
- Durante o setup não há tray; a saída é **Cmd+Q** (padrão de assistente de 1ª execução).

## Arquivos
### Criados
- `src/setup/index.html`, `src/setup/setup.css`, `src/setup/setup.js`, `src/setup/preload.js`
- `src/main/configManager.js`

### Modificados
- `src/main/main.js` — `abrirSetup()`, gate de primeira execução, relaunch.
- `src/main/config.js` — passa a carregar de `configManager`.

## Capturas
![Passo 1 — Atalho](../assets/setup-atalho.png)
![Passo 2 — Idioma](../assets/setup-idioma.png)
![Passo 3 — Modelo](../assets/setup-modelo.png)

## Relacionado
- [[Design]] · [[Setup]] · [[Arquitetura]] · [[ADR-005-overlay-pilula-webgl]] ·
  [[ADR-006-backend-core]] · [[ADR-008-empacotamento-electron-builder]]
