# ADR-005 — Overlay v2: pílula + orb WebGL + glow nas bordas + som de ativação

## Status
✅ Aceito (2026-06) · 🔄 estética revisável · **emenda a [[ADR-004-overlay-visual]]**
(a janela e o modelo de estados via IPC da ADR-004 continuam valendo; o que muda
é o desenho do orb, da borda e o indicador).

## Contexto
A estética do overlay ([[Design]]) foi muito iterada. A v1 ([[ADR-004-overlay-visual]])
tinha um **orb grande em Canvas 2D** no centro-inferior e uma **borda cônica com
cantos retos**. No uso, três problemas apareceram:

1. O orb Canvas 2D era estático demais / "genérico"; queríamos o orb iridescente
   animado de verdade (o componente comunitário *voice-powered-orb*, em WebGL).
2. A borda com `border-radius` fixo **não encaixava no canto do display** — qualquer
   raio diferente do físico deixava um vão.
3. Faltava um indicador compacto de voz e um "momento" de ativação (estilo
   Apple Intelligence) com feedback sonoro.

> ⚠️ Restrições herdadas que moldaram as decisões: projeto **Electron vanilla**
> (sem React/Tailwind/bundler), **CSP estrita** (`default-src 'none'; script-src
> 'self'`), renderer com `sandbox:true`/`contextIsolation:true`. Por isso **não**
> adotamos o componente React/OGL como veio — portamos só o que importa.

## Decisão

### Orb → shader WebGL puro, reutilizável (`src/overlay/orb-core.js`)
O **shader GLSL** do *voice-powered-orb* foi portado para **WebGL cru** (triângulo
full-screen + compilar o shader na mão), **sem a dependência `ogl`** e sem React.
Motivo: `ogl` é ESM com *bare imports* → sem bundler exigiria vendorização + import
map e brigaria com `script-src 'self'`. O boilerplate do OGL viram ~30 linhas de
WebGL. O módulo expõe `window.MestreOrb.montar(canvas) → { redimensionar, passo(dt, params) }`
e **não tem rAF próprio** (quem monta dirige), permitindo um único loop.
Composição correta sobre a janela transparente: `premultipliedAlpha:true` +
`blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` (o shader emite cor pré-multiplicada).

> O orb grande original (`src/overlay/orb.js`, port WebGL anterior) ficou **no
> disco mas desativado** (comentado no HTML) — reversível em 1 linha.

### Indicador → pílula branca com orb + waveform (`src/overlay/pilula.js`)
Substitui o orb grande por uma **cápsula branca frosted** (estilo *dynamic island*):
um **mini-orb WebGL** (28px, via `orb-core.js`) à esquerda + **waveform** de 16
barras. Enquanto não há áudio real, as barras são **procedurais** (senoides
sobrepostas com janela suave → contorno de "voz"); quando o áudio chegar do
processo principal por IPC, basta alimentar a amplitude. **Um único
`requestAnimationFrame`** dirige orb + barras. É o `pilula.js` que agora alterna
as classes `estado-*` no `<body>` (a borda continua reagindo a elas).

### Borda → glow nas beiras, sem raio fixo (`src/overlay/overlay.css`)
Trocamos o **anel** (que tinha um `border-radius` a casar com o display) por um
**glow que desbota para dentro a partir de cada beira**: o `conic-gradient` cobre
a tela e uma **máscara = união de 4 gradientes lineares** (um por borda) revela só
a faixa, somada ao `blur`. Como a faixa cobre toda a área do canto, o
**arredondamento FÍSICO do display do macOS recorta** o excedente → **encaixa em
qualquer Mac sem precisar do raio**, e fica reto em monitor externo. Largura do
glow = `--glow-w` (proporcional à tela, fina/justa). Paleta Apple-IA vibrante
(azul→violeta→magenta→rosa), com **drift lento + oscilação de matiz (`hue-rotate`)
+ respiração**.

### Ativação → bloom cinemático + som (Web Audio)
Ao entrar em listening/processing vindo de idle (o atalho), dispara:
- um **bloom** de luz nas bordas (`.bloom`, `box-shadow` inset animado uma vez —
  elemento próprio p/ não conflitar com as animações da borda);
- um **chime suave** **sintetizado em Web Audio** (acorde C5–G5–D6, *glide* leve,
  *lowpass* macio). **Sem arquivo de áudio** → não toca na CSP. Para tocar a partir
  de um atalho global (sem gesto no DOM), `src/main/main.js` define
  `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')`.

### Microfone
O overlay **não** captura microfone (o componente original abria o seu). O orb e a
waveform são dirigidos pelo **state machine**; o nível de áudio real virá do
processo principal por IPC, casando com a [[Arquitetura]] (áudio é do main).

## Mapeamento de estados (resumo)
| Estado | Orb (rot/energia) | Waveform | Borda | Pílula |
|--------|-------------------|----------|-------|--------|
| idle | parado (escondido) | recolhida | invisível | escondida (loop pausa) |
| listening | gira calmo | ondula suave | drift 9s, calma | visível, halo respira |
| processing | gira rápido/intenso | alta e ágil | drift 5s, intensa | escala 1.04, halo rápido |

## Arquivos
- **Novos:** `src/overlay/orb-core.js`, `src/overlay/pilula.js`.
- **Alterados:** `src/overlay/overlay.html` (pílula + scripts; orb antigo comentado),
  `src/overlay/overlay.css` (glow da borda, pílula, orb-mini, bloom),
  `src/main/main.js` (flag de autoplay).
- **Legado/desativado:** `src/overlay/orb.js` (orb grande, port WebGL anterior).

## Consequências
**Positivas**
- Orb realmente iridescente e animado; visual premium (glow Apple-IA, bloom, som).
- **Zero dependências novas**; CSP/sandbox intactos.
- Borda **encaixa em qualquer tela** sem saber o raio do display.
- Shader em módulo reutilizável (`orb-core.js`); um único rAF.

**Negativas / trade-offs**
- Mais um contexto WebGL (pequeno, 28px) — custo desprezível.
- O encaixe do canto **depende do macOS recortar a janela** no canto físico
  (verdadeiro para displays internos; externo fica reto, o esperado).
- O orb grande (`orb.js`) fica dormente como código morto até decidirmos removê-lo.

## Crédito
O shader GLSL do orb vem do componente comunitário **voice-powered-orb** (React +
OGL); aqui foi portado para WebGL puro e adaptado ao state machine.

## Teste (temporário)
Atalhos globais simulam os estados (em `src/main/main.js`, a remover ao integrar
áudio): `Cmd+Shift+1` listening · `Cmd+Shift+2` processing · `Cmd+Shift+0` idle ·
`Cmd+Shift+Q` sair.

## Relacionado
- [[ADR-004-overlay-visual]] · [[Design]] · [[Arquitetura]] · [[Stack-Técnico]] · [[MVP]]
