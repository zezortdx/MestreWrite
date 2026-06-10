// transcribe.js — transcrição de áudio via whisper.cpp (whisper-cli).
// Roda 100% local, offline. O áudio é deletado após a transcrição.
// Nenhum dado sai da máquina — ver docs/Privacidade.md.
// Suporta flags de aceleração (threads, flash-attn, no-fallback, suppress-nst)
// e pós-processamento básico do texto.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WHISPER_BIN, PATH_MODELO, IDIOMA, THREADS, FLASH_ATTN, NO_FALLBACK, SUPRIMIR_NST } = require('./config');

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

function transcrever(caminhoWav) {
  return new Promise((resolve, reject) => {
    if (!caminhoWav) {
      reject(new Error('Caminho do arquivo de áudio não informado.'));
      return;
    }

    const base = path.join(os.tmpdir(), `mestrewrite_out_${Date.now()}`);
    const args = [
      '-m', PATH_MODELO,
      '-f', caminhoWav,
      '-l', IDIOMA,
      '-t', String(THREADS),
      '-nt',
      '--output-txt',
      '-of', base,
    ];

    if (FLASH_ATTN) args.push('-fa');
    if (NO_FALLBACK) args.push('--no-fallback');
    if (SUPRIMIR_NST) args.push('--suppress-nst');

    const proc = spawn(WHISPER_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';

    proc.stdout.on('data', () => {});

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

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
