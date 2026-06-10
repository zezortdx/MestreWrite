# ADR-001 — Electron como framework desktop

## Status
✅ Aceito (2026)

## Contexto
O MestreWrite precisa de um app desktop que: rode em macOS agora e em Windows/Linux
depois ([[Roadmap]]); exiba um [[Design|overlay]] animado e translúcido sempre no topo;
registre atalhos globais e um ícone na bandeja; e orquestre processos de sistema
(áudio, whisper, inserção de texto) descritos na [[Arquitetura]]. Precisamos de
velocidade de desenvolvimento e de uma única base de código multiplataforma.

## Decisão
Adotar **Electron** como framework do app desktop, usando:
- **Processo principal (Node)** para tray, atalho global, gravação, whisper e inserção.
- **Processo de renderização (web)** para o overlay do orb e a borda gradiente.

## Consequências

**Positivas**
- Multiplataforma com uma só base de código (caminho claro para Windows/Linux).
- HTML/CSS/JS é ideal para o overlay iridescente animado ([[Design]]).
- APIs prontas de `globalShortcut`, `Tray` e janelas transparentes sempre-no-topo.
- Ecossistema e comunidade enormes.

**Negativas / trade-offs**
- Maior consumo de memória e bundle mais pesado que um app nativo.
- Camada extra entre a UI e o sistema operacional.

**Mitigações**
- Manter o overlay leve; mover trabalho pesado (whisper) para fora do processo de UI.
- Reavaliar partes nativas no futuro (ver [[Stack-Técnico]] e [[Roadmap]] fase 3).

## Relacionado
- [[Stack-Técnico]] · [[Arquitetura]] · [[Design]] · [[ADR-002-whisper-local]]
