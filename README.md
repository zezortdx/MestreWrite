<p align="center">
  <img src="build-assets/icon.png" width="128" alt="MestreWrite" />
</p>

<h1 align="center">MestreWrite</h1>

<p align="center">
  <img src="https://img.shields.io/badge/status-prot%C3%B3tipo%20(WIP)-orange" alt="status" />
  <img src="https://img.shields.io/badge/plataforma-macOS-blue" alt="plataforma" />
  <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-green" alt="licença" />
  <img src="https://img.shields.io/badge/vers%C3%A3o-0.1.0-lightgrey" alt="versão" />
</p>

<p align="center">
  <b>Escrita por voz em qualquer aplicativo — local, offline e privada.</b><br/>
  Aperte um atalho, fale, pare de falar: o texto aparece onde o cursor estiver.<br/>
  Sem nuvem, sem assinatura, sem espionagem.
</p>

## ⚠️ Status

Projeto em fase de **protótipo (Work In Progress)**. O MVP cobre **macOS** com
**transcrição crua** (fala → texto, sem correção por IA ainda). Escopo em
[docs/MVP.md](docs/MVP.md); direção em [docs/Roadmap.md](docs/Roadmap.md).

## ✨ Visão geral

- 🎙️ **Escrita por voz** em qualquer app (editor, navegador, chat, e-mail).
- 🔒 **Privacidade em primeiro lugar** — transcrição 100% local via `whisper.cpp`.
- 🤫 **Para sozinho no silêncio** — fale e solte; ele detecta a pausa e transcreve.
- 🌈 **Overlay elegante** — orb iridescente animado e glow nas bordas (estética Apple Intelligence).
- 🆓 **Open source, licença MIT.**

## 📸 Capturas

Tela de **primeira execução** (definir atalho, idioma e modelo) — tema claro, com o
orb como rosto do app:

| Atalho | Idioma | Modelo |
|:------:|:------:|:------:|
| ![Atalho](docs/assets/setup-atalho.png) | ![Idioma](docs/assets/setup-idioma.png) | ![Modelo](docs/assets/setup-modelo.png) |

## ⬇️ Baixar e instalar (uso normal)

> macOS (Apple Silicon). Tudo roda no seu Mac — nada vai para a nuvem.

1. **Baixe** o arquivo `MestreWrite-<versão>-arm64.dmg` na página de
   [**Releases**](https://github.com/pedrojuliocabralneto/mestrewrite/releases).
2. Abra o `.dmg` e **arraste o MestreWrite para a pasta Aplicativos**.
3. **Na primeira abertura:** como o app é open source e **não assinado**, clique
   nele com o **botão direito → Abrir → Abrir** (só na 1ª vez; depois abre normal).
4. **Instale os componentes de transcrição** (uma vez só), no Terminal — precisa do
   [Homebrew](https://brew.sh):
   ```bash
   brew install sox whisper-cpp
   mkdir -p ~/mestrewrite/models
   curl -L -o ~/mestrewrite/models/ggml-base.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```
   > O próprio app mostra o comando exato, por notificação, se algo faltar.
5. Na **primeira execução**, a tela de setup pede atalho, idioma e modelo. Conceda
   **Microfone** e **Acessibilidade** quando o macOS pedir.
6. **Use em qualquer app:** aperte o atalho (padrão `Cmd + Shift + Espaço`), fale e
   **pare de falar** — ao detectar a pausa, ele transcreve e **cola o texto** onde o
   cursor estiver. O app vive na **barra de menus** (ícone roxo); saia por ali.

> Por enquanto os componentes do passo 4 são instalados uma vez à mão. Empacotar
> tudo num instalador único é um próximo passo do [Roadmap](docs/Roadmap.md).

## 🧑‍💻 Rodar do código-fonte (desenvolvimento)

Pré-requisitos: [Homebrew](https://brew.sh), [Node.js](https://nodejs.org/) ≥ 18, e
as dependências de transcrição.

```bash
brew install sox whisper-cpp          # sox = áudio; whisper-cpp = transcrição (whisper-cli)
mkdir -p ~/mestrewrite/models         # modelo base (~147 MB)
curl -L -o ~/mestrewrite/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

npm install
npm start
```

Guia completo (permissões, troubleshooting, ajuste do silêncio) em
[docs/Setup.md](docs/Setup.md).

## 📦 Build (empacotar como app)

Gerar um app macOS (`.app`, `.dmg` e `.zip`) com
[electron-builder](https://www.electron.build/):

```bash
npm run dist     # → dist/MestreWrite-<versão>-arm64.dmg (e .zip)
npm run pack     # build rápido só do .app (sem empacotar), para testar
npm run icone    # regenera o ícone do app a partir do orb
```

> Builds **não assinados** (open source): na 1ª abertura use **clique direito →
> Abrir**. O app empacotado encontra o `sox`/`whisper-cli` do Homebrew
> automaticamente (resolve o `PATH` no startup); só precisa que estejam instalados
> (passo 4 acima).

## 📚 Documentação

A documentação completa é um **vault Obsidian** em [`docs/`](docs/) — comece por
[docs/00-Home.md](docs/00-Home.md). Decisões de arquitetura ficam em
[docs/Decisões/](docs/Decisões/) (ADRs).

## 🤝 Como contribuir

1. Leia a [Visão](docs/Visão.md) e o [Roadmap](docs/Roadmap.md).
2. Abra uma issue descrevendo a melhoria ou bug.
3. Faça um fork, crie uma branch (`feat/minha-feature`) e abra um Pull Request.

## 📄 Licença

[MIT](LICENSE) © 2026 Pedro Júlio Cabral Neto
