// gerar-icone.js — renderiza o orb (mesmo shader do app) num squircle e captura
// um PNG 1024×1024. Depois, `npm run icone` converte o PNG em .icns (iconutil).
//
// Uso: electron scripts/gerar-icone.js   (ou: npm run icone)

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false, // fora da tela; capturePage força o paint mesmo oculto
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: { offscreen: false },
  });

  await win.loadFile(path.join(__dirname, "icone.html"));

  // Dá tempo do WebGL compilar o shader e evoluir alguns quadros.
  await new Promise((r) => setTimeout(r, 1500));

  const ok = await win.webContents.executeJavaScript("window.__orbPronto === true").catch(() => false);
  if (!ok) {
    console.error("[icone] WebGL/orb não inicializou — abortando.");
    app.exit(1);
    return;
  }

  const img = await win.webContents.capturePage();
  const destino = path.join(__dirname, "..", "build-assets", "icon.png");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, img.toPNG());
  console.log("[icone] PNG salvo em", destino);

  app.exit(0);
});
