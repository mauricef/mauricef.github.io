import {Zoomer} from './zoomer.js'

async function fetchText(path) {
    const response = await fetch(path)
    return response.text()
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

function limitSizeMaintainRatio(size, maxSize) {
    const maxWidth = maxSize.width, maxHeight = maxSize.height
    var {width, height} = size
    const ratio = width / height
    if (width > maxWidth && ratio > 1) {
        width = maxWidth
        height = Math.floor(width / ratio)
    }
    else if (height > maxHeight) {
        height = maxHeight
        width = Math.floor(height * ratio)
    }
    return {width, height}
}

function Buffer(gl) {
    const attachments = [{ minMag: gl.NEAREST, wrap: gl.REPEAT }]
    const fbi = twgl.createFramebufferInfo(gl, attachments, gl.canvas.width, gl.canvas.height)
    const tex = fbi.attachments[0]
    return {fbi: fbi, tex:tex}
}

function executeProgram(gl, pg, buffers, uniforms, outputBuffer) {
    Object.keys(uniforms).forEach(key => {
        const value = uniforms[key]
        if (value.hasOwnProperty('tex')) {
            uniforms[key] = value.tex
        }
    })
    const fbi = outputBuffer ? outputBuffer.fbi : null
    twgl.bindFramebufferInfo(gl, fbi)
    gl.useProgram(pg.program)
    twgl.setBuffersAndAttributes(gl, pg, buffers)
    twgl.setUniforms(pg, uniforms)
    twgl.drawBufferInfo(gl, buffers)
}

const MAX_TEXTURE_SIZE = {width: 512, height: 512}

async function run() {
    const canvas = document.getElementById('c')
    const gl = canvas.getContext("webgl2") 
    const canvasClientSize = {width: canvas.clientWidth, height: canvas.clientHeight}
    const {width, height} = limitSizeMaintainRatio(canvasClientSize, MAX_TEXTURE_SIZE)
    canvas.width = width
    canvas.height = height 
    gl.viewport(0, 0, width, height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const vs = await fetchText('./glsl/main.vert')
    const golFs = await fetchText('./glsl/gol.frag')
    const golPg = twgl.createProgramInfo(gl, [vs, golFs])
    const zoomerFs = await fetchText('./glsl/zoom.frag')
    const zoomerPg = twgl.createProgramInfo(gl, [vs, zoomerFs])
    const renderFs = await fetchText('./glsl/render.frag')
    const renderPg = twgl.createProgramInfo(gl, [vs, renderFs])
    const quad = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
    })
    var buffers = [Buffer(gl), Buffer(gl)]
    var first = true
    const zoomer = new Zoomer(gl)
    const zoomerBuffer = Buffer(gl)

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
        const uniforms = {
            u_first: first,
            u_time: time,
            u_pointer: pp,
            u_prev: buffers[0],
            u_seed: Math.random(),
            u_seeds: [
                Math.random(),
                Math.random(),
                Math.random()
            ],
            u_resolution: [width, height],
        }
        const outputBuffer = buffers[1]
        executeProgram(gl, golPg, quad, uniforms, outputBuffer)
        first = false
        buffers.reverse()
        const buffer =  buffers[0]
        executeProgram(gl, zoomerPg, quad, {
            u_input: buffer,
            offset: [
                zoomer.zoomOffset.x / zoomer.resolution.width,
                zoomer.zoomOffset.y / zoomer.resolution.height
            ],
            scale: [
                zoomer.resolution.width * zoomer.zoomScale,
                zoomer.resolution.height * zoomer.zoomScale
            ],
        }, zoomerBuffer)
        executeProgram(gl, renderPg, quad, {u_input: zoomerBuffer})
    }
    animate(render)
}
run()