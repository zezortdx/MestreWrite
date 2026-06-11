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
  SUPRIMIR_NST, NO_CONTEXTO, BEAM_SIZE,
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

    const proc = spawn(WHISPER_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

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

  // Remove linhas de timestamp (formato [00:00:00.000 --> 00:00:01.500])
  t = t.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/gm, '');

  // Remove repetições de palavras consecutivas (ex: "é é" → "é", "eu eu" → "eu")
  t = t.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // Remove repetições triplas ou mais
  t = t.replace(/\b(\w+)(\s+\1){2,}\b/gi, '$1');

  // Remove "hum", "ahn", "uhm" e variações (com pontuação ao redor)
  t = t.replace(/\b[hH][uuaa]m?\b[,.!?]?/g, '');
  t = t.replace(/\b[aA][hH]n?\b[,.!?]?/g, '');

  // Limpa espaços duplicados
  t = t.replace(/[ ]{2,}/g, ' ').trim();

  // Capitaliza primeira letra da primeira frase
  if (t.length > 0) {
    t = t[0].toUpperCase() + t.slice(1);
  }

  // Garante ponto final se o texto não terminar com pontuação
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
