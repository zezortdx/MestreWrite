# ADR 013: Inteligência e Pipeline de Áudio

**Data:** 2026-06-12
**Status:** Aceito

## Contexto
O MestreWrite apresentava transcrições muito imprecisas, especialmente ao final de frases, e perdia palavras quando o usuário falava rápido. Inicialmente, o problema parecia ser o modelo Whisper (`base`). No entanto, ao tentar escalar para modelos maiores, enfrentamos latência inaceitável e corrupção de áudio devido ao uso de efeitos de normalização no pipeline do SoX.

## Problemas Identificados
1. **Truncamento de Áudio:** O VAD (sox `silence`) usava 0.5s. Em falas rápidas, micro-pausas encerravam a gravação antes do usuário terminar, "amputando" o áudio.
2. **Corrupção em Tempo Real:** O efeito `norm` exige a leitura completa de um arquivo para aplicar ganho. Em *live stream* (gravação do microfone), ele causa perda ou corrupção de bytes de áudio.
3. **Gargalo de Memória:** O modelo `large-v3-turbo` full-precision (1.6 GB) causava latência de inferência no Apple Silicon devido a limites de *memory bandwidth*.

## Decisão
1. **Pipeline de Áudio Resiliente:** 
   - Remover `norm` e usar `compand` (compressão dinâmica com *sliding window*) para equalizar microfones em tempo real.
   - Aumentar a duração do VAD (`silence`) para 1.2s e limiar de 3%.
   - Aplicar `pad 0 0.3` ao final da gravação para garantir 300ms de margem pós-corte.
2. **Quantização Q5:** 
   - Adotar como padrão o modelo `ggml-large-v3-turbo-q5_0.bin` (547 MB).
   - O formato de 5-bits preserva 99% da inteligência linguística do modelo Large, mas reduz o tempo de transferência RAM-GPU pela metade.
3. **Contenção de Alucinação:** 
   - Utilizar `--entropy-thold 2.8` e um *initial prompt* cravado em PT-BR para evitar que o modelo devaneie quando o `pad` silencioso for interpretado.

## Consequências
- **Positivas:** O "corte mágico" de palavras sumiu. O áudio do usuário pode variar de volume que o `compand` corrige on-the-fly. O modelo Large roda com a velocidade do Small.
- **Negativas:** O arquivo binário do modelo é customizado (`q5_0`), necessitando download de repositórios específicos na comunidade HuggingFace (ou geração local do quantizado), já que o repo principal do ggerganov muda constantemente.
