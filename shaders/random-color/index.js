import {Zoomer} from './zoomer.js'

const vs = `
attribute vec4 position;
varying vec2 uv;

void main() {
    uv = position.xy * .5 + .5;
    gl_Position = position;
}
`
async function fetchText(path) {
    const response = await fetch(path)
    return response.text()
}

export var SHADERS = {}

const renderFs = `
precision mediump float;

varying vec2 uv;
uniform sampler2D u_input;

void main() {
    gl_FragColor = texture2D(u_input, uv);
}
`

export async function init(gl) {
    const quad = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
    })
    const renderPg = twgl.createProgramInfo(gl, [vs, renderFs])

    function executeProgram(pg, uniforms, outputBuffer) {
        Object.keys(uniforms).forEach(key => {
            const value = uniforms[key]
            if (value.hasOwnProperty('tex')) {
                uniforms[key] = value.tex
            }
        })
        const fbi = outputBuffer ? outputBuffer.fbi : null
        twgl.bindFramebufferInfo(gl, fbi)
        gl.useProgram(pg.program)
        twgl.setBuffersAndAttributes(gl, pg, quad)
        twgl.setUniforms(pg, uniforms)
        twgl.drawBufferInfo(gl, quad)
    }

    function Buffer() {
        const attachments = [{ minMag: gl.NEAREST, wrap: gl.REPEAT }]
        const fbi = twgl.createFramebufferInfo(gl, attachments, gl.canvas.width, gl.canvas.height);
        const tex = fbi.attachments[0]
        return {fbi: fbi, tex:tex}
    }

    function ShaderProgram(fs) {
        const pg = twgl.createProgramInfo(gl, [vs, fs])
        return (uniforms, outputBuffer) => executeProgram(pg, uniforms, outputBuffer)
    }

    async function loadShaderText(name) {
        const fs = await fetchText(`./glsl/${name}.glsl`)
        SHADERS[name] = ShaderProgram(fs)
    }
    SHADERS.createBuffer = Buffer
    SHADERS.createProgram = ShaderProgram
    SHADERS.render = function(buffer) {
        const uniforms = {u_input: buffer}
        executeProgram(renderPg, uniforms, null)
    }
}

function animate(f) {
    function innerAnimate(t) {
        f(t)
        requestAnimationFrame(innerAnimate)
    }
    requestAnimationFrame(innerAnimate)
}
function modulo(a, n) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
    return ((a % n ) + n ) % n
}

const u_seeds = [
    Math.random(),
    Math.random(),
    Math.random()
]
function createScene(fs, gl, resolution, shaders) {
    var buffers = [shaders.createBuffer(), shaders.createBuffer()]
    const pg = shaders.createProgram(fs)
    var first = true
    function render(time, pointerPos) {
        pg({
            u_first: first,
            u_time: time,
            u_pointer: pointerPos,
            u_prev: buffers[0],
            u_seed: Math.random(),
            u_seeds: u_seeds,
            u_resolution: resolution,
        }, buffers[1])
        first = false
        buffers.reverse()
        return buffers[0]
    }
    return {render}
}

async function loadScene() {
    const canvas = document.getElementById('c')


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
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // monitorPointers(canvas, (p) => pointer = p)

    async function load() {
        await init(gl)
        const fs = await fetchText('./fs.glsl')
        const resolution = [gl.canvas.width, gl.canvas.height]
        const scene = createScene(fs, gl, resolution, SHADERS)
        const zoomer = new Zoomer(gl, SHADERS)
        function render(time) {
            const resolution = zoomer.resolution
            const zoomScale = zoomer.zoomScale
            const zoomOffset = zoomer.zoomOffset
            const pointerPos = zoomer.pointerPos
            var x = pointerPos.x
            var y = pointerPos.y
            x *= resolution.width / zoomScale 
            y *= resolution.height / zoomScale
            x += zoomOffset.x
            y += zoomOffset.y
            x = modulo(x, resolution.width)
            y = modulo(y, resolution.height)
            const pp = zoomer.drawPointer ? [x,y] : [0, 0]
            const buffer = scene.render(time, pp)
            zoomer.render(buffer)
        }
        animate(render)
    }
    load()
}
loadScene()