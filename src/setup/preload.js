const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mestreSetup', {
  concluir: (config) => {
    ipcRenderer.send('setup-concluido', config);
  },
  getConfigAtual: () => {
    return ipcRenderer.invoke('obter-config-atual');
  }
});
