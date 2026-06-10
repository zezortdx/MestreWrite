# MestreWrite

![status](https://img.shields.io/badge/status-prot%C3%B3tipo%20(WIP)-orange)
![plataforma](https://img.shields.io/badge/plataforma-macOS-blue)
![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![versão](https://img.shields.io/badge/vers%C3%A3o-0.1.0-lightgrey)

**MestreWrite** transforma sua fala em texto inteligente em **qualquer aplicativo**
do computador. Funciona **localmente e offline** — sua voz nunca sai da sua máquina.

> 🟣 Aperte um atalho, fale, e o texto aparece onde o cursor estiver.
> Sem nuvem, sem assinatura, sem espionagem.

## ⚠️ Status

Este projeto está em fase de **protótipo (Work In Progress)**. O MVP atual cobre
apenas **macOS** com **transcrição crua** (fala → texto, sem correção por IA ainda).
Veja o escopo em [docs/MVP.md](docs/MVP.md) e a direção em [docs/Roadmap.md](docs/Roadmap.md).

> **MVP funcional de ponta a ponta:** atalho → gravação (`sox`) → transcrição local
> (`whisper.cpp`) → inserção no app em foco, com o overlay (orb WebGL + glow +
> som) refletindo os estados. Passo a passo de instalação/execução em
> [docs/Setup.md](docs/Setup.md).

## ✨ Visão geral

- 🎙️ **Escrita por voz** em qualquer app (editor, navegador, chat, e-mail).
- 🔒 **Privacidade em primeiro lugar** — transcrição 100% local via `whisper.cpp`.
- 🌈 **Overlay elegante** — orb iridescente animado e borda gradiente (estética Apple Intelligence).
- 🆓 **Open source, licença MIT.**

A documentação completa está organizada como um **vault Obsidian** em [`docs/`](docs/).
Comece por [docs/00-Home.md](docs/00-Home.md).

## 📋 Pré-requisitos

- [Homebrew](https://brew.sh/) (macOS)
- [Node.js](https://nodejs.org/) >= 18
- `whisper-cpp` — `brew install whisper-cpp`
- `sox` (captura de áudio) — `brew install sox`

## ▶️ Como rodar

Guia completo (deps, modelo, permissões, troubleshooting) em
[docs/Setup.md](docs/Setup.md). Resumo:

```bash
# 1. Dependências
brew install sox whisper-cpp

# 2. Modelo do Whisper (~147 MB) no caminho de src/main/config.js
mkdir -p ~/mestrewrite/models
curl -L -o ~/mestrewrite/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

# 3. Rodar
npm install
npm start
```

> Na **primeira execução**, conceda **Microfone** e **Acessibilidade** ao app em
> Ajustes do Sistema → Privacidade e Segurança (detalhes em [docs/Setup.md](docs/Setup.md)).
> Uso: **`Cmd+Shift+Space`** inicia/para a gravação; sair pelo ícone no tray.

## Build (empacotar como app)

Gerar um app macOS (`.app`, `.dmg` e `.zip`) com
[electron-builder](https://www.electron.build/):

```bash
npm install
npm run dist     # → dist/MestreWrite-<versão>-arm64.dmg (e .zip)
npm run pack     # build rápido só do .app (sem empacotar), para testar
```

O ícone do app é gerado a partir do próprio orb:

```bash
npm run icone    # scripts/gerar-icone.js renderiza o shader → build-assets/icon.icns
```

> Os builds são **não assinados** (projeto open source). Na primeira abertura,
> use **clique direito → Abrir** para passar pelo Gatekeeper. O app empacotado
> ainda depende de `sox`, `whisper-cpp` e do modelo acessíveis no sistema
> (ver [Pré-requisitos](#-pré-requisitos) e [docs/Setup.md](docs/Setup.md)).

## 🤝 Como contribuir

1. Leia a [Visão](docs/Visão.md) e o [Roadmap](docs/Roadmap.md) para entender a direção.
2. Abra uma issue descrevendo a melhoria ou bug.
3. Faça um fork, crie uma branch (`feat/minha-feature`) e abra um Pull Request.
4. Decisões de arquitetura são registradas em [docs/Decisões/](docs/Decisões/) (ADRs).

## 📄 Licença

[MIT](LICENSE) © 2026 MestreWrite
