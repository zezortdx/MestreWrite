# ADR-004 — Overlay visual: janela transparente + orb em Canvas + borda em CSS

## Status
Aceito (2026) · estética revisável · **parcialmente emendado por
[[ADR-005-overlay-pilula-webgl]]** (a janela transparente, o click-through e o
modelo de estados via IPC abaixo continuam valendo; o **orb Canvas 2D** e a
**borda de cantos retos** foram substituídos por orb **WebGL** numa **pílula** e
um **glow nas bordas** — ver ADR-005).

## Contexto
O MestreWrite precisa de uma presença visual **bonita e discreta** (princípio da
[[Visão]]) que apareça sobre qualquer app: o orb iridescente e a borda gradiente
(ver [[Design]]). Requisitos: ficar acima de tudo, **não atrapalhar** o uso do
computador, comunicar os estados (idle/listening/processing) e rodar leve.

## Decisão

### Janela
Uma **janela Electron transparente** cobrindo a tela inteira do display
principal (`src/main/main.js`), com:
- `transparent: true`, `frame: false`, fundo com alfa zero (nada de retângulo opaco);
- `setAlwaysOnTop(true, 'screen-saver')` + visível em todos os espaços;
- **`setIgnoreMouseEvents(true)`** → *click-through* (os cliques passam para o app de baixo);
- `focusable: false`, `skipTaskbar: true` e `app.dock.hide()` no macOS — nunca rouba o foco nem aparece no dock.

### Orb → Canvas 2D
O orb é um **redemoinho roxo** desenhado em **Canvas 2D** (`src/overlay/orb.js`):
corpo translúcido + "braços" iridescentes esticados na tangente girando como
vórtice + halo + núcleo, animado com `requestAnimationFrame`. Desfoque e máscara
radial (CSS) dão o ar etéreo. O loop **pausa em idle** para poupar CPU.

### Borda → CSS
A borda é **CSS puro** (`src/overlay/overlay.css`): `conic-gradient` girando via
`@property --angulo`, recortada com `mask` para mostrar só a faixa nas beiradas,
com `blur`. **Cantos retos** (sem `border-radius`).

### Estado → IPC + preload seguro
O processo principal envia o estado (`idle`/`listening`/`processing`) por
`webContents.send`; o **preload** (`src/overlay/preload.js`) expõe um listener
mínimo via `contextBridge`. Segurança: `contextIsolation: true`, `sandbox: true`,
**sem** `nodeIntegration`.

### Adaptação ao tamanho da tela
O renderer lê `window.innerWidth/innerHeight` (a janela cobre o display inteiro) e
dimensiona orb, posição, espessura da borda, desfoque e flutuação
**proporcionalmente**, recalculando em `resize`.

## Consequências

**Positivas**
- Universal e não-intrusivo (click-through, sem foco).
- Orb fluido e rico (Canvas) e borda barata (CSS), **sem bibliotecas extras**.
- Renderer isolado (seguro) e econômico (pausa em idle).
- Proporcional em qualquer tela.

**Negativas / trade-offs**
- Exige permissão de **Acessibilidade** no macOS para o comportamento de janela.
- `transparent: true` tem limitações conhecidas no Electron por plataforma.
- A estética (cor/forma/desfoque) é subjetiva e foi bastante iterada.

## Teste (temporário)
Enquanto não há áudio, atalhos globais simulam os estados (marcados como
**TESTE TEMPORÁRIO** em `src/main/main.js`, a remover ao integrar áudio):
`Cmd+Shift+1` listening · `Cmd+Shift+2` processing · `Cmd+Shift+0` idle ·
`Cmd+Shift+Q` sair.

## Relacionado
- [[Design]] · [[Arquitetura]] · [[Stack-Técnico]] · [[ADR-001-electron]] · [[MVP]]
