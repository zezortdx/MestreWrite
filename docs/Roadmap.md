# Roadmap

Direção do MestreWrite, em fases. Cada fase entrega valor sozinha.

> **NO MVP ATUAL** · **Futuro próximo** · **Futuro / visão**

## Fase 1 — MVP (concluído)
**Foco:** provar o fluxo central em macOS, com transcrição crua.

- [x] Estrutura do projeto e documentação.
- [x] App Electron com ícone na bandeja — `src/main/main.js` + tray.
- [x] Atalho global `Cmd+Shift+Space` para iniciar/parar gravação.
- [x] Captura de áudio via `sox` — `src/main/audio.js`.
- [x] Transcrição local via `whisper.cpp` — `src/main/transcribe.js`.
- [x] Inserção do texto no app em foco (clipboard) — `src/main/typer.js`.
- [x] Máquina de estados (IDLE → RECORDING → TRANSCRIBING → IDLE) — `src/main/main.js`.
- [x] Overlay com orb WebGL e glow nas bordas — `src/overlay/` ([[ADR-005-overlay-pilula-webgl]]).
- [x] Configuração centralizada — `src/main/config.js`.
- [x] Setup de primeira execução (atalho/idioma/modelo) — `src/setup/` ([[ADR-007-setup-primeira-execucao]]).
- [x] Empacotamento `.dmg`/`.zip` + ícone do orb — `electron-builder` ([[ADR-008-empacotamento-electron-builder]]).
- [x] Parada automática por silêncio (VAD) + otimizações de velocidade/peso ([[ADR-009-vad-silencio-e-otimizacao]]).

Escopo detalhado em [[MVP]]. Só **macOS**, só **transcrição crua** (sem IA de correção).

- [x] App empacotado encontra `sox`/`whisper-cli` do Homebrew (resolve o `PATH` no
  startup — `src/main/binpath.js`) + checagem de dependências.
- [x] Ícones do app (fundo branco) e da bandeja (orb), gerados do orb ([[ADR-011-icones-app-e-tray]]).
- [x] CI (GitHub Actions): build de `.dmg` (macOS) e `.exe` (Windows) por tag ([[ADR-010-suporte-windows-cross-platform]]).

> **Próximos:** instalador único (empacotar deps + modelo, ou baixar o modelo no
> app), build **x64/universal** e **assinatura/notarização**.

## Fase 2 — Correção por IA
- [ ] Camada de correção inteligente (pontuação, limpeza, concordância).
- [ ] [[Modos de escrita|Funcionalidades]] (formal, casual, código).
- [ ] Comandos de voz básicos.

Ver [[Funcionalidades]].

## Fase 3 — Multiplataforma
- [~] Suporte a **Windows** — código cross-platform pronto + build via CI;
  runtime (SendKeys/áudio) **a validar** em Windows ([[ADR-010-suporte-windows-cross-platform]]).
- [ ] Suporte a **Linux** (best-effort iniciado: colar via `xdotool`).
- [ ] Captura de áudio nativa (substituir `sox` onde fizer sentido).
- [ ] Inserção de texto nativa por plataforma.

## Fase 4 — Extensões
- [ ] Dicionário pessoal.
- [ ] Histórico local.
- [ ] Sistema de plugins/extensões.

## Fase 5 — Plataforma
- [ ] Ecossistema de extensões da comunidade.
- [ ] Integrações com fluxos de trabalho específicos.
- [ ] Sincronização opcional (sempre respeitando a [[Privacidade]]).

## Relacionado

- [[MVP]] · [[Funcionalidades]] · [[Visão]] · [[Arquitetura]]
