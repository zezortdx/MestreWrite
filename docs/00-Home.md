# MestreWrite — Mapa do Vault

Bem-vindo ao vault de documentação do **MestreWrite**, o assistente de escrita por
voz local, offline e open source para desktop.

> Use este documento como ponto de partida. Todas as notas estão interligadas
> com [[wikilinks]] do Obsidian.

## Fundamentos

- [[Visão]] — visão, missão, filosofia e os 5 princípios.
- [[Problema]] — limitações das ferramentas atuais de ditado e transcrição.
- [[Público-Alvo]] — para quem o MestreWrite é feito.
- [[Privacidade]] — por que tudo roda localmente.

## Produto

- [[Funcionalidades]] — escrita por voz, correção, modos, comandos, dicionário, histórico, extensões.
- [[MVP]] — escopo exato do primeiro protótipo (macOS, transcrição crua).
- [[Design]] — pílula de voz, orb iridescente (WebGL), glow nas bordas, estados.
- [[Roadmap]] — fases do projeto, do MVP à plataforma.

## Engenharia

- [[Arquitetura]] — componentes do sistema e como se conectam.
- [[Stack-Técnico]] — tecnologias escolhidas, decisões e trade-offs.
- [[Setup]] — instalar deps, baixar o modelo, permissões e rodar (macOS).
- [[Status]] — snapshot do estado atual (publicação, o que funciona, pendências).
- [[Checklist-de-commit]] — verificação anti-vazamento antes de cada commit.

## Decisões de Arquitetura (ADRs)

- [[ADR-001-electron]] — por que Electron.
- [[ADR-002-whisper-local]] — por que whisper.cpp local.
- [[ADR-003-inserção-via-clipboard]] — como o texto é inserido nos apps.
- [[ADR-004-overlay-visual]] — como o overlay (orb + borda) foi construído (v1).
- [[ADR-005-overlay-pilula-webgl]] — overlay v2: pílula + orb WebGL + glow + som.
- [[ADR-006-backend-core]] — state machine + módulos de áudio/transcrição/inserção.
- [[ADR-007-setup-primeira-execucao]] — tela de setup (atalho/idioma/modelo), tema claro.
- [[ADR-008-empacotamento-electron-builder]] — build `.dmg`/`.zip` + ícone do orb.
- [[ADR-009-vad-silencio-e-otimizacao]] — parada por silêncio (VAD) + otimizações.
- [[ADR-010-suporte-windows-cross-platform]] — código cross-platform + build Windows via CI.
- [[ADR-011-icones-app-e-tray]] — ícone do app (branco) e da bandeja (orb).
- [[ADR-012-desempenho-stt-servidor-vad]] — STT rápido: servidor persistente + VAD/flags.
- [[ADR-013-inteligencia-pipeline-audio]] — inteligência: compand/VAD tolerante + Q5 + prompt/entropia.

---

### Categorias rápidas

| Categoria | Notas |
|-----------|-------|
| Por quê | [[Visão]] · [[Problema]] · [[Privacidade]] |
| O quê | [[Funcionalidades]] · [[MVP]] · [[Roadmap]] |
| Como | [[Arquitetura]] · [[Stack-Técnico]] · [[Design]] · [[Setup]] |
| Para quem | [[Público-Alvo]] |
| Decisões | [[ADR-001-electron]] · [[ADR-002-whisper-local]] · [[ADR-003-inserção-via-clipboard]] · [[ADR-004-overlay-visual]] · [[ADR-005-overlay-pilula-webgl]] · [[ADR-006-backend-core]] |
