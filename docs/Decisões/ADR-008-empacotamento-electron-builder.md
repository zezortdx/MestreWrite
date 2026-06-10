# ADR-008 — Empacotamento com electron-builder (.dmg/.zip) e ícone gerado do orb

## Status
✅ Aceito (2026-06)

## Contexto
Para virar uma **aplicação real** publicável no GitHub, o MestreWrite precisava de
um **build empacotado** (um `.app`/`.dmg` instalável) em vez de só `npm start`, além
de um **ícone próprio** coerente com a identidade (o orb).

## Decisão

### Ferramenta: electron-builder
- `electron-builder` (dev dependency) configurado pelo campo `build` do `package.json`.
- Alvos macOS: **`dmg`** e **`zip`** (arquitetura do host — Apple Silicon `arm64`).
- Saída em `dist/` (ignorada no git); recursos de build em **`build-assets/`**
  (versionada — o `.gitignore` ignora `build/`, por isso o nome diferente).

### Sem assinatura de código
- `mac.identity: null` → build **não assinado** (projeto open source). Na 1ª abertura,
  o usuário usa **clique direito → Abrir** para passar pelo Gatekeeper.

### Info.plist
- `LSUIElement: true` → app **agente** (sem ícone no dock; é um app de bandeja/tray).
- `NSMicrophoneUsageDescription` → texto do prompt de permissão de microfone.

### Ícone gerado a partir do orb
- `scripts/gerar-icone.js` abre uma `BrowserWindow` que carrega `scripts/icone.html`
  (squircle violeta + o **mesmo shader** `src/overlay/orb-core.js`), aguarda o WebGL
  e captura via `webContents.capturePage()` → `build-assets/icon.png` (1024+).
- `scripts/gerar-icns.sh` converte o PNG em `build-assets/icon.icns` (via `sips` +
  `iconutil`, todos os tamanhos do iconset). macOS apenas.
- `npm run icone` encadeia os dois.

### Scripts npm
| Script | Ação |
|--------|------|
| `npm run dist` | `electron-builder --mac` → `dist/MestreWrite-<versão>-arm64.dmg` (+ `.zip`) |
| `npm run pack` | `electron-builder --dir` (build rápido só do `.app`, p/ testar) |
| `npm run icone` | regenera o ícone a partir do orb |

`package.json` ganhou também `author`, `repository`, `homepage` e `bugs`.

## Consequências

**Positivas**
- `.dmg`/`.zip` distribuíveis; app com ícone próprio e sem dock (agente de bandeja).
- Ícone reproduzível a partir do orb (uma fonte de verdade visual).

**Negativas / trade-offs**
- Build **não assinado/notarizado** → aviso do Gatekeeper na 1ª abertura.
- Só `arm64` por enquanto (x64/universal ficam como melhoria).

> ✅ **PATH resolvido:** aberto pelo Finder, o app herdaria um `PATH` mínimo (sem
> `/opt/homebrew/bin`). `src/main/binpath.js` acrescenta os diretórios comuns do
> Homebrew/MacPorts ao `process.env.PATH` no startup, então `sox`/`whisper-cli`/
> `osascript` são encontrados. Há também checagem de dependências no startup, com
> notificação e o comando `brew install` se algo faltar.

## Arquivos
### Criados
- `scripts/gerar-icone.js`, `scripts/icone.html`, `scripts/gerar-icns.sh`
- `build-assets/icon.icns`, `build-assets/icon.png`

- `src/main/binpath.js` — resolve binários (PATH do Homebrew) p/ o app aberto pelo Finder.

### Modificados
- `package.json` — campo `build`, scripts (`dist`/`pack`/`icone`), metadados, dep `electron-builder`.
- `src/main/main.js` — aplica `pathAumentado()` no startup + checagem de dependências.
- `README.md` — seções "Baixar e instalar (uso normal)" e "Build".

## Relacionado
- [[Stack-Técnico]] · [[Setup]] · [[ADR-001-electron]] · [[ADR-007-setup-primeira-execucao]]
