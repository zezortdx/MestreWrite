// setup.js — lógica da configuração inicial do MestreWrite.
//
// Coerência com o overlay (docs/Design.md): o mesmo orb WebGL (orb-core.js) é o
// herói da tela e REAGE à interação — energiza enquanto o usuário ensina o
// atalho (o gesto que invoca o MestreWrite) e pulsa ao concluir, junto do chime
// sintetizado. Captura de atalho produz um acelerador válido do Electron.

(() => {
  "use strict";

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ── Orb herói (mesmo shader do overlay) ─────────────────────────────────────
  const canvasOrb = document.querySelector(".orb");
  const orb = canvasOrb && window.MestreOrb ? window.MestreOrb.montar(canvasOrb) : null;
  if (!orb) document.body.classList.add("sem-webgl");

  const ORB_ALVOS = {
    idle: { rotSpeed: 0.28, timeScale: 0.7, hover: 0.0, hoverIntensity: 0.0 },
    capturando: { rotSpeed: 0.95, timeScale: 1.5, hover: 0.5, hoverIntensity: 0.55 },
    sucesso: { rotSpeed: 1.5, timeScale: 2.1, hover: 0.85, hoverIntensity: 0.75 },
  };
  let orbEstado = "idle";
  const orbPar = { ...ORB_ALVOS.idle };
  let ultimoTs = 0;

  function passoOrb(ts) {
    if (!ultimoTs) ultimoTs = ts;
    const dt = Math.min(0.05, (ts - ultimoTs) / 1000);
    ultimoTs = ts;

    if (orb) {
      const alvo = ORB_ALVOS[orbEstado] || ORB_ALVOS.idle;
      const k = 1 - Math.exp(-dt * 3.5);
      orbPar.rotSpeed += (alvo.rotSpeed - orbPar.rotSpeed) * k;
      orbPar.timeScale += (alvo.timeScale - orbPar.timeScale) * k;
      orbPar.hover += (alvo.hover - orbPar.hover) * k;
      orbPar.hoverIntensity += (alvo.hoverIntensity - orbPar.hoverIntensity) * k;
      orb.passo(dt, orbPar);
    }
    requestAnimationFrame(passoOrb);
  }
  if (orb) requestAnimationFrame(passoOrb);

  let timeoutSucesso = 0;
  function pulsarOrb() {
    orbEstado = "sucesso";
    clearTimeout(timeoutSucesso);
    timeoutSucesso = setTimeout(() => {
      if (orbEstado === "sucesso") orbEstado = "idle";
    }, 750);
  }

  // ── Chime de conclusão (Web Audio, igual ao overlay) ────────────────────────
  let audioCtx = null;
  function tocarChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const ctx = audioCtx;
      const t = ctx.currentTime;

      const filtro = ctx.createBiquadFilter();
      filtro.type = "lowpass";
      filtro.frequency.value = 2600;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(0.07, t + 0.04);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      filtro.connect(master);
      master.connect(ctx.destination);

      [523.25, 783.99, 1174.66].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f * 0.997, t);
        osc.frequency.exponentialRampToValueAtTime(f, t + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9 - i * 0.22, t + 0.05 + i * 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 + i * 0.08);
        osc.connect(g);
        g.connect(filtro);
        osc.start(t);
        osc.stop(t + 1.25);
      });
    } catch {
      /* áudio é só polimento — falha silenciosa. */
    }
  }

  // ── Captura de atalho ───────────────────────────────────────────────────────
  const captura = document.getElementById("captura");
  const kbdGrupo = document.getElementById("kbdGrupo");

  // Default coincide com config.js (CmdOrCtrl+Shift+Space → CommandOrControl…).
  let atalho = "CommandOrControl+Shift+Space";
  let capturando = false;

  const MODIFICADORES = new Set([
    "MetaLeft", "MetaRight", "ControlLeft", "ControlRight",
    "ShiftLeft", "ShiftRight", "AltLeft", "AltRight",
  ]);

  const GLIFO = {
    CommandOrControl: "⌘", Command: "⌘", Control: "⌃",
    Alt: "⌥", Shift: "⇧", Super: "⌘",
  };

  const ESPECIAIS = {
    Comma: ",", Period: ".", Slash: "/", Backslash: "\\",
    Minus: "-", Equal: "=", Semicolon: ";", Quote: "'",
    BracketLeft: "[", BracketRight: "]", Backquote: "`",
    Enter: "Return", Tab: "Tab", Backspace: "Backspace",
    Delete: "Delete", Escape: "Escape",
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
  };

  // Converte o code da tecla principal num token aceito pelo Electron.
  function teclaPrincipal(code) {
    if (code === "Space") return "Space";
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
    return ESPECIAIS[code] || null;
  }

  function rotuloTecla(token) {
    return GLIFO[token] || token;
  }

  function renderChips(accel) {
    kbdGrupo.textContent = "";
    accel.split("+").forEach((parte) => {
      const el = document.createElement("span");
      el.className = "kbd";
      el.textContent = rotuloTecla(parte);
      kbdGrupo.appendChild(el);
    });
  }

  function entrarCaptura() {
    if (capturando) return;
    capturando = true;
    captura.classList.add("capturando");
    captura.classList.remove("definida");
    orbEstado = "capturando";
  }

  function sairCaptura(definiu) {
    capturando = false;
    captura.classList.remove("capturando");
    if (definiu) captura.classList.add("definida");
    renderChips(atalho);
    orbEstado = "idle";
  }

  captura.addEventListener("focus", entrarCaptura);
  captura.addEventListener("click", () => {
    captura.focus();
    entrarCaptura();
  });
  captura.addEventListener("blur", () => {
    if (capturando) sairCaptura(false);
  });

  document.addEventListener("keydown", (e) => {
    if (!capturando) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === "Escape") {
      captura.blur();
      return;
    }
    if (MODIFICADORES.has(e.code)) return; // espera a tecla principal

    const tecla = teclaPrincipal(e.code);
    if (!tecla) return; // tecla não suportada como principal

    const mods = [];
    if (e.metaKey || e.ctrlKey) mods.push("CommandOrControl");
    if (e.altKey) mods.push("Alt");
    if (e.shiftKey) mods.push("Shift");
    if (mods.length === 0) return; // exige ao menos um modificador

    atalho = [...mods, tecla].join("+");
    renderChips(atalho);
    captura.blur(); // dispara sairCaptura(false); marcamos definida abaixo
    captura.classList.add("definida");
    pulsarOrb();
  });

  renderChips(atalho); // estado inicial

  // ── Seleção de opções (idioma / modelo) ─────────────────────────────────────
  function preencherMedidor(medidor) {
    const vel = parseInt(medidor.dataset.vel, 10) || 0;
    const prec = parseInt(medidor.dataset.prec, 10) || 0;
    const linhas = [
      [medidor.querySelector(".pontos-vel"), vel],
      [medidor.querySelector(".pontos-prec"), prec],
    ];
    for (const [alvo, n] of linhas) {
      if (!alvo) continue;
      alvo.textContent = "";
      for (let i = 0; i < 4; i++) {
        const ponto = document.createElement("i");
        if (i < n) ponto.className = "cheio";
        alvo.appendChild(ponto);
      }
    }
  }
  document.querySelectorAll(".medidor").forEach(preencherMedidor);

  function grupoRadio(containerId, aoMudar) {
    const container = document.getElementById(containerId);
    const inputs = container.querySelectorAll("input");
    inputs.forEach((inp) => {
      inp.addEventListener("change", () => {
        container.querySelectorAll(".opcao").forEach((o) => o.classList.remove("selecionada"));
        inp.closest(".opcao").classList.add("selecionada");
        if (aoMudar) aoMudar(inp);
      });
    });
  }

  grupoRadio("opcoesIdioma");

  const notaDownload = document.getElementById("notaDownload");
  const comandoDownload = document.getElementById("comandoDownload");
  function comandoCurl(modelo) {
    const dest = `~/mestrewrite/models/ggml-${modelo}.bin`;
    const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelo}.bin`;
    return `curl -L -o ${dest} \\\n  ${url}`;
  }
  grupoRadio("opcoesModelo", (inp) => {
    const instalado = inp.dataset.instalado === "true";
    if (instalado) {
      notaDownload.hidden = true;
    } else {
      comandoDownload.textContent = comandoCurl(inp.value);
      notaDownload.hidden = false;
    }
  });

  // ── Navegação entre passos ──────────────────────────────────────────────────
  let passoAtual = 1;
  const passosEls = document.querySelectorAll(".passo");

  function painelDe(n) {
    return document.getElementById("painel-" + n);
  }

  function atualizarPassos() {
    passosEls.forEach((el) => {
      const num = Number(el.dataset.ir);
      el.classList.toggle("ativo", num === passoAtual);
      el.classList.toggle("feito", num < passoAtual);
      if (num === passoAtual) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });
  }

  function irPara(n) {
    if (n === passoAtual || n < 1 || n > 3) return;
    painelDe(passoAtual).classList.remove("ativo");
    painelDe(n).classList.add("ativo");
    passoAtual = n;
    atualizarPassos();
  }

  // Etapas do rail são clicáveis (navegação real, não decoração).
  passosEls.forEach((el) => {
    el.addEventListener("click", () => irPara(Number(el.dataset.ir)));
  });

  document.getElementById("btnProximo1").addEventListener("click", () => irPara(2));
  document.getElementById("btnVoltar2").addEventListener("click", () => irPara(1));
  document.getElementById("btnProximo2").addEventListener("click", () => irPara(3));
  document.getElementById("btnVoltar3").addEventListener("click", () => irPara(2));

  atualizarPassos();

  // ── Conclusão ───────────────────────────────────────────────────────────────
  const btnConcluir = document.getElementById("btnConcluir");
  let concluindo = false;
  btnConcluir.addEventListener("click", () => {
    if (concluindo) return;
    concluindo = true;
    btnConcluir.disabled = true;

    const idioma = document.querySelector('input[name="idioma"]:checked');
    const modelo = document.querySelector('input[name="modelo"]:checked');
    const config = {
      atalho,
      idioma: idioma ? idioma.value : "pt",
      modelo: modelo ? modelo.value : "base",
    };

    pulsarOrb();
    tocarChime();

    // Pequena pausa p/ o chime e o pulso do orb serem percebidos antes do
    // main fechar a janela e relançar o app.
    setTimeout(() => {
      if (window.mestreSetup && typeof window.mestreSetup.concluir === "function") {
        window.mestreSetup.concluir(config);
      }
    }, 480);
  });
})();
