import { fragmentSource, VERTEX_SRC } from "./glsl";
import { hexToRgb, type Family, type ShaderConfig } from "./schema";

const UNIFORM_NAMES = [
  "u_res",
  "u_phase",
  "u_speed",
  "u_seed",
  "u_colors",
  "u_ncolors",
  "u_scale",
  "u_complexity",
  "u_warp",
  "u_grain",
  "u_vignette",
] as const;

type UniformMap = Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation | null>;

export class ShaderRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private family: Family | null = null;
  private uniforms: UniformMap | null = null;

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    opts: { preserveDrawingBuffer?: boolean } = {},
  ) {
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      depth: false,
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 is not supported in this browser");
    if (gl.isContextLost()) throw new Error("WebGL context is lost");
    this.gl = gl;
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return shader;
  }

  private useFamily(family: Family) {
    if (this.family === family && this.program) return;
    const gl = this.gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragmentSource(family));
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${log}`);
    }
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    this.family = family;
    this.uniforms = Object.fromEntries(
      UNIFORM_NAMES.map((n) => [n, gl.getUniformLocation(program, n)]),
    ) as UniformMap;
  }

  /** Renders one frame at the given loop phase (0..1). Deterministic: the same
   *  config + phase + size always produces identical pixels. */
  render(config: ShaderConfig, phase: number, width: number, height: number) {
    const gl = this.gl;
    this.useFamily(config.family);
    if (gl.canvas.width !== width) gl.canvas.width = width;
    if (gl.canvas.height !== height) gl.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    const u = this.uniforms!;
    gl.uniform2f(u.u_res, width, height);
    gl.uniform1f(u.u_phase, phase - Math.floor(phase));
    gl.uniform1f(u.u_speed, config.speed);
    gl.uniform1f(u.u_seed, config.seed);
    const flat = new Float32Array(18);
    config.colors.forEach((c, i) => flat.set(hexToRgb(c), i * 3));
    gl.uniform3fv(u.u_colors, flat);
    gl.uniform1i(u.u_ncolors, config.colors.length);
    gl.uniform1f(u.u_scale, config.scale);
    gl.uniform1f(u.u_complexity, config.complexity);
    gl.uniform1f(u.u_warp, config.warp);
    gl.uniform1f(u.u_grain, config.grain);
    gl.uniform1f(u.u_vignette, config.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /**
   * `releaseContext: false` is for canvases that may be re-mounted (React
   * StrictMode runs mount→unmount→mount on the same element, and a canvas
   * whose context was force-lost hands that same dead context to the next
   * renderer). Detached export canvases should pass true to free GPU memory
   * immediately.
   */
  dispose(opts: { releaseContext?: boolean } = {}) {
    if (this.program) this.gl.deleteProgram(this.program);
    this.program = null;
    this.family = null;
    if (opts.releaseContext ?? true) {
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }
}
