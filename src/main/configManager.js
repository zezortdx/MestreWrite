const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR_CONFIG = path.join(os.homedir(), '.mestrewrite');
const ARQUIVO_CONFIG = path.join(DIR_CONFIG, 'config.json');

const DEFAULTS = {
  atalho: 'CmdOrCtrl+Shift+Space',
  idioma: 'pt',
  modelo: 'base',
  // Aproveita os núcleos de performance (Apple Silicon costuma ter 4–8).
  threads: Math.min(8, os.cpus().length || 4),
  flashAttn: true,
  noFallback: true,
  suprimirNst: true,
  // Parada automática por silêncio (VAD nativo do sox — ver audio.js).
  autoParar: true,
  silencioLimiar: 2, // % do volume tido como "silêncio"
  silencioDuracao: 1.8, // s de silêncio contínuo p/ encerrar a fala
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
  const atual = carregarConfig();
  const novo = { ...atual, ...dados };
  fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(novo, null, 2), 'utf-8');
  return novo;
}

function caminhoModelo(tamanho) {
  const nome = tamanho || 'base';
  return path.join(os.homedir(), 'mestrewrite', 'models', `ggml-${nome}.bin`);
}

module.exports = { configExiste, carregarConfig, salvarConfig, caminhoModelo, DEFAULTS };
