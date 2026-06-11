# ADR-011 — Ícones do app (fundo branco) e da bandeja (orb), gerados do orb

## Status
✅ Aceito (2026-06)

## Contexto
O ícone do app era um **squircle violeta escuro** com o orb; o ícone da bandeja
(tray, barra de menus) era um PNG simples de círculos concêntricos ([[ADR-006-backend-core]]).
O usuário pediu: ícone do app com **fundo branco + orb**, e o ícone da barra de
menus virando **o próprio orb**.

## Decisão
Ambos continuam **gerados a partir do mesmo shader do orb** (`src/overlay/orb-core.js`),
para manter uma única fonte de verdade visual ([[ADR-008-empacotamento-electron-builder]]):

- **Ícone do app** (`scripts/icone.html`): squircle **branco** (gradiente sutil) com
  o orb iridescente centralizado e um glow violeta suave — coerente com a pílula
  branca do overlay ([[Design]]). Vira `build-assets/icon.png` → `icon.icns` (macOS)
  e a base do `.ico` (Windows).
- **Ícone da bandeja** (`scripts/tray.html`): o orb sobre fundo transparente. Como o
  shader sozinho vira um **anel** (fraco em tamanho pequeno), há uma **base
  preenchida** (gradiente radial violeta) por baixo + o anel iridescente por cima —
  fica um orb sólido e legível na barra. Vira `build-assets/tray-master.png` →
  `src/assets/tray-icon.png` (22px) + `tray-icon@2x.png` (44px) via `sips`.

`scripts/gerar-icone.js` renderiza os dois numa **única janela** (redimensionada
entre as capturas, evitando corrida de criar/destruir janela) e `scripts/gerar-icns.sh`
faz as conversões. Tudo por `npm run icone`.

## Consequências
**Positivas**
- App com identidade clara (orb sobre branco, estilo Apple Intelligence) e bandeja
  com o próprio orb — coerência total com o overlay.
- Regeneráveis com um comando.

**Negativas / trade-offs**
- O orb do shader é um **anel**; para a bandeja foi preciso uma base preenchida por
  baixo (em `scripts/tray.html`) p/ ler bem em ~18px. Verificado na barra de menus.

## Arquivos
### Modificados
- `scripts/icone.html` — fundo branco.
- `scripts/tray.html` — **criado** (orb sozinho p/ a bandeja).
- `scripts/gerar-icone.js` — renderiza app + tray (janela reutilizada).
- `scripts/gerar-icns.sh` — gera também os PNGs do tray.
- `build-assets/icon.png` · `icon.icns` · `src/assets/tray-icon.png` · `@2x` — regerados.

## Relacionado
- [[Design]] · [[ADR-008-empacotamento-electron-builder]] · [[ADR-006-backend-core]]
