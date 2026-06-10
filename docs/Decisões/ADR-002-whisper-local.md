# ADR-002 — Transcrição local com whisper.cpp

## Status
✅ Aceito (2026)

## Contexto
O reconhecimento de fala é o coração do MestreWrite. As opções principais eram:
1. **APIs de transcrição na nuvem** — alta qualidade, mas enviam cada palavra a
   servidores externos, exigem internet e custam por uso.
2. **Transcrição local** — roda na máquina do usuário, offline e sem custo por uso.

A [[Privacidade]] é o primeiro princípio da [[Visão]], e o funcionamento offline
ataca diretamente as limitações de [[Problema]]. Isso elimina as opções de nuvem
como padrão.

## Decisão
Usar **whisper.cpp** (implementação em C/C++ do modelo Whisper) para transcrição
**100% local**, invocada pelo processo principal do Electron (ver [[Arquitetura]]).

## Consequências

**Positivas**
- Áudio e texto **nunca saem do dispositivo** ([[Privacidade]]).
- Funciona **offline**.
- Sem custo por uso; bom desempenho em CPU e aceleração Metal no macOS.
- Qualidade de transcrição alta.

**Negativas / trade-offs**
- O usuário precisa instalar o binário (`brew install whisper-cpp`) e baixar um modelo.
- Modelos maiores ocupam espaço em disco e exigem mais da máquina.
- Latência depende do hardware do usuário.

**Mitigações**
- Documentar bem os pré-requisitos no README.
- Permitir escolha de modelo (tamanho vs. velocidade) em fases futuras ([[Roadmap]]).

## Relacionado
- [[Privacidade]] · [[Stack-Técnico]] · [[Arquitetura]] · [[ADR-001-electron]]
