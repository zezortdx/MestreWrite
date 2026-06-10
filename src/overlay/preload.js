// preload.js — ponte segura entre o processo principal e o overlay.
// Roda em contexto isolado (contextIsolation:true, sem nodeIntegration):
// o renderer só enxerga exatamente o que expomos aqui via contextBridge.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mestreOverlay', {
  // Registra um callback chamado a cada mudança de estado vinda do main.
  // estado: 'idle' | 'listening' | 'processing'
  aoMudarEstado: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('overlay-state', (_evento, estado) => callback(estado));
  },

  // Registra um callback para receber nível de áudio em tempo real (0..1).
  // Usado pela waveform para reagir à voz captada.
  // Emitido pelo main durante RECORDING; se não chegar, waveform usa dados
  // procedurais (já existentes em pilula.js).
  aoNivelAudio: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('overlay-audio-level', (_evento, nivel) => callback(nivel));
  },
});
