// typer.js — inserção de texto no app em foco via clipboard + colagem.
// Estratégia (ADR-003): salva o clipboard do usuário, escreve o texto, simula a
// colagem (⌘V no macOS, Ctrl+V no Windows) e restaura o clipboard original.
//
// Cross-platform (ADR-010):
//   - macOS:   osascript → System Events keystroke "v" using command down
//   - Windows: PowerShell → System.Windows.Forms.SendKeys "^v"
//   - Linux:   xdotool key ctrl+v (best-effort)

const { clipboard, Notification } = require('electron');
const { spawn } = require('child_process');

// Define como simular a colagem em cada plataforma.
function comandoColar() {
  if (process.platform === 'darwin') {
    return {
      cmd: 'osascript',
      args: ['-'],
      stdin: 'tell application "System Events"\nkeystroke "v" using command down\nend tell',
      restauraMs: 150,
    };
  }
  if (process.platform === 'win32') {
    // SendKeys: ^ = Ctrl. Pequena espera p/ o foco/clipboard assentarem.
    const ps =
      "Add-Type -AssemblyName System.Windows.Forms; " +
      "Start-Sleep -Milliseconds 40; " +
      "[System.Windows.Forms.SendKeys]::SendWait('^v')";
    return {
      cmd: 'powershell',
      args: ['-NoProfile', '-NonInteractive', '-Command', ps],
      stdin: null,
      restauraMs: 450,
    };
  }
  // Linux (best-effort) — requer xdotool.
  return {
    cmd: 'xdotool',
    args: ['key', '--clearmodifiers', 'ctrl+v'],
    stdin: null,
    restauraMs: 300,
  };
}

function avisoFalha() {
  if (process.platform === 'darwin') {
    return 'Permissão de Acessibilidade necessária. Vá em Ajustes do Sistema > ' +
      'Privacidade e Segurança > Acessibilidade e adicione o MestreWrite.';
  }
  if (process.platform === 'win32') {
    return 'Não foi possível colar (SendKeys). Tente novamente com o cursor no ' +
      'campo de texto desejado.';
  }
  return 'Não foi possível colar. Instale o xdotool (X11) e tente novamente.';
}

function inserirTexto(texto) {
  return new Promise((resolve) => {
    if (!texto) {
      resolve();
      return;
    }

    const { cmd, args, stdin, restauraMs } = comandoColar();

    // 1. Salvar clipboard atual e 2. escrever o texto transcrito.
    const clipboardOriginal = clipboard.readText();
    clipboard.writeText(texto);

    // 3. Simular a colagem.
    const child = spawn(cmd, args, {
      stdio: [stdin != null ? 'pipe' : 'ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });

    let erroStderr = '';
    if (child.stderr) child.stderr.on('data', (d) => (erroStderr += d.toString()));

    child.on('error', () => {
      // spawn falhou (binário não encontrado, ex.: xdotool no Linux).
      new Notification({ title: 'MestreWrite — Não foi possível colar', body: avisoFalha() }).show();
      restaurar();
    });

    child.on('close', (codigo) => {
      if (codigo !== 0) {
        new Notification({ title: 'MestreWrite — Não foi possível colar', body: avisoFalha() }).show();
        console.error(`[typer] colar falhou (código ${codigo}):`, erroStderr);
      }
      restaurar();
    });

    let restaurado = false;
    function restaurar() {
      if (restaurado) return;
      restaurado = true;
      // 4. Restaurar o clipboard original após a colagem.
      setTimeout(() => {
        try {
          clipboard.writeText(clipboardOriginal);
        } catch {
          /* paciência — o conteúdo pode ter sido substituído */
        }
        resolve();
      }, restauraMs);
    }

    if (stdin != null && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
  });
}

module.exports = { inserirTexto };
