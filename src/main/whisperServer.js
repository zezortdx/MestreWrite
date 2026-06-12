// whisperServer.js — servidor whisper.cpp persistente (whisper-server).
//
// PROBLEMA: chamar `whisper-cli` por ditado recarrega o modelo (~150 MB) e
// reinicializa o backend Metal a cada vez (~100-120 ms de custo fixo) — medido
// como ~metade do tempo de processo. SOLUÇÃO: subir um `whisper-server` 1x no
// launch, com o modelo na memória; cada ditado vira um POST HTTP local
// (~2x mais rápido nos testes). Se o servidor não subir, o transcribe.js cai
// automaticamente no `whisper-cli` (fallback). Cross-platform (macOS + Windows).

const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const { resolverBinario, pathAumentado } = require('./binpath');
const {
  PATH_MODELO, IDIOMA, THREADS, FLASH_ATTN, NO_FALLBACK, SUPRIMIR_NST,
  NO_CONTEXTO, BEAM_SIZE, PROMPT, ENTROPIA_LIMIAR,
} = require('./config');

const HOST = '127.0.0.1';
let porta = 0;
let proc = null;
let pronto = false;

function portaLivre() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(0));
    srv.listen(0, HOST, () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

async function aguardarPronto(timeoutMs) {
  const fim = Date.now() + timeoutMs;
  while (Date.now() < fim) {
    if (!proc) return false;
    try {
      const r = await fetch(`http://${HOST}:${porta}/`, { signal: AbortSignal.timeout(800) });
      if (r) return true; // servidor respondeu (UI/raiz) → modelo carregado
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// Sobe o servidor (best-effort). Resolve com true se ficou pronto.
async function iniciarServidor() {
  if (proc) return pronto;
  porta = await portaLivre();
  if (!porta) return false;

  const bin = resolverBinario('whisper-server');
  const args = [
    '-m', PATH_MODELO,
    '-l', IDIOMA,
    '--host', HOST,
    '--port', String(porta),
    '-t', String(THREADS),
    '-nt',
    '-bs', String(BEAM_SIZE || 1),
  ];
  if (PROMPT) args.push('--prompt', PROMPT);
  if (ENTROPIA_LIMIAR) args.push('--entropy-thold', String(ENTROPIA_LIMIAR));
  if (FLASH_ATTN) args.push('-fa');
  if (NO_FALLBACK) args.push('--no-fallback');
  if (SUPRIMIR_NST) args.push('--suppress-nst');
  if (NO_CONTEXTO) args.push('-mc', '0'); // max-context 0 = não condiciona no texto anterior

  try {
    proc = spawn(bin, args, {
      env: { ...process.env, PATH: pathAumentado() },
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch {
    proc = null;
    return false;
  }

  proc.on('error', () => { proc = null; pronto = false; });
  proc.on('exit', () => { proc = null; pronto = false; });

  pronto = await aguardarPronto(15000);
  if (!pronto) pararServidor();
  return pronto;
}

function servidorPronto() {
  return pronto && !!proc;
}

// Transcreve um .wav via POST /inference. Lança erro se falhar (→ fallback CLI).
async function transcreverViaServidor(caminhoWav) {
  const buf = await fs.promises.readFile(caminhoWav);
  const fd = new FormData();
  fd.append('file', new Blob([buf]), 'audio.wav');
  fd.append('response_format', 'text');
  fd.append('temperature', '0.0');
  fd.append('temperature_inc', '0.0'); // sem retries com temperaturas mais altas → mais rápido
  fd.append('language', IDIOMA);
  if (PROMPT) fd.append('prompt', PROMPT);

  const res = await fetch(`http://${HOST}:${porta}/inference`, {
    method: 'POST',
    body: fd,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`whisper-server respondeu ${res.status}`);
  return await res.text();
}

function pararServidor() {
  if (proc) {
    try { proc.kill(); } catch { /* já morto */ }
  }
  proc = null;
  pronto = false;
}

module.exports = {
  iniciarServidor,
  pararServidor,
  servidorPronto,
  transcreverViaServidor,
};
