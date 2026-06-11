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
  flashAttn: false, // PT: ganho ~0 e pode degradar qualidade (whisper.cpp #3020)
  noFallback: true,
  suprimirNst: true,
  noContexto: true, // -nc: cada ditado é independente (evita arrastar alucinação)
  beamSize: 1, // greedy: determinístico e mais rápido
  usarServidor: true, // whisper-server persistente (elimina o cold-start do modelo)
  // Parada automática por silêncio (VAD nativo do sox — ver audio.js).
  autoParar: true,
  silencioLimiar: 2, // % do volume tido como "silêncio"
  silencioDuracao: 0.8, // s de silêncio p/ encerrar (antes 1.8 — menos espera)
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
  const nome = tamanho || 'base';
  return path.join(os.homedir(), 'mestrewrite', 'models', `ggml-${nome}.bin`);
}

module.exports = { configExiste, carregarConfig, salvarConfig, caminhoModelo, DEFAULTS };
