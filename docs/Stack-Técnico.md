# Stack Técnico

As tecnologias do MestreWrite, com as decisões e trade-offs por trás de cada uma.
Decisões formais estão registradas como ADRs em [[ADR-001-electron]],
[[ADR-002-whisper-local]] e [[ADR-003-inserção-via-clipboard]].

## Electron
Framework para o app desktop. Permite usar web (HTML/CSS/JS) para o overlay e
Node para a lógica de sistema, com um caminho claro para macOS, Windows e Linux.

- **Prós:** multiplataforma, ecossistema enorme, ideal para o overlay animado, APIs de atalho global e tray prontas.
- **Contras:** consumo de memória maior, bundle pesado.
- Decisão: [[ADR-001-electron]].

## Node.js
Runtime da lógica do processo principal: orquestra gravação, chamada ao whisper e
inserção de texto. Já vem com o Electron.

## whisper.cpp
Implementação em C/C++ do modelo Whisper de transcrição, rodando **localmente**.
É o coração da [[Privacidade]] e do funcionamento offline.

- **Prós:** local, offline, rápido em CPU/Metal, qualidade alta, sem custo por uso.
- **Contras:** binário/modelo precisam ser instalados; modelos grandes ocupam espaço.
- Decisão: [[ADR-002-whisper-local]].
- **Servidor persistente:** roda como `whisper-server` (modelo na memória, POST
  `/inference`) para eliminar o cold-start; cai no `whisper-cli` se indisponível.
  Ver [[ADR-012-desempenho-stt-servidor-vad]].

## sox
Utilitário de linha de comando para capturar áudio do microfone no MVP, invocado
como child process via `src/main/audio.js`.

- **Prós:** simples, confiável, fácil de chamar via shell, disponível no Homebrew.
  Traz **VAD nativo** (efeito `silence`) e filtros (`highpass`) sem libs extras.
- **Contras:** dependência externa; substituível por captura nativa no futuro.
- **VAD:** o efeito `silence` corta o silêncio inicial e **encerra a gravação no
  silêncio** — o whisper recebe só a fala (menos alucinação). Ver [[ADR-009-vad-silencio-e-otimizacao]].

## Módulos do backend (novos nesta fase)
- **`src/main/config.js`** — configuração centralizada (atalho, idioma, caminho do modelo).
- **`src/main/audio.js`** — gravação via `sox` com promessa de ciclo único.
- **`src/main/transcribe.js`** — transcrição via `whisper-cli`, limpeza de arquivos temporários.
- **`src/main/typer.js`** — inserção via clipboard + `osascript` com stdin (sem shell).

## Máquina de estados (`src/main/main.js`)
IDLE → RECORDING → TRANSCRIBING → IDLE. Atalho ignorado durante TRANSCRIBING.
Tray icon com tooltip dinâmico e menu "Sair". Detalhes em [[ADR-006-backend-core]].

## Setup de primeira execução (`src/setup/`)
Tela (tema claro) que captura atalho/idioma/modelo na 1ª execução; persiste em
`~/.mestrewrite/config.json` via `src/main/configManager.js`. Reúsa o orb
(`orb-core.js`). Decisões em [[ADR-007-setup-primeira-execucao]].

## electron-builder (empacotamento)
Gera `.app`/`.dmg`/`.zip` (config no campo `build` do `package.json`). Não assinado.
O **ícone** do app é renderizado a partir do orb (`scripts/gerar-icone.js` +
`scripts/gerar-icns.sh`). Decisões em [[ADR-008-empacotamento-electron-builder]].

## WebGL + CSS + Web Audio (overlay)
O orb é um **shader iridescente em WebGL puro** (`orb-core.js`), renderizado numa
**pílula** com waveform (`pilula.js`); a borda é um **glow em CSS** (`conic-gradient`
+ `@property` + máscara que desbota das beiras); o som de ativação é **sintetizado
em Web Audio** (sem arquivo). Tudo **sem bibliotecas extras** — só web nativa,
respeitando a CSP estrita. Histórico em [[ADR-004-overlay-visual]] (v1, Canvas 2D)
e decisões atuais em [[ADR-005-overlay-pilula-webgl]] (v2).

## Cross-platform & CI
O código é **multiplataforma** via `process.platform` ([[ADR-010-suporte-windows-cross-platform]]):
colar texto (`osascript` no macOS, `SendKeys` no Windows, `xdotool` no Linux),
captura de áudio (`sox -d` vs `-t waveaudio`) e resolução de binários
(`src/main/binpath.js`). O empacotamento gera `.dmg` (macOS) e `.exe`/NSIS (Windows),
compilados em runners nativos pelo **GitHub Actions** (`.github/workflows/build.yml`)
a cada tag. Ícones (app + bandeja) saem do orb ([[ADR-011-icones-app-e-tray]]).

## Trade-offs gerais

| Tema | Escolha | Em troca de |
|------|---------|-------------|
| Privacidade vs. conveniência | Tudo local | Setup inicial (instalar whisper-cpp/sox) |
| Velocidade de desenvolvimento vs. peso | Electron | App mais leve (nativo) |
| Simplicidade vs. robustez | `sox` + clipboard no MVP | Solução nativa de áudio/inserção |

## Relacionado

- [[Arquitetura]] · [[MVP]] · [[Roadmap]] · [[Privacidade]] · [[ADR-006-backend-core]]
