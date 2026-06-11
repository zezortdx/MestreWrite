// gerar-icone.js — renderiza o orb (mesmo shader do app) e captura:
//   1. build-assets/icon.png        → ícone do APP (squircle branco + orb)
//   2. build-assets/tray-master.png → orb sozinho (base do ícone da barra de menus)
//
// Depois, `npm run icone` (gerar-icns.sh) converte o icon.png em .icns e o
// tray-master.png nos tamanhos do tray (src/assets/tray-icon.png + @2x).
//
// Uso: electron scripts/gerar-icone.js   (ou: npm run icone)

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

// Reusa UMA janela (redimensionando) p/ evitar corrida de criar/destruir janela.
async function capturar(win, arquivoHtml, lado, destino) {
  win.setContentSize(lado, lado);
  await win.loadFile(path.join(__dirname, arquivoHtml));
  await new Promise((r) => setTimeout(r, 1500)); // deixa o WebGL compilar/evoluir

  const ok = await win.webContents
    .executeJavaScript("window.__orbPronto === true")
    .catch(() => false);
  if (!ok) {
    console.error(`[icone] WebGL/orb não inicializou em ${arquivoHtml}.`);
    return false;
  }

  const img = await win.webContents.capturePage();
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, img.toPNG());
  console.log("[icone] salvo:", destino);
  return true;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: { offscreen: false },
  });

  const baseAssets = path.join(__dirname, "..", "build-assets");
  let ok = true;
  ok = (await capturar(win, "icone.html", 1024, path.join(baseAssets, "icon.png"))) && ok;
  ok = (await capturar(win, "tray.html", 256, path.join(baseAssets, "tray-master.png"))) && ok;

  app.exit(ok ? 0 : 1);
});
