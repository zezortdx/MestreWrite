// typer.js — inserção de texto no app em foco via clipboard + colagem.
// Estratégia definida em docs/Decisões/ADR-003-inserção-via-clipboard.md:
// 1. Salva o conteúdo ATUAL do clipboard do usuário.
// 2. Escreve o texto transcrito no clipboard.
// 3. Simula ⌘V via osascript (System Events).
// 4. Após 300ms, RESTAURA o clipboard original.
// Essencial: não destruir o que o usuário tinha copiado.

const { clipboard, Notification } = require('electron');
const { spawn } = require('child_process');

function inserirTexto(texto) {
  return new Promise((resolve) => {
    if (!texto) {
      resolve();
      return;
    }

    // 1. Salvar clipboard atual
    const clipboardOriginal = clipboard.readText();

    // 2. Escrever o texto transcrito
    clipboard.writeText(texto);

    // 3. Simular ⌘V via AppleScript — via stdin para evitar shell escaping
    const asScript = `tell application "System Events"\nkeystroke "v" using command down\nend tell`;

    const child = spawn('osascript', ['-'], { stdio: ['pipe', 'ignore', 'pipe'] });

    let erroStderr = '';

    child.stderr.on('data', (data) => {
      erroStderr += data.toString();
    });

    child.on('error', () => {
      // spawn falhou (osascript não encontrado) — improvável no macOS
    });

    child.on('close', (codigo) => {
      if (codigo !== 0) {
        const msg =
          'Permissão de Acessibilidade necessária. Vá em Ajustes do Sistema > ' +
          'Privacidade e Segurança > Acessibilidade e adicione o MestreWrite.';

        new Notification({
          title: 'MestreWrite — Permissão necessária',
          body: msg,
        }).show();

        console.error('[typer] Erro ao colar (código ' + codigo + '):', erroStderr);
      }

      // 4. Restaurar o clipboard original após 300ms
      setTimeout(() => {
        try {
          clipboard.writeText(clipboardOriginal);
        } catch {
          // Se falhar, paciência — o texto do usuário pode ter sido substituído.
        }
        resolve();
      }, 300);
    });

    child.stdin.write(asScript);
    child.stdin.end();
  });
}

module.exports = { inserirTexto };
