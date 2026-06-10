// main.js — processo principal do Electron (orquestrador).
// Gerencia a máquina de estados (IDLE → RECORDING → TRANSCRIBING → IDLE),
// a janela overlay, o atalho global e os módulos de áudio/transcrição/inserção.
// Tudo 100% local e offline — ver docs/Arquitetura.md e docs/MVP.md.
// Na primeira execução, abre o setup visual para configurar atalho/idioma/modelo.

const { app, BrowserWindow, globalShortcut, screen, Notification, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

// ── Setup de primeira execução ───────────────────────────────────────────────
// O configManager é carregado antes dos módulos de negócio para evitar
// caching de imports com valores default antes do setup salvar a config real.
const { configExiste, salvarConfig } = require('./configManager');

function abrirSetup() {
  const setupWin = new BrowserWindow({
    width: 800,
    height: 640,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false, // o cartão flutuante tem sua própria sombra (CSS)
    resizable: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'setup', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  setupWin.loadFile(path.join(__dirname, '..', 'setup', 'index.html'));

  ipcMain.once('setup-concluido', (_event, config) => {
    salvarConfig(config);
    setupWin.close();
    app.relaunch();
    app.exit(0);
  });
}

// ── Módulos de negócio (carregados só após setup confirmar que config existe) ─
const { TECLA_ATALHO, PATH_MODELO } = require('./config');
const { iniciarGravacao, pararGravacao } = require('./audio');
const { transcrever, modeloExiste, caminhoModelo } = require('./transcribe');
const { inserirTexto } = require('./typer');

// O som de ativação (Web Audio) é disparado por mudança de estado vinda de um
// atalho global — não há gesto do usuário no DOM. Esta flag permite que o
// AudioContext toque sem exigir interação. Precisa ser definida antes do ready.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// ── Máquina de estados ───────────────────────────────────────────────────────
const ESTADO = Object.freeze({
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
});

let estado = ESTADO.IDLE;

// Janela única do overlay.
let janelaOverlay = null;

// ── Notificação de erro amigável ─────────────────────────────────────────────
function notificar(titulo, corpo) {
  try {
    new Notification({ title: titulo, body: corpo }).show();
  } catch {
    console.error(`[main] ${titulo}: ${corpo}`);
  }
}

function voltarAoIdle() {
  estado = ESTADO.IDLE;
  enviarEstadoOverlay('idle');
}

// ── Tray — indispensável: sem dock, sem menu, o app ficaria preso ────────────
function criarTray() {
  const icone = nativeImage.createFromPath(
    path.join(__dirname, '..', 'assets', 'tray-icon.png')
  );

  const tray = new Tray(icone);
  if (icone.isEmpty()) tray.setTitle(' MW');
  tray.setToolTip('MestreWrite — Pronto');

  function atualizarTooltip(texto) {
    tray.setToolTip('MestreWrite — ' + texto);
  }

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'MestreWrite',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Sair',
      role: 'quit',
    },
  ]));

  return { tray, atualizarTooltip };
}

let atualizarTooltipTray = null;

// ── Overlay ──────────────────────────────────────────────────────────────────
function criarJanelaOverlay() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.bounds;

  janelaOverlay = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'overlay', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  janelaOverlay.setAlwaysOnTop(true, 'screen-saver');
  janelaOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  janelaOverlay.setIgnoreMouseEvents(true);

  janelaOverlay.loadFile(path.join(__dirname, '..', 'overlay', 'overlay.html'));

  janelaOverlay.once('ready-to-show', () => {
    janelaOverlay.showInactive();
    enviarEstadoOverlay('idle');
  });

  janelaOverlay.on('closed', () => {
    janelaOverlay = null;
  });
}

function enviarEstadoOverlay(estadoVisual) {
  if (janelaOverlay && !janelaOverlay.isDestroyed()) {
    janelaOverlay.webContents.send('overlay-state', estadoVisual);
  }
}

// ── Fluxo ────────────────────────────────────────────────────────────────────
let ultimoWav = null;

function toggleGravacao() {
  if (estado === ESTADO.IDLE) {
    if (!modeloExiste()) {
      notificar(
        'MestreWrite — Modelo não encontrado',
        `Baixe o modelo com:\ncurl -L -o ${caminhoModelo()} https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin`
      );
      return;
    }
    iniciar();
  } else if (estado === ESTADO.RECORDING) {
    finalizar();
  }
}

async function iniciar() {
  estado = ESTADO.RECORDING;
  enviarEstadoOverlay('listening');
  if (atualizarTooltipTray) atualizarTooltipTray('Gravando…');

  try {
    ultimoWav = await iniciarGravacao();
  } catch (err) {
    ultimoWav = null;
    voltarAoIdle();
    if (atualizarTooltipTray) atualizarTooltipTray('Pronto');

    if (err.code === 'ENOENT') {
      notificar('MestreWrite — sox não encontrado', 'Instale com: brew install sox');
    } else {
      notificar('MestreWrite — Erro na gravação', err.message);
    }
  }
}

async function finalizar() {
  if (estado !== ESTADO.RECORDING) return;

  await pararGravacao();

  if (!ultimoWav) {
    voltarAoIdle();
    if (atualizarTooltipTray) atualizarTooltipTray('Pronto');
    return;
  }

  estado = ESTADO.TRANSCRIBING;
  enviarEstadoOverlay('processing');
  if (atualizarTooltipTray) atualizarTooltipTray('Transcrevendo…');

  try {
    const texto = await transcrever(ultimoWav);
    ultimoWav = null;

    await inserirTexto(texto);

    voltarAoIdle();
    if (atualizarTooltipTray) atualizarTooltipTray('Pronto');
  } catch (err) {
    ultimoWav = null;
    voltarAoIdle();
    if (atualizarTooltipTray) atualizarTooltipTray('Pronto');

    if (err.code === 'ENOENT') {
      notificar('MestreWrite — whisper-cli não encontrado', 'Instale com: brew install whisper-cpp');
    } else {
      notificar('MestreWrite — Erro na transcrição', err.message);
    }
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Primeira execução? Abre setup visual e depois relaça com config real.
  if (!configExiste()) {
    abrirSetup();
    return;
  }

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }

  if (!modeloExiste()) {
    console.warn('[main] Modelo whisper não encontrado em:', PATH_MODELO);
    notificar(
      'MestreWrite — Modelo não encontrado',
      `Baixe com:\ncurl -L -o ${caminhoModelo()} https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin`
    );
  }

  criarJanelaOverlay();

  const { atualizarTooltip } = criarTray();
  atualizarTooltipTray = atualizarTooltip;

  const registrado = globalShortcut.register(TECLA_ATALHO, toggleGravacao);
  if (!registrado) {
    console.error(`[main] Falha ao registrar atalho: ${TECLA_ATALHO}`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
