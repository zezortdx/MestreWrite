# ADR-010 — Suporte a Windows (código cross-platform + build via CI)

## Status
✅ Aceito (2026-06) · ⚠️ Windows **experimental** (não testado em runtime ainda)

## Contexto
O MestreWrite nasceu macOS-only e dependia de coisas específicas do macOS: colagem
via `osascript`, captura do `sox` com `-d` (CoreAudio) e binários no `/opt/homebrew/bin`.
O empacotamento só gerava `.dmg`. Para abrir ao Windows, o código precisava ficar
**cross-platform** — sem reescrever o núcleo.

Restrição importante: **não é possível compilar nem testar Windows a partir do Mac**
de desenvolvimento. Por isso o build do Windows é feito por **CI em runner Windows**.

## Decisão

### Código cross-platform (`process.platform`)
| Área | macOS | Windows |
|------|-------|---------|
| Colar texto (`typer.js`) | `osascript` → `keystroke "v" using command down` | PowerShell → `SendKeys "^v"` |
| Captura de áudio (`audio.js`) | `sox -d …` (CoreAudio) | `sox -t waveaudio default …` |
| Resolver binários (`binpath.js`) | acrescenta `/opt/homebrew/bin`, … ao PATH | acrescenta scoop/choco/winget + trata `.exe` (PATHEXT) |

O atalho global já era `CmdOrCtrl+...` (cross-platform); `app.dock.hide()` já estava
sob `process.platform === 'darwin'`. Linux entra como *best-effort* (`xdotool`).

### Empacotamento (electron-builder)
- Alvo Windows **NSIS** (`MestreWrite-Setup-<versão>.exe`), instalador com escolha de
  diretório e atalho na área de trabalho. Ícone Windows a partir de `build-assets/icon.png`.
- Scripts: `npm run dist:mac` e `npm run dist:win` (cada um no seu SO).

### Build via CI (GitHub Actions)
- `.github/workflows/build.yml`: a cada **tag `vX.Y.Z`**, faz matrix em
  `macos-latest` (→ `.dmg`/`.zip`) e `windows-latest` (→ `.exe`), e um job `release`
  anexa os artefatos à Release. Também roda sob demanda (`workflow_dispatch`).
- O build não precisa de `sox`/`whisper` (são deps de runtime).

### Dependências no Windows
- Documentadas (não empacotadas por enquanto): `sox` via scoop/choco/winget;
  `whisper-cli.exe` dos binários do whisper.cpp no PATH; modelo em
  `%USERPROFILE%\mestrewrite\models`. O app acha tudo pelo PATH (apps GUI no Windows
  herdam o PATH do usuário) e avisa se faltar.

## Consequências

**Positivas**
- Mesma base de código roda em macOS e Windows; build automatizado e reproduzível.
- Caminho claro para Linux depois.

**Negativas / trade-offs**
- ⚠️ **Windows não testado em runtime** aqui — `SendKeys`/`waveaudio` precisam de
  validação numa máquina Windows real.
- `SendKeys` pode ser sensível a foco; PowerShell tem startup mais lento que `osascript`.
- Deps do Windows ainda são instaladas à mão (sem instalador único).

## Arquivos
### Criados
- `.github/workflows/build.yml`

### Modificados
- `src/main/typer.js` — colagem por plataforma (osascript / SendKeys / xdotool).
- `src/main/audio.js` — entrada do sox por plataforma (`-d` / `waveaudio`).
- `src/main/binpath.js` — diretórios e extensões por plataforma.
- `package.json` — alvo `win`/`nsis`, scripts `dist:mac`/`dist:win`.
- `README.md` — seção de instalação no Windows.

## Relacionado
- [[Stack-Técnico]] · [[Arquitetura]] · [[Roadmap]] · [[ADR-008-empacotamento-electron-builder]] ·
  [[ADR-003-inserção-via-clipboard]] · [[ADR-006-backend-core]]
