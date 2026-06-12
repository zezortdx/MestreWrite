const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR_CONFIG = path.join(os.homedir(), '.mestrewrite');
const ARQUIVO_CONFIG = path.join(DIR_CONFIG, 'config.json');

const DEFAULTS = {
  atalho: 'CmdOrCtrl+Shift+Space',
  idioma: 'pt',
  modelo: 'large-v3-turbo-q5_0',
  // Aproveita os núcleos de performance (Apple Silicon costuma ter 4–8).
  threads: Math.min(8, os.cpus().length || 4),
  flashAttn: process.platform === 'darwin', // Acelera no Apple Silicon, previne crash no Windows
  noFallback: true,
  suprimirNst: true,
  noContexto: true, // -nc: cada ditado é independente (evita arrastar alucinação)
  beamSize: 2, // beam 2: boa precisão com modelo large, sem latência extra
  usarServidor: true, // whisper-server persistente (elimina o cold-start do modelo)
  // Initial prompt: guia o Whisper para PT-BR com pontuação e acentuação corretas.
  // NÃO é uma instrução — é um trecho de texto que o modelo "acredita" veio antes do áudio.
  prompt: 'Olá, este é um ditado em português brasileiro. Vou falar naturalmente, com pontuação e acentuação corretas.',
  // Threshold de entropia: segmentos com entropia acima desse valor são descartados
  // (indica baixa confiança → provavelmente alucinação). 2.8 é um bom equilíbrio.
  entropiaLimiar: 2.8,
  // Parada automática por silêncio (VAD nativo do sox — ver audio.js).
  autoParar: true,
  silencioLimiar: 3, // % do volume tido como "silêncio" (3% evita cortar consoantes fracas)
  silencioDuracao: 1.2, // s de silêncio p/ encerrar (1.2s tolera pausas naturais na fala rápida)
  duracaoMax: 30, // s — trava de segurança (força a parada)
};

function garantirDiretorio() {
  if (!fs.existsSync(DIR_CONFIG)) {
    fs.mkdirSync(DIR_CONFIG, { recursive: true });
  }
}

function configExiste() {
  return fs.existsSync(ARQUIVO_CONFIG);
}

function carregarConfig() {
  if (!configExiste()) return { ...DEFAULTS };
  try {
    const raw = fs.readFileSync(ARQUIVO_CONFIG, 'utf-8');
    const dados = JSON.parse(raw);
    return { ...DEFAULTS, ...dados };
  } catch {
    return { ...DEFAULTS };
  }
}

function salvarConfig(dados) {
  garantirDiretorio();
  // Mescla com o ARQUIVO existente — NÃO com os DEFAULTS. Assim o config.json só
  // guarda o que foi explicitamente salvo (escolhas do usuário) e não "congela"
  // os valores padrão; defaults novos (ex.: tuning de VAD/whisper) passam a valer
  // em versões futuras sem o usuário ter que reconfigurar.
  let atual = {};
  if (configExiste()) {
    try {
      atual = JSON.parse(fs.readFileSync(ARQUIVO_CONFIG, 'utf-8'));
    } catch {
      atual = {};
    }
  }
  const novo = { ...atual, ...dados };
  fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(novo, null, 2), 'utf-8');
  return novo;
}

function caminhoModelo(tamanho) {
  const nome = tamanho || 'large-v3-turbo-q5_0';
  return path.join(os.homedir(), 'mestrewrite', 'models', `ggml-${nome}.bin`);
}

module.exports = { configExiste, carregarConfig, salvarConfig, caminhoModelo, DEFAULTS };
