# Status atual do projeto

Snapshot operacional do MestreWrite para retomar o trabalho rapidamente. Para a
direção, ver [[Roadmap]]; para o "porquê" de cada decisão, ver os ADRs em
[[00-Home]]; para o histórico cronológico, ver `Logs/` (Sessão-001 a 006).

Atualizado em: 2026-06-11.

## Publicação
- Repositório PÚBLICO: **github.com/zezortdx/MestreWrite**.
- Release **v0.1.0** publicada com instaladores gerados pelo CI:
  `.dmg` + `.zip` (macOS) e `.exe`/NSIS (Windows).
- Branch `main`; tags `vX.Y.Z` disparam o build e a Release (GitHub Actions).

## Plataformas
- **macOS (Apple Silicon):** testado/funcional.
- **Windows:** EXPERIMENTAL — código cross-platform pronto e build via CI, mas o
  runtime (colar via SendKeys, áudio via WaveAudio) ainda NÃO foi validado em Windows.

## O que funciona hoje (fluxo)
Atalho global (padrão Cmd/Ctrl+Shift+Espaço) -> overlay escuta (pílula + orb + glow +
chime) -> para sozinho no silêncio (VAD do sox) -> transcrição local -> cola o texto no
app em foco. Tray (barra de menus) com o orb; saída pelo tray. Setup de primeira
execução (tema claro) para atalho/idioma/modelo.

## STT (estado técnico)
- Motor: whisper.cpp local, modelo `ggml-base.bin`.
- Servidor persistente (`whisper-server`, modelo na memória, POST /inference) com
  fallback automático para `whisper-cli`. Ver [[ADR-012-desempenho-stt-servidor-vad]].
- VAD: `silencioDuracao` 0,8s. Flags: greedy (`-bs 1`), no-context (`-mc 0`),
  `-fa` desligado. Config em `~/.mestrewrite/config.json` (só guarda escolhas do usuário).

## Limitações / pendências (próximos passos)
- ACURÁCIA: o `base` é fraco em PT — maior ganho de qualidade é trocar para `small` ou
  `large-v3-turbo` (viável agora por causa do servidor persistente). Ver [[Roadmap]].
- Validar runtime no Windows (SendKeys/áudio).
- Dependências (`sox`, `whisper-cpp`, modelo) instaladas à mão; instalador único pendente.
- Builds não assinados (Gatekeeper/SmartScreen na 1a abertura).
- Pendentes: build x64/universal, assinatura/notarização, lint/testes no CI.

## Como retomar
- Rodar (dev): `npm start`. Empacotar: `npm run dist:mac` / `npm run dist:win`.
  Ícones: `npm run icone`. Release: criar tag `vX.Y.Z` e dar push.
- ANTES DE QUALQUER COMMIT: rodar a verificação anti-vazamento do
  [[Checklist-de-commit]] (repo público).
- Documentação fica em `docs/` (working dir) e é espelhada para este vault; logs de
  sessão ficam só no vault, em `Logs/`. Sem emojis nos docs.

## Relacionado
- [[00-Home]] · [[Roadmap]] · [[Arquitetura]] · [[Setup]] · [[Checklist-de-commit]]
