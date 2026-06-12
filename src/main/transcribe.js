// transcribe.js — transcrição de áudio via whisper.cpp, 100% local e offline.
// O áudio é deletado após a transcrição (privacidade — ver docs/Privacidade.md).
//
// Caminho rápido: whisper-server persistente (modelo já na memória — ver
// whisperServer.js e ADR-012). Se o servidor não estiver pronto OU falhar numa
// chamada, cai automaticamente no `whisper-cli` (mesmo resultado, só mais lento).

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  WHISPER_BIN, PATH_MODELO, IDIOMA, THREADS, FLASH_ATTN, NO_FALLBACK,
  SUPRIMIR_NST, NO_CONTEXTO, BEAM_SIZE, PROMPT, ENTROPIA_LIMIAR,
} = require('./config');
const { servidorPronto, transcreverViaServidor } = require('./whisperServer');

function modeloExiste() {
  try {
    return fs.existsSync(PATH_MODELO);
  } catch {
    return false;
  }
}

function caminhoModelo() {
  return PATH_MODELO;
}

// Orquestra: tenta o servidor persistente; senão (ou se falhar) usa o CLI.
async function transcrever(caminhoWav) {
  if (!caminhoWav) throw new Error('Caminho do arquivo de áudio não informado.');

  if (servidorPronto()) {
    try {
      const bruto = await transcreverViaServidor(caminhoWav);
      const texto = (bruto || '').trim();
      limpar(caminhoWav); // consome o áudio (privacidade)
      if (!texto) throw new Error('Transcrição vazia (nada foi reconhecido).');
      return limparTexto(texto);
    } catch (err) {
      // wav já consumido → resultado definitivo (não há fallback útil)
      if (!fs.existsSync(caminhoWav)) throw err;
      // erro de comunicação antes de consumir o wav → tenta o CLI
      console.warn('[transcribe] servidor falhou, usando whisper-cli:', err.message);
    }
  }

  return transcreverViaCli(caminhoWav);
}

// Implementação por processo (carrega o modelo a cada chamada — fallback).
function transcreverViaCli(caminhoWav) {
  return new Promise((resolve, reject) => {
    const base = path.join(os.tmpdir(), `mestrewrite_out_${Date.now()}`);
    const args = [
      '-m', PATH_MODELO,
      '-f', caminhoWav,
      '-l', IDIOMA,
      '-t', String(THREADS),
      '-bs', String(BEAM_SIZE || 1),
      '-nt',
      '--output-txt',
      '-of', base,
    ];
    if (FLASH_ATTN) args.push('-fa');
    if (NO_FALLBACK) args.push('--no-fallback');
    if (SUPRIMIR_NST) args.push('--suppress-nst');
    if (NO_CONTEXTO) args.push('-mc', '0'); // max-context 0 = não condiciona no texto anterior
    if (PROMPT) args.push('--prompt', PROMPT);
    if (ENTROPIA_LIMIAR) args.push('--entropy-thold', String(ENTROPIA_LIMIAR));

    const proc = spawn(WHISPER_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });

    let stderr = '';
    proc.stdout.on('data', () => {});
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('error', (err) => {
      limpar(caminhoWav, base + '.txt');
      reject(err);
    });

    proc.on('close', (codigo) => {
      const txtPath = base + '.txt';
      if (codigo !== 0) {
        limpar(caminhoWav, txtPath);
        reject(new Error(`whisper-cli encerrou com código ${codigo}.\n${stderr}`));
        return;
      }
      fs.readFile(txtPath, 'utf8', (err, data) => {
        limpar(caminhoWav, txtPath);
        if (err) {
          reject(new Error(`Erro ao ler saída do whisper: ${err.message}`));
          return;
        }
        const texto = (data || '').trim();
        if (!texto) {
          reject(new Error('Transcrição vazia (nada foi reconhecido).'));
          return;
        }
        resolve(limparTexto(texto));
      });
    });
  });
}

