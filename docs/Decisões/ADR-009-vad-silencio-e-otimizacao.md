# ADR-009 — Parada automática por silêncio (VAD) e otimizações de velocidade/peso

## Status
Aceito (2026-06)

## Contexto
Dois problemas relatados:
1. **Reconhecimento ruim da fala.** Causa provável: o modo *toggle* gravava silêncio
   e ruído nas pontas, e o whisper **alucina** texto em cima de silêncio/ruído.
2. O usuário queria que, ao acionar o atalho, o app **escute e pare sozinho no
   silêncio** (em vez de exigir um segundo toque).

Também foi pedida uma **otimização completa** (mais rápido e leve).

## Decisão

### VAD nativo via efeito `silence` do sox
- `audio.js` passa a gravar com:
  `sox -d -r 16000 -c 1 -b 16 <wav> highpass 80 silence 1 0.1 L% 1 D L%`
  - `highpass 80` — corta ruído de baixa frequência antes da detecção.
  - `silence 1 0.1 L%` — **corta o silêncio inicial** (só começa quando há fala).
  - `1 D L%` — **encerra após D s de silêncio contínuo**.
- O sox **fecha sozinho** ao detectar silêncio → a transcrição dispara
  automaticamente. Apertar o atalho de novo continua funcionando como **parada
  manual** (override). Há uma **trava de tempo** (`duracaoMax`, 30 s) caso nada seja
  falado.
- Efeito colateral positivo: como o whisper recebe **só a fala** (sem silêncio nas
  pontas), some a alucinação — resolve o problema (1).

### Parâmetros configuráveis (`~/.mestrewrite/config.json`)
| Chave | Default | O que faz |
|-------|---------|-----------|
| `autoParar` | `true` | liga/desliga o auto-stop por silêncio |
| `silencioLimiar` | `2` | % de volume tido como "silêncio" (sensibilidade) |
| `silencioDuracao` | `1.8` | s de silêncio contínuo para encerrar |
| `duracaoMax` | `30` | s — trava de segurança |

> Ajuste fino: se cortar no meio da fala, **aumente** `silencioDuracao`; se não
> começar a gravar, **abaixe** `silencioLimiar`; se pegar ruído, **aumente**-o.

### Otimizações (rápido e leve)
- **Threads do whisper**: default subiu de `min(4, cpus)` para `min(8, cpus)` —
  aproveita os núcleos de performance do Apple Silicon (mais rápido).
- **Áudio mais curto** (VAD corta as pontas) → **transcrição mais rápida**.
- Já em uso: `-fa` (flash-attention), `--no-fallback`, `--suppress-nst`, `-nt`.
- **Empacotamento mais leve**: `compression: maximum` + `electronLanguages`
  (só `en`/`pt`/`pt_BR`) → `.dmg` de **114 MB → 104 MB**.
- Overlay já pausa o `requestAnimationFrame` no idle (sem custo de GPU parado).

## Consequências

**Positivas**
- Fluxo "aperta → fala → para no silêncio → cola" sem segundo toque.
- Menos alucinação do whisper (recebe só a fala); transcrição mais rápida.
- App/instalador mais leves.

**Negativas / trade-offs**
- VAD por limiar depende do ambiente: pode exigir ajuste de `silencioLimiar`/
  `silencioDuracao` em microfones/ambientes muito diferentes (configurável).
- `silence` com corte inicial: se o limiar estiver alto demais para uma voz baixa,
  pode demorar a começar (mitigado pela parada manual e pela trava de tempo).

## Arquivos
### Modificados
- `src/main/audio.js` — efeitos `highpass` + `silence` (VAD).
- `src/main/main.js` — fluxo: auto-stop por silêncio, parada manual como override,
  `processar()` extraído de `finalizar()`, trava `duracaoMax`.
- `src/main/config.js` · `configManager.js` — novos parâmetros + threads.
- `package.json` — `compression: maximum`, `electronLanguages`.

## Relacionado
- [[Setup]] · [[Stack-Técnico]] · [[Arquitetura]] · [[ADR-006-backend-core]] ·
  [[ADR-002-whisper-local]] · [[ADR-008-empacotamento-electron-builder]]
