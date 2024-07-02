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
        render: await fetchText('./glsl/render.frag')
    }
}

async function run() {
    const canvas = document.getElementById('c')
    const gl = canvas.getContext("webgl2") 
    const shaderText = await loadShaderText()
    const golPg = twgl.createProgramInfo(gl, [shaderText.vs, shaderText.gol])
    const renderPg = twgl.createProgramInfo(gl, [shaderText.vs, shaderText.render])
    const quad = twgl.createBufferInfoFromArrays(gl, {
        position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0]
    })

    const stats = Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    const config = {
        size: {width: 256, height: 256},
        stepsPerFrame: 1,
        reload: () => reload()
    }
    const gui = new dat.GUI()
    gui.add(config, 'stepsPerFrame')
    gui.add(config.size, 'width')
    gui.add(config.size, 'height')
    gui.add(config, 'reload')
    
    var first = true
    var size = null
    var stepsPerFrame = 0
    var buffers = null

    function reload() {
        const {width, height} = config.size
        stepsPerFrame = config.stepsPerFrame
        size = {width, height} 
        canvas.width = width
        canvas.height = height 
        gl.viewport(0, 0, width, height)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
        buffers = [Buffer(gl), Buffer(gl)]
        first = true
    }
    reload()
    
    function render(time) {
        for (var i = 0; i < stepsPerFrame; i++) {
            executeProgram(gl, golPg, quad, {
                u_first: first,
                u_time: time,
                u_prev: buffers[0],
                u_seed: first ? Math.random() : 0,
                u_resolution: [size.width, size.height],
            }, buffers[1])
            first = false
            buffers.reverse()
        }
        executeProgram(gl, renderPg, quad, {u_input: buffers[1]})
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
