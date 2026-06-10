// pilula.js — indicador "pílula" de voz do MestreWrite (estilo dynamic island).
//
// Cápsula BRANCA com um ORB de status brilhante + barras de áudio (waveform)
// que reagem ao STATE MACHINE (idle · listening · processing) vindo via IPC em
// `window.mestreOverlay.aoMudarEstado`. Como ainda não há áudio real, as barras
// são animadas proceduralmente (ondas senoidais sobrepostas, p/ parecer voz);
// quando o processo principal mandar o nível de áudio por IPC, é só alimentar
// `par.amp` com ele.
//
// ATIVAÇÃO CINEMÁTICA: ao entrar em listening/processing vindo de idle (ou seja,
// quando o usuário aciona o atalho), dispara um BLOOM de luz nas bordas
// (body.ativando → .bloom no CSS) + um SOM suave sintetizado em Web Audio
// (sem arquivo, sem mexer na CSP — estética Apple Intelligence).
//
// É este script (não orb.js) que alterna as classes estado-* no <body>.

(() => {
  const pilula = document.querySelector('.pilula');
  const trilha = document.querySelector('.ondas');
  const raiz = document.documentElement.style;
  if (!pilula || !trilha) return;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ── Barras do waveform ──────────────────────────────────────────────────────
  const NUM = 16;
  const barras = [];
  for (let i = 0; i < NUM; i++) {
    const el = document.createElement('span');
    el.className = 'onda';
    trilha.appendChild(el);
    barras.push({
      el,
      fase: Math.random() * Math.PI * 2,
      vel: 0.9 + Math.random() * 0.8, // variação por barra (ritmo "vivo")
      atual: 0.16,
    });
  }

  // ── Mini-orb WebGL iridescente (à esquerda das barras) ──────────────────────
  const canvasOrb = pilula.querySelector('.orb-mini');
  const orb = canvasOrb && window.MestreOrb ? window.MestreOrb.montar(canvasOrb) : null;

  // Parâmetros do orb por estado (rotação, energia interna e distorção hover).
  const ORB_ALVOS = {
    idle: { rotSpeed: 0.3, timeScale: 0.7, hover: 0.0, hoverIntensity: 0.0 },
    listening: { rotSpeed: 0.95, timeScale: 1.5, hover: 0.5, hoverIntensity: 0.5 },
    processing: { rotSpeed: 1.7, timeScale: 2.5, hover: 0.95, hoverIntensity: 0.8 },
  };
  const orbPar = { ...ORB_ALVOS.idle };

  // ── Som de ativação (Web Audio, sintetizado) ────────────────────────────────
  let audioCtx = null;
  function contexto() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Chime suave e arejado (acorde aberto C5–G5–D6, glide leve, lowpass macio).
  function tocarSomAtivacao() {
    const ctx = contexto();
    if (!ctx) return;
    const t = ctx.currentTime;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2600;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.07, t + 0.04); // ataque suave
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); // release longo

    filtro.connect(master);
    master.connect(ctx.destination);

    const freqs = [523.25, 783.99, 1174.66]; // C5, G5, D6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.997, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.18); // glide p/ cima

      const g = ctx.createGain();
      const vol = 0.9 - i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.05 + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 + i * 0.08);

      osc.connect(g);
      g.connect(filtro);
      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  // Dispara o conjunto cinemático (bloom + som). Reinicia a animação do bloom.
  let tBloom = 0;
  function dispararAtivacao() {
    document.body.classList.remove('ativando');
    void document.body.offsetWidth; // força reflow p/ reiniciar a animação
    document.body.classList.add('ativando');
    clearTimeout(tBloom);
    tBloom = setTimeout(() => document.body.classList.remove('ativando'), 1300);
    tocarSomAtivacao();
  }

  // ── Dimensão/posição adaptativa ─────────────────────────────────────────────
  function ajustarTamanho() {
    const vh = window.innerHeight;
    const menor = Math.min(window.innerWidth, vh);
    pilula.style.bottom = Math.round(clamp(vh * 0.08, 64, 140)) + 'px';
    // Largura do glow da borda, proporcional à tela — fina/justa na beira.
    raiz.setProperty('--glow-w', Math.round(clamp(menor * 0.035, 24, 56)) + 'px');
    if (orb) orb.redimensionar();
  }

  // ── Estado + parâmetros suavizados ──────────────────────────────────────────
  let estado = 'idle';
  let estadoAnterior = null;
  let rodando = false;
  let rafId = 0;
  let ultimoTs = 0;
  let timeoutParar = 0;
  let tempo = 0;

  const ALVOS = {
    idle: { amp: 0.0, base: 0.16, vel: 0.6 },
    listening: { amp: 0.5, base: 0.28, vel: 5.0 },
    processing: { amp: 0.85, base: 0.42, vel: 9.0 },
  };
  const par = { ...ALVOS.idle };

  function frame(ts) {
    if (!rodando) return;
    if (!ultimoTs) ultimoTs = ts;
    const dt = Math.min(0.05, (ts - ultimoTs) / 1000);
    ultimoTs = ts;

    const a = ALVOS[estado] || ALVOS.idle;
    const k = 1 - Math.exp(-dt * 4.0); // suaviza transições de estado
    par.amp += (a.amp - par.amp) * k;
    par.base += (a.base - par.base) * k;
    par.vel += (a.vel - par.vel) * k;

    tempo += dt * par.vel;

    for (let i = 0; i < NUM; i++) {
      const b = barras[i];
      // Duas senoides em frequências diferentes → contorno irregular (voz).
      // Barras centrais um pouco mais altas (janela suave).
      const s1 = 0.5 + 0.5 * Math.sin(tempo * b.vel + b.fase);
      const s2 = 0.5 + 0.5 * Math.sin(tempo * b.vel * 0.5 + b.fase * 1.7);
      const janela = 0.6 + 0.4 * Math.sin((i / (NUM - 1)) * Math.PI);
      const alvo = clamp(par.base + par.amp * (s1 * 0.7 + s2 * 0.3) * janela, 0.12, 1);
      b.atual += (alvo - b.atual) * Math.min(1, dt * 16);
      b.el.style.transform = 'scaleY(' + b.atual.toFixed(3) + ')';
    }

    // Mini-orb: suaviza os parâmetros por estado e renderiza um passo.
    if (orb) {
      const ao = ORB_ALVOS[estado] || ORB_ALVOS.idle;
      orbPar.rotSpeed += (ao.rotSpeed - orbPar.rotSpeed) * k;
      orbPar.timeScale += (ao.timeScale - orbPar.timeScale) * k;
      orbPar.hover += (ao.hover - orbPar.hover) * k;
      orbPar.hoverIntensity += (ao.hoverIntensity - orbPar.hoverIntensity) * k;
      orb.passo(dt, orbPar);
    }

    rafId = requestAnimationFrame(frame);
  }

  function iniciarLoop() {
    if (rodando) return;
    rodando = true;
    ultimoTs = 0;
    rafId = requestAnimationFrame(frame);
  }

  function pararLoop() {
    rodando = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    for (const b of barras) {
      b.atual = 0.16;
      b.el.style.transform = 'scaleY(0.16)';
    }
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  function aplicarEstado(novo) {
    if (novo !== 'idle' && novo !== 'listening' && novo !== 'processing') return;

    // Ativação = sair de idle (ou início) para um estado ativo via atalho.
    const ativo = novo === 'listening' || novo === 'processing';
    const vinhaDeIdle = estadoAnterior === 'idle' || estadoAnterior === null;
    if (ativo && vinhaDeIdle) dispararAtivacao();

    estado = novo;
    estadoAnterior = novo;

    document.body.classList.remove('estado-idle', 'estado-listening', 'estado-processing');
    document.body.classList.add('estado-' + novo);

    if (novo === 'idle') {
      clearTimeout(timeoutParar);
      timeoutParar = setTimeout(pararLoop, 360); // espera a fade-out (CSS)
    } else {
      clearTimeout(timeoutParar);
      iniciarLoop();
    }
  }

  // Debounce no resize — evita recalcular dimensões dezenas de vezes por segundo.
  let timeoutRedimensionar = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(timeoutRedimensionar);
    timeoutRedimensionar = requestAnimationFrame(ajustarTamanho);
  });

  ajustarTamanho();
  if (window.mestreOverlay && typeof window.mestreOverlay.aoMudarEstado === 'function') {
    window.mestreOverlay.aoMudarEstado(aplicarEstado);
  }
  aplicarEstado('idle');
})();
