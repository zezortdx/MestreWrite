// config.js — configurações centralizadas do MestreWrite.
// Carrega do arquivo de usuário (~/.mestrewrite/config.json) com fallback para defaults.
// Altere pelo setup visual (primeira execução) ou edite o JSON diretamente.

const { carregarConfig, caminhoModelo } = require('./configManager');

const config = carregarConfig();

module.exports = {
  TECLA_ATALHO: config.atalho,
  IDIOMA: config.idioma,
  PATH_MODELO: caminhoModelo(config.modelo),
  MODELO: config.modelo,
  THREADS: config.threads,
  FLASH_ATTN: config.flashAttn,
  NO_FALLBACK: config.noFallback,
  SUPRIMIR_NST: config.suprimirNst,
  NO_CONTEXTO: config.noContexto,
  BEAM_SIZE: config.beamSize,
  USAR_SERVIDOR: config.usarServidor,
  AUTO_PARAR: config.autoParar,
  SILENCIO_LIMIAR: config.silencioLimiar,
  SILENCIO_DURACAO: config.silencioDuracao,
  DURACAO_MAX: config.duracaoMax,
  WHISPER_BIN: 'whisper-cli',
  SOX_BIN: 'sox',
};
