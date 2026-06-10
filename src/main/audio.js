// audio.js — captura de áudio do microfone via sox.
// Invoca sox como child process, salva WAV em diretório temporário.
// 16kHz mono 16-bit = formato que o whisper.cpp espera.
//
// VAD nativo: o efeito `silence` do sox corta o silêncio inicial (espera a fala)
// e ENCERRA a gravação sozinho após um período de silêncio — então o whisper só
// recebe a fala (sem silêncio/ruído nas pontas, onde ele costuma alucinar).
// Um `highpass` leve remove ruído de baixa frequência antes da detecção.

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const {
  SOX_BIN,
  AUTO_PARAR,
  SILENCIO_LIMIAR,
  SILENCIO_DURACAO,
} = require('./config');

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

    // sox -d -r 16000 -c 1 -b 16 <arquivo.wav> [efeitos]
    const args = ['-d', '-r', '16000', '-c', '1', '-b', '16', caminhoWav, 'highpass', '80'];
    if (AUTO_PARAR) {
      const limiar = `${SILENCIO_LIMIAR}%`;
      // silence 1 0.1 L  → começa ao detectar fala (corta silêncio inicial)
      // 1 <dur> L        → encerra após <dur>s de silêncio contínuo
      args.push('silence', '1', '0.1', limiar, '1', String(SILENCIO_DURACAO), limiar);
    }
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
