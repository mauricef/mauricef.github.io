import {Zoomer} from './zoomer.js'
import Stats from './lib/stats.module.js'
import * as dat from './lib/dat.gui.module.js'

async function fetchText(path) {
    const response = await fetch(path)
    return response.text()
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

async function loadShaderText() {
    return {
        vs: await fetchText('./glsl/main.vert'),
        gol: await fetchText('./glsl/gol.frag'),
        zoom: await fetchText('./glsl/zoom.frag'),
        render: await fetchText('./glsl/render.frag')
    }
}

function loadContext(canvas, size) {
    const gl = canvas.getContext("webgl2") 
    const canvasClientSize = {width: canvas.clientWidth, height: canvas.clientHeight}
    const {width, height } = size
    // const {width, height} = limitSizeMaintainRatio(canvasClientSize, size)
    canvas.width = width
    canvas.height = height 
    gl.viewport(0, 0, width, height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    return [gl, {width, height}]
}

async function run() {
    const config = {
        size: {width: 1920, height: 1080}
    }

    const stats = Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    const gui = new dat.GUI()
    gui.add(config.size, 'width')
    gui.add(config.size, 'height')
    
    const canvas = document.getElementById('c')

    const shaderText = await loadShaderText()
    
    const [gl, {width, height}] = loadContext(canvas, config.size)


    const golPg = twgl.createProgramInfo(gl, [shaderText.vs, shaderText.gol])
    const zoomerPg = twgl.createProgramInfo(gl, [shaderText.vs, shaderText.zoom])
    const renderPg = twgl.createProgramInfo(gl, [shaderText.vs, shaderText.render])

    var buffers = [Buffer(gl), Buffer(gl)]
    var first = true
    const zoomer = new Zoomer(gl)
    const zoomerBuffer = Buffer(gl)

    const quad = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
    })
    


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
        for (var i=0; i < 64; i++) {
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
            buffers.reverse()
        }
        first = false
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
    function animationFrame(t) {
        stats.begin()
        render(t)
        stats.end()
        requestAnimationFrame(animationFrame)
    }
    requestAnimationFrame(animationFrame)
}
run()
