# MVP

Escopo exato do **primeiro protótipo** do MestreWrite. O objetivo é provar o fluxo
central de ponta a ponta com o mínimo possível.

## 🎯 Objetivo
Apertar um atalho, falar, e ver o **texto cru** aparecer no app em foco — tudo
**local** no **macOS**.

## ✅ No escopo (implementado)

- ✅ **Plataforma:** apenas **macOS**.
- ✅ **Transcrição:** **crua** (literal, sem correção por IA).
- ✅ App Electron com **ícone na bandeja** e tooltip dinâmico ([[ADR-006-backend-core]]).
- ✅ **Atalho global** `Cmd+Shift+Space` para iniciar/parar a gravação ([[ADR-006-backend-core]]).
- ✅ **Captura de áudio** via `sox` → `src/main/audio.js`.
- ✅ **Transcrição local** via `whisper.cpp` → `src/main/transcribe.js`.
- ✅ **Inserção de texto** no app em foco via clipboard + osascript → `src/main/typer.js` (ver [[ADR-003-inserção-via-clipboard]]).
- ✅ **Overlay** com orb WebGL e glow nas bordas, estados idle/listening/processing (ver [[Design]] e [[ADR-005-overlay-pilula-webgl]]).
- ✅ **Máquina de estados** IDLE → RECORDING → TRANSCRIBING → IDLE em `src/main/main.js` ([[ADR-006-backend-core]]).
- ✅ **Configuração centralizada** (atalho, idioma, caminho do modelo) → `src/main/config.js`.

## ❌ Fora do escopo (por enquanto)

- Correção inteligente por IA.
- Modos de escrita, comandos de voz, dicionário pessoal, histórico.
- Windows e Linux.
- Sistema de extensões.

Tudo isso está mapeado no [[Roadmap]].

## 🧪 Critério de sucesso
Um usuário consegue, em um editor de texto qualquer no macOS: apertar o atalho,
ditar uma frase, soltar, e ver a frase transcrita inserida — sem que nenhum áudio
ou texto saia da máquina ([[Privacidade]]).

## Relacionado

- [[Arquitetura]] · [[Stack-Técnico]] · [[Roadmap]] · [[Design]]