function limparTexto(texto) {
  let t = texto;

  // ── 1. Remove timestamps residuais ─────────────────────────────────────────
  // Formato: [00:00:00.000 --> 00:00:01.500]
  t = t.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/gm, '');

  // ── 2. Remove artefatos entre colchetes (alucinações comuns do Whisper) ────
  // Ex: [Música], [Aplausos], [Risos], [Silêncio], [INÉDITO], [BLANK_AUDIO]
  t = t.replace(/\[.*?\]/g, '');

  // ── 3. Remove artefatos entre parênteses ───────────────────────────────────
  // Ex: (inaudível), (silêncio), (música), (riso)
  t = t.replace(/\(\s*(?:inaud[ií]vel|sil[eê]ncio|m[uú]sica|risos?|aplausos?|tosse|suspiro|pausa)\s*\)/gi, '');

  // ── 4. Remove créditos de legendagem alucinógenas ──────────────────────────
  // O Whisper às vezes "inventa" créditos tipo "Legendas pela comunidade Amara.org"
  t = t.replace(/(?:legendas?|subt[ií]tulos?|transcri[cç][aã]o|cr[eé]ditos?)\s+(?:por|by|de|da|do)\b.*$/gim, '');

  // ── 5. Remove frases de auto-referência do Whisper ─────────────────────────
  // Ex: "Obrigado por assistir", "Inscreva-se", "Like and subscribe"
  t = t.replace(/(?:obrigad[oa]\s+por\s+assistir|inscreva[- ]se|like\s+and\s+subscribe|thank\s+you\s+for\s+watching).*$/gim, '');

  // ── 6. Remove repetições de frases inteiras (loops) ────────────────────────
  // Detecta quando uma frase ou trecho se repete consecutivamente
  t = t.replace(/(.{10,})\1{1,}/gi, '$1');

  // ── 7. Remove repetições de palavras consecutivas ─────────────────────────
  // Ex: "é é" → "é", "eu eu" → "eu"
  t = t.replace(/\b(\w+)(\s+\1){2,}\b/gi, '$1'); // triplas+ primeiro
  t = t.replace(/\b(\w+)\s+\1\b/gi, '$1'); // depois duplas

  // ── 8. Remove fillers / hesitações ─────────────────────────────────────────
  // "hum", "ahn", "uhm", "é...", "tá...", "né...", "então..."
  t = t.replace(/\b(?:h[ua]m+|[ua]h[nm]?|[eé]\.{2,}|t[aá]\.{2,}|n[eé]\.{2,}|ent[aã]o\.{2,})\b[,.!?]?\s*/gi, '');

  // ── 9. Remove texto claramente em outro idioma (detecção básica) ──────────
  // Se > 60% dos caracteres forem de scripts não-latino (CJK, arábico, etc.),
  // descarta a linha inteira (o modelo "pulou" de idioma).
  t = t.split('\n').filter(linha => {
    const naoLatino = (linha.match(/[\u4e00-\u9fff\u0600-\u06ff\u3040-\u30ff\u0400-\u04ff]/g) || []).length;
    return naoLatino < linha.length * 0.4;
  }).join('\n');

  // ── 10. Limpeza final ──────────────────────────────────────────────────────
  // Espaços duplicados, quebras de linha extras
  t = t.replace(/\n{2,}/g, '\n').replace(/[ ]{2,}/g, ' ').trim();

  // Capitaliza primeira letra
  if (t.length > 0) {
    t = t[0].toUpperCase() + t.slice(1);
  }

  // Garante ponto final se não terminar com pontuação
  if (t.length > 0 && !/[.!?…;:]$/.test(t)) {
    t += '.';
  }

  return t;
}

function limpar(...caminhos) {
  for (const c of caminhos) {
    if (!c) continue;
    fs.unlink(c, () => {});
  }
}

module.exports = { transcrever, modeloExiste, caminhoModelo };
