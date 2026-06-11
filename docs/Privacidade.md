# Privacidade

Privacidade não é um recurso do MestreWrite — é o **primeiro princípio** (ver [[Visão]]).
Esta nota descreve como isso se traduz em decisões concretas.

## Tudo local, por padrão
A transcrição acontece **na sua máquina**, via `whisper.cpp` (ver [[Stack-Técnico]] e
[[ADR-002-whisper-local]]). Nem o áudio nem o texto transcrito são enviados para
servidores externos.

## Sem nuvem obrigatória
O MestreWrite funciona **100% offline**. Internet não é necessária para o fluxo
central de escrita por voz. Isso resolve diretamente a dependência de rede descrita
em [[Problema]].

## Áudio efêmero
O buffer de áudio capturado serve apenas para alimentar a transcrição e é
**descartado** em seguida. Nada de gravações acumuladas sem o consentimento do usuário.

## Dados do usuário ficam com o usuário
Recursos futuros como [[Funcionalidades|histórico]] e dicionário pessoal são
armazenados **localmente**. Qualquer sincronização futura (ver [[Roadmap]]) será
**opcional** e transparente.

## Transparência
Sendo open source (MIT), qualquer pessoa pode auditar o que o MestreWrite faz com a
voz e os dados. Não há caixa-preta.

## Resumo

| Pergunta | Resposta |
|----------|----------|
| Meu áudio vai pra nuvem? | Não. |
| Funciona sem internet? | Sim. |
| O áudio fica guardado? | Não, é descartado após transcrever. |
| Posso auditar? | Sim, código aberto MIT. |

## Relacionado

- [[Visão]] · [[Problema]] · [[Stack-Técnico]] · [[ADR-002-whisper-local]]
