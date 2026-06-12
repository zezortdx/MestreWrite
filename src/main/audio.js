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

    // Dispositivo de entrada por plataforma: macOS/Linux usam o device padrão
    // (`-d`); Windows usa o driver WaveAudio (`-t waveaudio default`).
    const entrada = process.platform === 'win32'
      ? ['-t', 'waveaudio', 'default']
      : ['-d'];

    // sox <entrada> -r 16000 -c 1 -b 16 <arquivo.wav> [efeitos]
    // `compand` equaliza volume em tempo real (norm é incompatível com gravação ao vivo).
    // `highpass 80` remove ruído de baixa frequência.
    const args = [...entrada, '-r', '16000', '-c', '1', '-b', '16', caminhoWav,
      'compand', '0.02,0.05', '-90,-90,-70,-70,-60,-20,0,0', '-5', '-90', '0.1',
      'highpass', '80',
    ];
    if (AUTO_PARAR) {
      const limiar = `${SILENCIO_LIMIAR}%`;
      // silence 1 0.1 L  → começa ao detectar fala (corta silêncio inicial)
      // 1 <dur> L        → encerra após <dur>s de silêncio contínuo
      args.push('silence', '1', '0.1', limiar, '1', String(SILENCIO_DURACAO), limiar);
      // pad: adiciona 300ms de silêncio no final para não cortar a última palavra.
      args.push('pad', '0', '0.3');
    }
    processoGravacao = spawn(SOX_BIN, args, { stdio: 'ignore', windowsHide: true });

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

    // SIGINT no macOS faz o sox escrever os headers WAV corretamente;
    // SIGTERM pode truncar o arquivo. No Windows não há diferença.
    proc.kill(process.platform === 'win32' ? 'SIGTERM' : 'SIGINT');
  });
}

module.exports = { iniciarGravacao, pararGravacao };
