class Buffer {
    constructor(gl) {
        const attachments = [{ minMag: gl.NEAREST, wrap: gl.REPEAT }]
        this.fbi = twgl.createFramebufferInfo(gl, attachments, gl.canvas.width, gl.canvas.height);
        this.tex = this.fbi.attachments[0]
    }
}

class Program {
    constructor(gl, quad, vs, fs) {
        this.gl = gl
        this.quad = quad
        this.pg = twgl.createProgramInfo(gl, [vs, fs])
    }
    execute(uniforms, outputBuffer) {
        const {gl, quad, pg} = this
        Object.keys(uniforms).forEach(key => {
                const value = uniforms[key]
                if (value instanceof Buffer) {
                    uniforms[key] = value.tex
                }
            })
        if (outputBuffer) {
            twgl.bindFramebufferInfo(gl, outputBuffer.fbi)
        }
        else {
            twgl.bindFramebufferInfo(gl, null)
        }
        gl.useProgram(pg.program)
        twgl.setBuffersAndAttributes(gl, pg, quad)
        twgl.setUniforms(pg, uniforms)
        twgl.drawBufferInfo(gl, quad)
    }
}

export class Scene {
    VS = /*glsl*/`
        #version 300 es

        in vec4 position;
        out vec2 uv;

        void main() {
            uv = position.xy * .5 + .5;
            gl_Position = position;
        }
    `
    constructor(gl) {
        this.gl = gl
        this.quad = twgl.createBufferInfoFromArrays(gl, {
            position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
        })
    }
    program(fs) {
        return new Program(this.gl, this.quad, this.VS, fs)
    }
    buffer() {
        return new Buffer(this.gl)
    }
}
