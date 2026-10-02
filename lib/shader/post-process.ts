import { VERTEX_SRC } from "./glsl";
import type { ShaderEffects } from "./schema";

const BLUR_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_res;
uniform vec2 u_step;
uniform float u_lod;
uniform bool u_extract;
out vec4 fragColor;
vec3 sampleLight(vec2 uv) {
  vec3 col = textureLod(u_image, uv, u_lod).rgb;
  if (u_extract) col *= smoothstep(0.4, 0.9, max(max(col.r, col.g), col.b));
  return col;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 col = sampleLight(uv) * 0.2270270270;
  col += (sampleLight(uv + u_step * 1.3846153846)
    + sampleLight(uv - u_step * 1.3846153846)) * 0.3162162162;
  col += (sampleLight(uv + u_step * 3.2307692308)
    + sampleLight(uv - u_step * 3.2307692308)) * 0.0702702703;
  fragColor = vec4(col, 1.0);
}
`;

const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform sampler2D u_blurred;
uniform sampler2D u_bloom;
uniform vec2 u_res;
uniform bool u_use_blur;
uniform float u_glow;
uniform float u_saturation;
uniform float u_contrast;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 col = u_use_blur ? texture(u_blurred, uv).rgb : texture(u_image, uv).rgb;
  if (u_glow > 0.0) col += texture(u_bloom, uv).rgb * u_glow * 1.5;
  float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(grey), col, u_saturation);
  col = (col - 0.5) * u_contrast + 0.5;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

interface Pass {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

/** Spatial effects on the completed frame; no time or previous-frame state. */
export class ShaderPostProcessor {
  private targets = new Map<string, Target>();
  private blurPass: Pass;
  private compositePass: Pass;

  constructor(private gl: WebGL2RenderingContext) {
    this.blurPass = this.pass(BLUR_FRAGMENT, ["u_image", "u_res", "u_step", "u_lod", "u_extract"]);
    try {
      this.compositePass = this.pass(COMPOSITE_FRAGMENT, ["u_image", "u_blurred", "u_bloom", "u_res", "u_use_blur", "u_glow", "u_saturation", "u_contrast"]);
    } catch (error) {
      gl.deleteProgram(this.blurPass.program);
      throw error;
    }
  }

  private pass(fragment: string, names: string[]): Pass {
    const gl = this.gl;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram()!;
    try {
      for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SRC], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type)!;
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Effect shader compile failed: ${gl.getShaderInfoLog(shader)}`);
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Effect shader link failed: ${gl.getProgramInfoLog(program)}`);
      return { program, uniforms: Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) };
    } catch (error) {
      gl.deleteProgram(program);
      throw error;
    } finally {
      for (const shader of shaders) gl.deleteShader(shader);
    }
  }

  private target(key: string, width: number, height: number): Target {
    const existing = this.targets.get(key);
    if (existing?.width === width && existing.height === height) return existing;
    const gl = this.gl;
    if (existing) {
      gl.deleteFramebuffer(existing.framebuffer);
      gl.deleteTexture(existing.texture);
      this.targets.delete(key);
    }
    const texture = gl.createTexture()!;
    const framebuffer = gl.createFramebuffer()!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new Error("Unable to create the effects render target");
    }
    const target = { texture, framebuffer, width, height };
    this.targets.set(key, target);
    return target;
  }

  begin(width: number, height: number) {
    const target = this.target("scene", width, height);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer);
    this.gl.viewport(0, 0, width, height);
  }

  private blur(source: Target, key: string, radius: number, extract: boolean): Target {
    const gl = this.gl;
    // Mip filtering averages fine detail before wide sampling. Reduced targets
    // keep large-radius blur smooth without repeating the expensive scene shader.
    const lod = Math.max(0, Math.log2(Math.max(radius / 2, 1)));
    const divisor = 2 ** Math.floor(lod);
    const width = Math.max(1, Math.ceil(source.width / divisor));
    const height = Math.max(1, Math.ceil(source.height / divisor));
    const horizontal = this.target(`${key}-x`, width, height);
    const vertical = this.target(`${key}-y`, width, height);
    const u = this.blurPass.uniforms;
    gl.useProgram(this.blurPass.program);
    gl.uniform1i(u.u_image, 0);
    gl.uniform2f(u.u_res, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal.framebuffer);
    gl.viewport(0, 0, width, height);
    gl.uniform1f(u.u_lod, lod);
    gl.uniform1i(u.u_extract, extract ? 1 : 0);
    gl.uniform2f(u.u_step, radius / 3.2307692308 / source.width, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, horizontal.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vertical.framebuffer);
    gl.uniform1f(u.u_lod, 0);
    gl.uniform1i(u.u_extract, 0);
    gl.uniform2f(u.u_step, 0, radius / 3.2307692308 / source.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return vertical;
  }

  finish(effects: Readonly<ShaderEffects>, width: number, height: number) {
    const gl = this.gl;
    const scene = this.targets.get("scene")!;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    if (effects.blur > 0 || effects.glow > 0) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    // Radius is relative to the frame's shorter side, matching preview/export
    // and keeping the same look at different resolutions and aspect ratios.
    const scale = Math.min(width, height) / 1080;
    const blurred = effects.blur > 0 ? this.blur(scene, "blur", effects.blur * 48 * scale, false) : scene;
    const bloom = effects.glow > 0 ? this.blur(scene, "bloom", 24 * scale, true) : scene;
    const u = this.compositePass.uniforms;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.compositePass.program);
    for (const [unit, target, name] of [[0, scene, "u_image"], [1, blurred, "u_blurred"], [2, bloom, "u_bloom"]] as const) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.uniform1i(u[name], unit);
    }
    gl.uniform2f(u.u_res, width, height);
    gl.uniform1i(u.u_use_blur, effects.blur > 0 ? 1 : 0);
    gl.uniform1f(u.u_glow, effects.glow);
    gl.uniform1f(u.u_saturation, effects.saturation);
    gl.uniform1f(u.u_contrast, effects.contrast);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    for (const target of this.targets.values()) {
      this.gl.deleteFramebuffer(target.framebuffer);
      this.gl.deleteTexture(target.texture);
    }
    this.targets.clear();
    this.gl.deleteProgram(this.blurPass.program);
    this.gl.deleteProgram(this.compositePass.program);
  }
}
