# Setup & Como rodar (macOS)

Passos reais para instalar as dependências, baixar o modelo, conceder permissões e
rodar o MestreWrite no macOS. O fluxo de ponta a ponta (atalho → fala → texto)
está descrito em [[Arquitetura]]; o escopo em [[MVP]].

## 1. 📦 Dependências (Homebrew)
```bash
brew install sox whisper-cpp
```
- `sox` → captura de áudio (`src/main/audio.js`).
- `whisper-cpp` → transcrição local; instala o binário como **`whisper-cli`**
  (nome esperado em `src/main/config.js`).

## 2. 🧠 Modelo do Whisper
O caminho é fixado em `src/main/config.js` (`PATH_MODELO`). Baixe o modelo **base**
(~147 MB) para lá:
```bash
mkdir -p ~/mestrewrite/models
curl -L -o ~/mestrewrite/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```
> O app valida o modelo no startup e antes de gravar; se faltar, mostra uma
> `Notification` com este comando. Idioma da transcrição = `pt` (em `config.js`).

## 3. ▶️ Rodar
```bash
npm install   # baixa o Electron
npm start     # = electron .
```
> ⚠️ Se o `node`/`npm` local estiver quebrado, dá para lançar direto pelo binário do
> Electron (sem `npm`):
> ```bash
> node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .
> ```

> Na **primeira execução** (sem `~/.mestrewrite/config.json`), abre a tela de
> **setup** para definir atalho, idioma e modelo; ao concluir, o app salva a config
> e se relança (ver [[ADR-007-setup-primeira-execucao]]).

## 3b. 📦 Build (empacotar como app)
Gerar um app macOS (`.app`, `.dmg`, `.zip`) com `electron-builder`
(ver [[ADR-008-empacotamento-electron-builder]]):
```bash
npm run dist     # → dist/MestreWrite-<versão>-arm64.dmg (e .zip)
npm run pack     # build rápido só do .app (sem empacotar)
npm run icone    # regenera o ícone do app a partir do orb
```
> Builds **não assinados** (open source): na 1ª abertura use **clique direito →
> Abrir** p/ passar pelo Gatekeeper. O app empacotado ainda precisa de `sox`,
> `whisper-cpp` e do modelo acessíveis (ver passos 1–2).

## 4. 🔐 Permissões do macOS (primeira vez)
O app **precisa** de duas permissões — sem elas grava/cola falham com `Notification`:

1. **Microfone** — para o `sox` gravar. Aparece prompt no primeiro uso; ou habilite
   em **Ajustes do Sistema → Privacidade e Segurança → Microfone**.
2. **Acessibilidade** — para colar via `osascript` (⌘V). Habilite em
   **Ajustes do Sistema → Privacidade e Segurança → Acessibilidade**.

> Em desenvolvimento (rodando pelo binário), as entradas aparecem como **“Electron”**.
> Num `.app` empacotado/assinado, aparecerão como **“MestreWrite”**.

## 5. ⌨️ Usar
1. **`Cmd+Shift+Space`** → começa a gravar (overlay: pílula + som + glow).
2. Fale.
3. **`Cmd+Shift+Space`** de novo → para, transcreve (overlay: *processing*) e **cola
   o texto** no app em foco.
4. **Sair:** ícone roxo no tray (barra de menus) → **Sair**. (Não há dock nem
   atalho de quit — o tray é a saída.)

## 🛠️ Problemas comuns
| Sintoma | Causa / solução |
|---------|-----------------|
| Notificação "sox não encontrado" | `brew install sox` |
| Notificação "whisper-cli não encontrado" | `brew install whisper-cpp` |
| Notificação "Modelo não encontrado" | Baixar o modelo (passo 2) no caminho de `config.js` |
| Texto não cola | Conceder **Acessibilidade** (passo 4) e tentar de novo |
| Nada grava | Conceder **Microfone**; relançar o app após conceder |
| "Transcrição vazia" | Áudio curto/sem fala — fale por ~1s+ |

## Relacionado
- [[Arquitetura]] · [[MVP]] · [[Stack-Técnico]] · [[ADR-006-backend-core]] ·
  [[ADR-002-whisper-local]] · [[ADR-003-inserção-via-clipboard]]
