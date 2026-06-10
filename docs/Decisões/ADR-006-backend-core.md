# ADR-006 — Backend funcional: state machine + módulos de áudio/transcrição/inserção

## Status
✅ Aceito (2026-06)

## Contexto
O MVP do MestreWrite precisava do fluxo completo de ponta a ponta:
1. Usuário aperta atalho → microfone grava
2. Aperta de novo → para, transcreve com whisper.cpp
3. Texto inserido no app em foco

O overlay visual ([[ADR-004-overlay-visual]] / [[ADR-005-overlay-pilula-webgl]]) já
existia com os três estados (idle/listening/processing), mas o backend que orquestra
o fluxo real não estava implementado — apenas atalhos de teste temporários.

## Decisão

### Arquitetura em módulos
Dividir o backend em 4 módulos + orquestrador:

| Módulo | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| Config | `src/main/config.js` | Atalho, idioma (`pt`), caminho do modelo, nomes de binários |
| Áudio | `src/main/audio.js` | Spawn `sox -d -r 16000 -c 1 -b 16`, arquivo temp, SIGTERM + await `close` |
| Transcrição | `src/main/transcribe.js` | Spawn `whisper-cli -m <modelo> -f <wav> -l pt -nt --output-txt`, limpeza de `.wav`/`.txt` |
| Inserção | `src/main/typer.js` | Clipboard + `osascript` via stdin (sem shell), restaura clipboard original |
| Orquestrador | `src/main/main.js` | State machine, tray, atalho global, notificações de erro |

### Máquina de estados
```
IDLE → [Cmd+Shift+Space] → RECORDING  (overlay: 'listening')
RECORDING → [Cmd+Shift+Space] → TRANSCRIBING (overlay: 'processing')
TRANSCRIBING → [fim da transcrição] → IDLE (overlay: 'idle')
```
- Atalho ignorado em TRANSCRIBING (evita corrida).
- Estado do overlay sincronizado via IPC `webContents.send('overlay-state', estado)`.

### Tray icon
- Ícone na barra de menus: **PNG** roxo (círculos concêntricos) em `src/assets/`,
  carregado via `nativeImage.createFromPath` (+ `tray-icon@2x.png` p/ Retina).
  ⚠️ `nativeImage` **não renderiza SVG** (data-URL SVG vira imagem vazia) — por
  isso PNG. Salvaguarda: se o ícone falhar, um `tray.setTitle` mantém o tray clicável.
- Tooltip dinâmico: "Pronto (Cmd+Shift+Space)" / "Gravando…" / "Transcrevendo…".
- Menu com "Sair" (`role: 'quit'`).
- Essencial: sem dock (oculto) e sem tray, o app não teria como ser encerrado.

### Tratamento de erros
- **sox não instalado** → Notification com instrução `brew install sox`.
- **whisper-cli não instalado** → Notification com `brew install whisper-cpp`.
- **Modelo não encontrado** → verificado no startup e antes de gravar; Notification com comando `curl`.
- **Permissão de Acessibilidade** → Notification orientando Ajustes > Privacidade > Acessibilidade.
- **Clipboard do usuário** → salvo antes de escrever, restaurado 300ms após colar.

### Privacidade
- Áudio gravado em `os.tmpdir()` com nome único.
- Após transcrição, `.wav` e `.txt` são deletados via `fs.unlink`.
- Nenhum dado sai da máquina ([[Privacidade]]).

## Consequências

**Positivas**
- Fluxo completo do MVP funcional de ponta a ponta.
- Módulos independentes e testáveis isoladamente.
- Configuração centralizada facilita mudanças (idioma, atalho, modelo).

**Negativas / trade-offs**
- Dependência de `sox` e `whisper-cli` como binários externos (Homebrew).
- Latência do whisper (modelo base ~2-5s em CPU Apple Silicon).
- Clipboard do usuário é brevemente substituído (restaurado após 300ms).

## Melhorias futuras
- Enviar nível de áudio em tempo real do main para o overlay via IPC
  (`overlay-audio-level`) para waveform reagir à voz real.
- Substituir `sox` por captura nativa (ver [[Roadmap]] fase 3).
- Substituir clipboard paste por inserção nativa por plataforma.

## Arquivos

### Criados
- `src/main/config.js` (24 linhas)
- `src/main/audio.js` (81 linhas)
- `src/main/transcribe.js` (100 linhas)
- `src/main/typer.js` (70 linhas)
- `src/assets/tray-icon.png` + `tray-icon@2x.png` — ícone do tray (PNG; SVG não
  funciona em `nativeImage`).

### Modificados
- `src/main/main.js` — adicionado state machine, tray, validação de modelo no startup;
  removidos atalhos de teste temporários. (Integração: tray via PNG em vez de SVG.)
- `src/overlay/preload.js` — adicionado canal `aoNivelAudio` para futuro nível de áudio.
- `src/overlay/pilula.js` — debounce no resize via `requestAnimationFrame`.

## Relacionado
- [[Arquitetura]] · [[MVP]] · [[Roadmap]] · [[Stack-Técnico]] ·
  [[ADR-001-electron]] · [[ADR-002-whisper-local]] · [[ADR-003-inserção-via-clipboard]] ·
  [[ADR-004-overlay-visual]] · [[ADR-005-overlay-pilula-webgl]]
