# ADR-012 — Desempenho do STT: servidor persistente + tuning de VAD e flags

## Status
Aceito (2026-06)

## Contexto
O speech-to-text estava lento e inconsistente. Investigação (dois subagentes:
diagnóstico quantitativo + pesquisa) com áudio reproduzível (via `say`) no Apple M4 Pro:

- O **whisper.cpp NÃO é o gargalo**: já usa Metal (GPU), RTF ~0.035 (transcreve 7s em
  ~0,25s) e é determinístico com greedy + `--no-fallback`.
- **Maior fonte de lentidão percebida: o VAD do `sox`** esperava **1,8s de silêncio**
  para encerrar — somava ~1,8s fixos a cada ditado (muito mais que os ~0,25s do whisper).
- **Cold-start ~116ms por chamada** (spawn + init Metal + recarga do modelo de 150 MB)
  = ~47% do tempo de processo, recriado a cada ditado.
- **Inconsistência:** VAD mal-disparado em ruído; modelo `base` fraco em PT; alucinação
  em silêncio e "arraste" de contexto entre ditados.

## Decisão

### 1. Servidor whisper persistente (`whisper-server`) com fallback
- `src/main/whisperServer.js`: sobe um `whisper-server` no launch (modelo carregado 1x
  na memória, porta local efêmera). Cada ditado vira um `POST /inference` (HTTP local).
- `src/main/transcribe.js`: usa o servidor se pronto; **se o servidor não subir ou
  falhar numa chamada, cai automaticamente no `whisper-cli`** (mesmo resultado).
- Medido: **~150ms (servidor) vs ~234ms (CLI)** por chamada — ~1,6x, elimina o cold-start.
- Cross-platform (mesmo binário em macOS e Windows). Encerrado em `will-quit`.

### 2. VAD mais responsivo
- `silencioDuracao` **1,8s → 0,8s** (corta ~1s de espera após parar de falar).
  Configurável em `~/.mestrewrite/config.json`.

### 3. Flags de decodificação (consistência + velocidade)
- `-bs 1` (beam size 1 / greedy): determinístico e ~14% mais rápido.
- `-mc 0` (max-context 0 / "no context"): cada ditado é independente — evita arrastar
  alucinação/contexto entre transcrições. (Nesta versão do whisper.cpp não há `-nc`.)
- `-fa` (flash-attention) **desligado por padrão**: ganho ~0 e pode degradar qualidade
  em PT (whisper.cpp #3020). Mantidos `--no-fallback` e `--suppress-nst`.

### 4. Correção de design da config
- `configManager.salvarConfig` passou a mesclar com o **arquivo** existente, não com os
  DEFAULTS. Antes ele "congelava" os defaults no `config.json`, impedindo que novos
  padrões (tuning) passassem a valer. Agora o `config.json` guarda só as escolhas do
  usuário (atalho/idioma/modelo) e o tuning evolui pelos DEFAULTS.

## Consequências
**Positivas**
- Latência percebida muito menor (VAD ~ -1s; servidor ~ -85ms/chamada e sem cold-start).
- Mais consistente (greedy + no-context + VAD); fallback seguro para o CLI.
- Tuning evolui sem o usuário reconfigurar.

**Negativas / trade-offs**
- Um processo extra (`whisper-server`) durante a execução.
- A **acurácia** ainda é limitada pelo modelo `base` em PT — o próximo grande ganho de
  qualidade é trocar para `small` ou `large-v3-turbo` (ver [[Roadmap]]); fica viável
  graças ao servidor persistente.
- `silencioDuracao` de 0,8s pode cortar pausas longas; é ajustável.

## Arquivos
### Criados
- `src/main/whisperServer.js`
### Modificados
- `src/main/transcribe.js` (servidor + fallback CLI; flags `-bs`/`-mc`)
- `src/main/main.js` (sobe/encerra o servidor)
- `src/main/config.js` · `configManager.js` (novos defaults + correção do `salvarConfig`)

## Relacionado
- [[Stack-Técnico]] · [[Arquitetura]] · [[Setup]] · [[ADR-009-vad-silencio-e-otimizacao]] ·
  [[ADR-002-whisper-local]] · [[ADR-006-backend-core]]
