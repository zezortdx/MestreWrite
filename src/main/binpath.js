// binpath.js — resolve binários externos (sox, whisper-cli) de forma robusta em
// macOS e Windows.
//
// macOS: um app .app aberto pelo Finder herda um PATH mínimo
// (`/usr/bin:/bin:...`) SEM `/opt/homebrew/bin`, então `spawn('sox')` falha. A
// solução é acrescentar os diretórios comuns do Homebrew/MacPorts ao PATH.
//
// Windows: apps GUI já herdam o PATH do usuário (onde scoop/winget/choco colocam
// os binários), então em geral nada falta; ainda assim acrescentamos alguns
// caminhos comuns como rede de segurança e tratamos as extensões (.exe/.cmd).

const fs = require('fs');
const path = require('path');
const os = require('os');

const EH_WIN = process.platform === 'win32';

// Diretórios comuns de binários por plataforma (acrescentados ao PATH atual).
const DIRS_COMUNS = EH_WIN
  ? [
      path.join(os.homedir(), 'scoop', 'shims'), // scoop
      'C:\\ProgramData\\chocolatey\\bin', // chocolatey
      path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links'), // winget
    ]
  : [
      '/opt/homebrew/bin', // Homebrew (Apple Silicon)
      '/usr/local/bin', // Homebrew (Intel)
      '/opt/local/bin', // MacPorts
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ];

function pathAumentado() {
  const atual = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const todos = [...DIRS_COMUNS, ...atual];
  // Remove duplicatas preservando a ordem.
  return [...new Set(todos)].join(path.delimiter);
}

// Extensões executáveis a tentar (Windows: PATHEXT).
function extensoes() {
  if (!EH_WIN) return [''];
  const pathext = process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM';
  return ['', ...pathext.split(';').filter(Boolean).map((e) => e.toLowerCase())];
}

// Caminho absoluto do binário, procurando no PATH aumentado. Devolve o próprio
// nome como fallback (deixa o SO resolver) se não achar.
function resolverBinario(nome) {
  if (nome.includes('/') || nome.includes('\\')) return nome; // já é caminho
  for (const dir of pathAumentado().split(path.delimiter)) {
    for (const ext of extensoes()) {
      const candidato = path.join(dir, nome + ext);
      try {
        fs.accessSync(candidato, fs.constants.X_OK);
        return candidato;
      } catch {
        /* tenta o próximo */
      }
    }
  }
  return nome;
}

function binarioExiste(nome) {
  const r = resolverBinario(nome);
  return r !== nome; // achou um caminho absoluto
}

module.exports = { pathAumentado, resolverBinario, binarioExiste };
