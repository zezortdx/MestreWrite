// orb.js — orb iridescente em WebGL (shader GLSL portado do componente
// "voice-powered-orb"). Renderiza um fragment shader num triângulo full-screen.
//
// PORTABILIDADE: o componente original era React + OGL + getUserMedia próprio.
// Aqui mantemos a estética vanilla do overlay: WebGL puro (sem dependências
// npm, sem bundler, respeitando a CSP `script-src 'self'`) e a orb é dirigida
// pelo STATE MACHINE existente (idle · listening · processing) que chega via
// IPC em `window.mestreOverlay.aoMudarEstado`. Nada de microfone aqui — o nível
// de áudio virá depois do processo principal por IPC (ver docs/Arquitetura.md).
//
// SISTEMA ADAPTATIVO: dimensões/posições vêm do tamanho REAL da tela e
// recalculam em 'resize', preservando o layout da orb Canvas anterior.

(() => {
  const canvas = document.getElementById('orb');
  const wrap = document.querySelector('.orb-wrap');
  const raiz = document.documentElement.style;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // DPR limitado a 2: nitidez boa sem custo de GPU exagerado no overlay.
  const DPR = clamp(window.devicePixelRatio || 1, 1, 2);

  // ── Shaders (GLSL ES 1.00 — idênticos ao componente original) ─────────────
  const vert = /* glsl */ `
    precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }

    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956 * c.y + 0.621 * c.z;
      float g = c.x - 0.272 * c.y - 0.647 * c.z;
      float b = c.x - 1.106 * c.y + 1.703 * c.z;
      return vec3(r, g, b);
    }

    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad);
      float sinA = sin(hueRad);
      float i = yiq.y * cosA - yiq.z * sinA;
      float q = yiq.y * sinA + yiq.z * cosA;
      yiq.y = i;
      yiq.z = q;
      return yiq2rgb(yiq);
    }

    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
      ) * p3.zyx);
    }

    float snoise3(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(
        dot(d0, d0),
        dot(d1, d1),
        dot(d2, d2),
        dot(d3, d3)
      ), 0.0);
      vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
      );
      return dot(vec4(31.316), n);
    }

    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb / (a + 1e-5), a);
    }

    const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6;
    const float noiseScale = 0.65;

    float light1(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * attenuation);
    }

    float light2(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * dist * attenuation);
    }

    vec4 draw(vec2 uv) {
      vec3 color1 = adjustHue(baseColor1, hue);
      vec3 color2 = adjustHue(baseColor2, hue);
      vec3 color3 = adjustHue(baseColor3, hue);

      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len > 0.0 ? 1.0 / len : 0.0;

      float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
      float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
      float d0 = distance(uv, (r0 * invLen) * uv);
      float v0 = light1(1.0, 10.0, d0);
      v0 *= smoothstep(r0 * 1.05, r0, len);
      float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;

      float a = iTime * -1.0;
      vec2 pos = vec2(cos(a), sin(a)) * r0;
      float d = distance(uv, pos);
      float v1 = light2(1.5, 5.0, d);
      v1 *= light1(1.0, 50.0, d0);

      float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

      vec3 col = mix(color1, color2, cl);
      col = mix(color3, col, v0);
      col = (col + v1) * v2 * v3;
      col = clamp(col, 0.0, 1.0);

      return extractAlpha(col);
    }

    vec4 mainImage(vec2 fragCoord) {
      vec2 center = iResolution.xy * 0.5;
      float size = min(iResolution.x, iResolution.y);
      vec2 uv = (fragCoord - center) / size * 2.0;

      float angle = rot;
      float s = sin(angle);
      float c = cos(angle);
      uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

      uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
      uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);

      return draw(uv);
    }

    void main() {
      vec2 fragCoord = vUv * iResolution.xy;
      vec4 col = mainImage(fragCoord);
      gl_FragColor = vec4(col.rgb * col.a, col.a);
    }
  `;

  // ── Setup WebGL ────────────────────────────────────────────────────────────
  // O shader emite cor PRÉ-MULTIPLICADA (col.rgb * col.a). Para compor limpo
  // sobre a janela transparente do Electron: contexto premultipliedAlpha:true
  // (o compositor sabe que o rgb já está pré-multiplicado) + blend
  // ONE / ONE_MINUS_SRC_ALPHA (premultiplied blend correto, borda sem halo).
  const gl =
    canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    }) || canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error('Orb: WebGL indisponível neste renderer.');
    return;
  }

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function compilar(tipo, fonte) {
    const sh = gl.createShader(tipo);
    gl.shaderSource(sh, fonte);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Orb: erro ao compilar shader:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compilar(gl.VERTEX_SHADER, vert);
  const fs = compilar(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Orb: erro ao linkar program:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Triângulo full-screen (mesma geometria que o OGL Triangle): cobre o clip
  // space com uv 0..1 na área visível.
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const locPos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
  const locUv = gl.getAttribLocation(program, 'uv');
  gl.enableVertexAttribArray(locUv);
  gl.vertexAttribPointer(locUv, 2, gl.FLOAT, false, 0, 0);

  const u = {
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    hue: gl.getUniformLocation(program, 'hue'),
    hover: gl.getUniformLocation(program, 'hover'),
    rot: gl.getUniformLocation(program, 'rot'),
    hoverIntensity: gl.getUniformLocation(program, 'hoverIntensity'),
  };
  // hue 0 = mantém a paleta roxa/violeta base do shader (combina com o tema).
  gl.uniform1f(u.hue, 0);

  // ── Dimensões adaptativas (mesma lógica/posição da orb anterior) ────────────
  function ajustarTamanho() {
    const vh = window.innerHeight;
    const menor = Math.min(window.innerWidth, vh);
    const diametro = Math.round(clamp(vh * 0.14, 150, 280));
    const box = Math.round(diametro * 1.7); // folga p/ o brilho/halo do shader

    canvas.style.width = box + 'px';
    canvas.style.height = box + 'px';
    canvas.width = Math.round(box * DPR);
    canvas.height = Math.round(box * DPR);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3f(u.iResolution, canvas.width, canvas.height, canvas.width / canvas.height);

    wrap.style.width = box + 'px';
    wrap.style.height = box + 'px';
    wrap.style.marginLeft = -box / 2 + 'px';
    wrap.style.bottom = Math.round(vh * 0.1) + 'px';

    raiz.setProperty('--espessura', Math.round(clamp(menor * 0.015, 13, 32)) + 'px');
    raiz.setProperty('--flutua', Math.round(clamp(diametro * 0.05, 5, 14)) + 'px');
    // Shader já tem bordas suaves → blur leve só p/ o "ar etéreo".
    raiz.setProperty('--orb-blur', Math.round(clamp(diametro * 0.02, 2, 8)) + 'px');
  }

  // ── Estado + parâmetros suavizados ──────────────────────────────────────────
  // O state machine não traz nível de voz; mapeamos cada estado p/ velocidade de
  // rotação, escala de tempo (energia interna) e os efeitos hover do shader.
  let estado = 'idle';
  let rodando = false;
  let rafId = 0;
  let ultimoTs = 0;
  let timeoutParar = 0;

  let iTime = 0;
  let rot = 0;

  const ALVOS = {
    idle: { rotSpeed: 0.15, timeScale: 0.55, hover: 0.0, hoverIntensity: 0.0 },
    listening: { rotSpeed: 0.5, timeScale: 1.0, hover: 0.35, hoverIntensity: 0.4 },
    processing: { rotSpeed: 1.2, timeScale: 1.9, hover: 0.85, hoverIntensity: 0.8 },
  };
  const par = { ...ALVOS.idle };

  function desenhar() {
    gl.uniform1f(u.iTime, iTime);
    gl.uniform1f(u.rot, rot);
    gl.uniform1f(u.hover, par.hover);
    gl.uniform1f(u.hoverIntensity, par.hoverIntensity);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(ts) {
    if (!rodando) return;
    if (!ultimoTs) ultimoTs = ts;
    const dt = Math.min(0.05, (ts - ultimoTs) / 1000);
    ultimoTs = ts;

    const a = ALVOS[estado] || ALVOS.idle;
    const k = 1 - Math.exp(-dt * 3.0); // suavização exponencial das transições
    par.rotSpeed += (a.rotSpeed - par.rotSpeed) * k;
    par.timeScale += (a.timeScale - par.timeScale) * k;
    par.hover += (a.hover - par.hover) * k;
    par.hoverIntensity += (a.hoverIntensity - par.hoverIntensity) * k;

    iTime += dt * par.timeScale;
    rot += dt * par.rotSpeed;

    desenhar();
    rafId = requestAnimationFrame(frame);
  }

  function iniciarLoop() {
    if (rodando) return;
    rodando = true;
    ultimoTs = 0;
    rafId = requestAnimationFrame(frame);
  }

  function pararLoop() {
    rodando = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    gl.clear(gl.COLOR_BUFFER_BIT); // libera a GPU enquanto a orb está escondida
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  function aplicarEstado(novo) {
    if (novo !== 'idle' && novo !== 'listening' && novo !== 'processing') return;
    estado = novo;

    document.body.classList.remove('estado-idle', 'estado-listening', 'estado-processing');
    document.body.classList.add('estado-' + novo);

    if (novo === 'idle') {
      // Espera a fade-out (CSS) terminar antes de parar o loop e limpar.
      clearTimeout(timeoutParar);
      timeoutParar = setTimeout(pararLoop, 360);
    } else {
      clearTimeout(timeoutParar);
      iniciarLoop();
    }
  }

  window.addEventListener('resize', ajustarTamanho);

  ajustarTamanho();
  if (window.mestreOverlay && typeof window.mestreOverlay.aoMudarEstado === 'function') {
    window.mestreOverlay.aoMudarEstado(aplicarEstado);
  }
  aplicarEstado('idle');
})();
