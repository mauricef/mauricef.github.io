
export async function fetchText(url) {
    var response = await fetch(url)
    var text = await response.text()
    return text
}

export function canvasPixelPositionFromMouseEvent(e) {
    const canvas = e.target
    const canvasRect = canvas.getBoundingClientRect()
    var x = e.clientX - canvasRect.left
    x /= canvas.clientWidth
    x *= canvas.width
    x = Math.floor(x)
    var y = e.clientY - canvasRect.top
    y /= canvas.clientHeight
    y = 1-y
    y *= canvas.height
    y = Math.floor(y)
    return {x, y}
}

export function readPixelValueFromFrameBuffer(gl, framebuffer, pos) {
    const outputBuffer = new Uint8Array(4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.readPixels(pos.x, pos.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, outputBuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)    
    return outputBuffer
}

export class Context {
    constructor({canvas, vss}) {
        this.canvas = canvas
        this.vss = vss
        this.gl = canvas.getContext("webgl2")
        this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, {
            a_position: {
                numComponents: 2,
                data: [-1, -1, -1, 1, 1, -1, 1, -1, 1, 1, -1, 1]
            }
        })
    }
    async createProgram(fssPath) {
        const fss = await fetchText(fssPath)
        const programInfo = twgl.createProgramInfo(this.gl, [this.vss, fss])
        twgl.setBuffersAndAttributes(this.gl, programInfo, this.bufferInfo)
        return new Program({context:this, programInfo})
    }

}

class Buffer {

}

export class SingleBuffer extends Buffer {
    constructor(gl) {
        super()
        const attachments = [{ minMag: gl.NEAREST, wrap: gl.REPEAT }]
        this.fbi = twgl.createFramebufferInfo(gl, attachments, gl.canvas.width, gl.canvas.height)
        this.tex = this.fbi.attachments[0]
    }
    get read() {
        return this.tex
    }
    get write() {
        return this.fbi
    }
}

export class DoubleBuffer extends Buffer {
    constructor(gl) {
        super()
        this.buffers = [new SingleBuffer(gl), new SingleBuffer(gl)]
    }
    get read() {
        return this.buffers[0].read
    }
    get write() {
        return this.buffers[1].write
    }
    flip() {
        this.buffers.reverse()
    }
}

class Program {
    constructor({context, programInfo}) {
        this.context = context
        this.gl = context.gl
        this.bufferInfo = context.bufferInfo
        this.programInfo = programInfo
    }
    execute(outputTexture, uniforms) {
        const fbi = outputTexture ? outputTexture.write : null
        const localUniforms = {}
        var hasSelfReference = false
        for (const key in uniforms) {
            var value = uniforms[key]
            if (value instanceof Buffer) {
                if (value == outputTexture) {
                    hasSelfReference = true
                }
                value = value.read
            }
            localUniforms[key] = value
        }
        this.gl.useProgram(this.programInfo.program)
        twgl.setUniforms(this.programInfo, localUniforms)
        twgl.bindFramebufferInfo(this.gl, fbi)
        twgl.drawBufferInfo(this.gl, this.bufferInfo)
        if (hasSelfReference) {
            outputTexture.flip()
        }    
    }
}
