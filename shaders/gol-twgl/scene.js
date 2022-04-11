class Buffer {
    constructor(gl) {
        const attachments = [{ minMag: gl.NEAREST, wrap: gl.REPEAT }]
        this.fbi = twgl.createFramebufferInfo(gl, attachments, gl.canvas.width, gl.canvas.height);
        this.tex = this.fbi.attachments[0]
    }
}

class DoubleBuffer {
    constructor(gl) {
        this.buffers = [new Buffer(gl), new Buffer(gl)]
    }
    get read() {
        return this.buffers[0]
    }
    get write() {
        return this.buffers[1]
    }
    swap() {
        this.buffers.reverse()
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
                if (value instanceof DoubleBuffer) {
                    uniforms[key] = value.read.tex
                }
            })
        if (outputBuffer) {
            twgl.bindFramebufferInfo(gl, outputBuffer.write.fbi)
            outputBuffer.swap()
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
        attribute vec4 position;
        varying vec2 uv;

        void main() {
            uv = position.xy * .5 + .5;
            gl_Position = position;
        }
    `
    constructor(canvas) {
        this.canvas = canvas
        const MAX_TEXTURE_SIZE = 1024
        {
            var width = canvas.clientWidth
            var height = canvas.clientHeight
            const ratio = width / height
            if (width > MAX_TEXTURE_SIZE && ratio > 1) {
                width = MAX_TEXTURE_SIZE
                height = Math.floor(width / ratio)
            }
            else if (height > MAX_TEXTURE_SIZE) {
                height = MAX_TEXTURE_SIZE
                width = Math.floor(height * ratio)
            }
        }
        canvas.width = width
        canvas.height = height 

        const gl = canvas.getContext("webgl2") 
        gl.viewport(0, 0, width, height)
        this.gl = gl
        this.quad = twgl.createBufferInfoFromArrays(gl, {
            position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
        })
    }
    program(fs) {
        return new Program(this.gl, this.quad, this.VS, fs)
    }
    buffer() {
        return new DoubleBuffer(this.gl)
    }
}
