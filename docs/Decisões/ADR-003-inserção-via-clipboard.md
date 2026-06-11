# ADR-003 — Inserção de texto via área de transferência

## Status
Aceito para o MVP (2026) · Revisável em fases futuras

## Contexto
Para ser universal ("funciona em qualquer lugar", princípio da [[Visão]]), o
MestreWrite precisa inserir o texto transcrito no aplicativo em foco — qualquer um.
As abordagens consideradas:
1. **Simular digitação tecla a tecla** — frágil, lenta, e quebra com acentos/layouts.
2. **APIs de acessibilidade específicas por app** — robusto, mas complexo e por app.
3. **Área de transferência (clipboard) + colar simulado** — simples e universal.

O [[MVP]] prioriza simplicidade e cobertura ampla com o mínimo de esforço.

## Decisão
No MVP, **colocar o texto transcrito na área de transferência** e disparar um
**comando de colar** (ex.: ⌘V no macOS) para inseri-lo no app em foco. Ver o
componente de inserção em [[Arquitetura]].

## Consequências

**Positivas**
- Funciona na esmagadora maioria dos aplicativos sem código por app.
- Simples de implementar e confiável com acentos/Unicode.
- Rápido (uma operação, não tecla a tecla).

**Negativas / trade-offs**
- **Sobrescreve o conteúdo atual da área de transferência** do usuário.
- Depende de o app de destino aceitar o comando de colar padrão.
- Exige permissões de acessibilidade no macOS.

**Mitigações**
- **Salvar e restaurar** o clipboard anterior após colar.
- Documentar a permissão de acessibilidade necessária.
- Reavaliar inserção nativa por plataforma na fase 3 do [[Roadmap]].

## Relacionado
- [[Arquitetura]] · [[MVP]] · [[Stack-Técnico]] · [[ADR-001-electron]]
