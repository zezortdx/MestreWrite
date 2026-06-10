// binpath.js — resolve binários externos (sox, whisper-cli) quando o app é aberto
// pelo Finder.
//
// PROBLEMA: um app .app lançado pelo Finder herda um PATH mínimo
// (`/usr/bin:/bin:/usr/sbin:/sbin`) e NÃO inclui `/opt/homebrew/bin` (Homebrew
// Apple Silicon) nem `/usr/local/bin` (Homebrew Intel). Sem isso, `spawn('sox')`
// falha com ENOENT mesmo com o sox instalado.
//
// SOLUÇÃO: `pathAumentado()` acrescenta os diretórios comuns de gerenciadores de
// pacote ao PATH atual; `main.js` aplica isso em `process.env.PATH` no startup,
// então todos os `spawn` (sox, whisper-cli, osascript) passam a encontrar os
// binários. `resolverBinario()` devolve o caminho absoluto (p/ checagens claras).

const fs = require('fs');
const path = require('path');

// Locais comuns de binários no macOS (ordem de prioridade).
const DIRS_COMUNS = [
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

// Caminho absoluto do binário, procurando no PATH aumentado. Devolve o próprio
// nome como fallback (deixa o SO resolver) se não achar.
function resolverBinario(nome) {
  if (nome.includes('/')) return nome; // já é caminho
  for (const dir of pathAumentado().split(path.delimiter)) {
    const candidato = path.join(dir, nome);
    try {
      fs.accessSync(candidato, fs.constants.X_OK);
      return candidato;
    } catch {
      /* tenta o próximo */
    }
  }
  return nome;
}

function binarioExiste(nome) {
  return resolverBinario(nome).includes('/');
}

module.exports = { pathAumentado, resolverBinario, binarioExiste };
