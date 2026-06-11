# Checklist de commit

Regra do projeto: **antes de TODO commit**, fazer uma verificação rápida para
garantir que nada comprometedor entre no repositório (que é **público**). O custo é
baixo e evita vazar segredos, credenciais ou dados pessoais.

## Verificação obrigatória (antes de cada commit)

1. **Segredos e credenciais** — nada de token, chave, senha ou `.env` versionado:
   ```bash
   git grep -nIE 'ghp_|github_pat_|api[_-]?key|secret|password|BEGIN (RSA|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|xox[baprs]-'
   ```
2. **Infos pessoais / caminhos do sistema** — sem caminhos absolutos com o usuário:
   ```bash
   git grep -nI '/Users/'
   ```
3. **Arquivos sensíveis fora do versionamento** (devem estar no `.gitignore`):
   `node_modules/`, `dist/`, `models/`, `*.bin`, `.env`, `.claude/settings.local.json`.
4. **Sem artefatos pesados** — conferir o que vai entrar:
   ```bash
   git diff --cached --name-only        # nada de dist/, .dmg, .exe, binários grandes
   ```
5. **Sanidade de build** — `node --check` nos `.js` alterados; `npm run pack` se mexeu
   no empacotamento.

> Dica: dá para automatizar parte disso num hook `pre-commit`, mas a verificação
> manual acima já cobre o essencial.

## Fluxo de documentação

- Editar a documentação em `docs/` (diretório de trabalho) e **espelhar** para o vault
  Obsidian; os dois ficam idênticos.
- **Logs de sessão** ficam só no vault, em `Logs/`.
- A documentação **não usa emojis** (só glifos quando fazem parte da UI descrita, como
  as teclas ⌘ ⌥ ⌃ ⇧, que são símbolos tipográficos — não emojis).

## Relacionado
- [[00-Home]] · [[Stack-Técnico]] · [[ADR-008-empacotamento-electron-builder]]
