# Arquitetura

Visão geral dos componentes do MestreWrite e como se conectam. As escolhas
tecnológicas estão detalhadas em [[Stack-Técnico]] e nas notas das ADRs.
O backend funcional foi implementado conforme [[ADR-006-backend-core]].

## Fluxo principal

```
Atalho global (Cmd+Shift+Space)
       │
       ▼
┌──────────────────┐
│  IDLE            │ ← overlay idle
│  toggle atalho   │
└───────┬──────────┘
        │
        ▼
┌──────────────────┐     sox … highpass 80 silence … (VAD)
│  RECORDING       │ ───→  arquivo .wav em os.tmpdir()
│  overlay listening│     (16kHz mono 16-bit; corta silêncio)
└───────┬──────────┘
        │ silêncio detectado (sox encerra) · ou toggle · ou trava 30s
        ▼
┌──────────────────┐     whisper-cli -m modelo -f .wav -l pt
│  TRANSCRIBING    │ ───→  texto
│  overlay processing│
└───────┬──────────┘
        │
        ▼
 clipboard → writeText(texto) → osascript ⌘V → restore clipboard após 300ms
        │
        ▼
┌──────────────────┐
│  IDLE            │ ← texto inserido no app em foco
│  overlay idle    │
└──────────────────┘
```

## Componentes (todos implementados)

### 1. Ícone na bandeja (tray) `src/main/main.js`
Ícone roxo na barra de menus com tooltip dinâmico (Pronto / Gravando… / Transcrevendo…)
e menu "Sair". Indispensável pois o dock fica oculto.

### 2. Atalho global `src/main/main.js`
`Cmd+Shift+Space` registrado via `globalShortcut`. Inicia gravação (IDLE → RECORDING).
A parada é **automática por silêncio** (o sox encerra sozinho); o atalho de novo
força a parada. Ignorado em TRANSCRIBING para evitar corrida. Ver
[[ADR-009-vad-silencio-e-otimizacao]].

### 3. Gravação de áudio `src/main/audio.js`
Spawna `sox -d -r 16000 -c 1 -b 16 <wav> highpass 80 silence …` como child process
(**VAD nativo**: corta o silêncio inicial e encerra após ~1,8 s de silêncio).
Arquivo único em `os.tmpdir()`; resolve no `close` (silêncio ou SIGTERM). Trava de
tempo de 30 s. Erro: `Notification` se `sox` não instalado. Ver [[ADR-009-vad-silencio-e-otimizacao]].

### 4. Transcrição com whisper.cpp `src/main/transcribe.js`
Spawna `whisper-cli -m <modelo> -f <wav> -l pt -nt --output-txt -of <base>`.
Valida existência do modelo antes da gravação. Lê `.txt`, deleta `.wav` + `.txt`
(privacidade — nada persiste). Erro: `Notification` se `whisper-cli` não instalado.

### 5. Overlay visual `src/overlay/`
Orb WebGL iridescente dentro de pílula branca frosted + waveform + glow nas bordas
+ bloom + chime sonoro. Estados idle/listening/processing via IPC.
Detalhes em [[Design]], [[ADR-004-overlay-visual]] e [[ADR-005-overlay-pilula-webgl]].

### 6. Inserção de texto `src/main/typer.js`
Salva clipboard → `clipboard.writeText(texto)` → spawn `osascript` com ⌘V via
stdin (sem shell escaping) → 300ms → restaura clipboard original.
Erro: `Notification` orientando permissão de Acessibilidade.

### 7. Configuração centralizada `src/main/config.js`
Atalho (`CmdOrCtrl+Shift+Space`), idioma (`pt`), caminho do modelo
(`~/mestrewrite/models/ggml-base.bin`), nomes dos binários.

## Processo Electron

- **Processo principal (main):** `src/main/main.js` (orquestrador) + `config.js` +
  `audio.js` + `transcribe.js` + `typer.js` — tray, atalho, gravação, transcrição,
  inserção, máquina de estados.
- **Processo de renderização (overlay):** `src/overlay/` — orb WebGL, pílula,
  waveform, glow, bloom, som.
- **Preload (`src/overlay/preload.js`):** ponte segura (`contextBridge`) que entrega
  o estado e nível de áudio do main ao overlay — `contextIsolation` ligado,
  **sem** `nodeIntegration`.

## Relacionado

- [[Stack-Técnico]] · [[Funcionalidades]] · [[MVP]] · [[Design]] · [[Privacidade]] ·
  [[ADR-004-overlay-visual]] · [[ADR-005-overlay-pilula-webgl]] · [[ADR-006-backend-core]]
