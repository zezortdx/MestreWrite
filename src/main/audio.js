// audio.js — captura de áudio do microfone via sox.
// Invoca sox como child process, salva WAV em diretório temporário.
// 16kHz mono 16-bit = formato que o whisper.cpp espera.

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const { SOX_BIN } = require('./config');

let processoGravacao = null;
let caminhoWav = null;

// Inicia a gravação. Retorna uma Promise que resolve com o caminho do .wav
// quando a gravação é interrompida (ou rejeita em caso de erro).
function iniciarGravacao() {
  return new Promise((resolve, reject) => {
    if (processoGravacao) {
      reject(new Error('Já existe uma gravação em andamento.'));
      return;
    }

    // Nome único: mestrewrite_<timestamp>.wav
    const nome = `mestrewrite_${Date.now()}.wav`;
    caminhoWav = path.join(os.tmpdir(), nome);

    // sox -d -r 16000 -c 1 -b 16 <arquivo.wav>
    const args = ['-d', '-r', '16000', '-c', '1', '-b', '16', caminhoWav];
    processoGravacao = spawn(SOX_BIN, args, { stdio: 'ignore' });

    let erroInicial = null;

    processoGravacao.on('spawn', () => {
      // Processo iniciou com sucesso — não fazemos nada,
      // apenas aguardamos o encerramento.
    });

    processoGravacao.on('error', (err) => {
      erroInicial = err;
      processoGravacao = null;
      caminhoWav = null;
      reject(err);
    });

    processoGravacao.on('close', (codigo) => {
      processoGravacao = null;
      if (erroInicial) return; // já rejeitamos
      if (codigo === 0 || codigo === null) {
        // SIGTERM (null) ou saída limpa (0) = gravação encerrada com sucesso.
        const wav = caminhoWav;
        caminhoWav = null;
        resolve(wav);
      } else {
        const wav = caminhoWav;
        caminhoWav = null;
        reject(new Error(`sox encerrou com código ${codigo}`));
      }
    });
  });
}

// Para a gravação em andamento enviando SIGTERM.
function pararGravacao() {
  return new Promise((resolve) => {
    if (!processoGravacao) {
      resolve(null);
      return;
    }

    const proc = processoGravacao;

    proc.on('close', () => {
      // 'close' já resolveu a Promise em iniciarGravacao,
      // aqui só garantimos que o processo encerrou.
      resolve();
    });

    proc.kill('SIGTERM');
  });
}

module.exports = { iniciarGravacao, pararGravacao };
