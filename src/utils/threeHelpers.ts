import * as THREE from 'three';

let cachedSoftwareGl: boolean | null = null;

/**
 * Detect software WebGL renderers (SwiftShader, llvmpipe, WARP) via GPU renderer string.
 * Used strictly for rendering cost (pixel ratio, shadows, antialias, frame pacing).
 */
export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

/**
 * Software-WebGL-safe frame pacing using WebGL2 fenceSync so the browser main thread
 * and screenshots never starve on CPU-rendered WebGL.
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  registerTimer: (id: number) => void,
  delayMs = 80,
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync !== 'function') {
    registerTimer(window.setTimeout(cb, delayMs));
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
    if (state === gl.UNSIGNALED) {
      registerTimer(window.setTimeout(poll, 6));
    } else {
      if (sync) gl.deleteSync(sync);
      registerTimer(window.setTimeout(cb, delayMs));
    }
  };
  registerTimer(window.setTimeout(poll, 6));
}

/**
 * Procedural topographic valley texture with subtle contour lines and soil/grass variation.
 */
export function createTerrainCanvasTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d9e3c7';
    ctx.fillRect(0, 0, size, size);

    // Subtle organic terrain grain
    for (let i = 0; i < 1600; i++) {
      const x = (i * 97) % size;
      const y = (i * 53 + Math.floor(i / 20) * 19) % size;
      const r = 2 + (i % 6);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(90, 125, 65, 0.08)' : 'rgba(180, 155, 105, 0.08)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle cartographic contour grid
    ctx.strokeStyle = 'rgba(72, 96, 56, 0.14)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= size; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(size, g);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = Math.min(anisotropy, 8);
  return texture;
}

/**
 * Procedural Vietnamese victory red flag with golden 5-pointed star texture.
 */
export function createVictoryFlagTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#D91E18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Golden 5-pointed star in center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    const cx = 128;
    const cy = 85;
    const outerR = 46;
    const innerR = 18;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Subtle fabric weave shading
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x < 256; x += 28) {
      ctx.fillRect(x, 0, 10, 170);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(anisotropy, 8);
  return texture;
}

/**
 * Procedural French Tricolor flag texture (Blue – White – Red vertical bands)
 * for French-held strongholds prior to liberation during the 1954 campaign.
 */
export function createFrenchFlagTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const bandW = canvas.width / 3;
    ctx.fillStyle = '#002395';
    ctx.fillRect(0, 0, Math.ceil(bandW), canvas.height);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(Math.floor(bandW), 0, Math.ceil(bandW), canvas.height);
    ctx.fillStyle = '#ED2939';
    ctx.fillRect(Math.floor(bandW * 2), 0, Math.ceil(bandW) + 2, canvas.height);

    // Subtle fabric weave shading
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < 256; x += 28) {
      ctx.fillRect(x, 0, 10, 170);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(anisotropy, 8);
  return texture;
}

/**
 * Soft radial contact shadow disc texture so grounded actors & cannons have crisp grounding.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 25, 15, 0.52)');
    grad.addColorStop(0.55, 'rgba(15, 25, 15, 0.22)');
    grad.addColorStop(1, 'rgba(15, 25, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
