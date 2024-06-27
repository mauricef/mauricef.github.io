import {Stats} from './Stats.js'
import * as dat from './dat.gui.module.js';

function scaleByPixelRatio (input) {
    let pixelRatio = window.devicePixelRatio || 1
    return Math.floor(input * pixelRatio)
}

export function monitorMouse(canvas) {
    let pointer = {
        pt: [0, 0],
        down: false
    }
    
    canvas.addEventListener('mousedown', e => {
        let posX = scaleByPixelRatio(e.offsetX)
        let posY = scaleByPixelRatio(e.offsetY)
        pointer.down = true
        pointer.pt[0] = posX / canvas.width
        pointer.pt[1] = 1.0 - posY / canvas.height
    })

    canvas.addEventListener('mousemove', e => {
        if (!pointer.down) return;
        let posX = scaleByPixelRatio(e.offsetX);
        let posY = scaleByPixelRatio(e.offsetY);
        pointer.pt[0] = posX / canvas.width
        pointer.pt[1] = 1.0 - posY / canvas.height
    })

    window.addEventListener('mouseup', () => {
        pointer.down = false
    })

    canvas.addEventListener('touchstart', e => {
        e.preventDefault()
        let touches = e.targetTouches
        let touch = touches[0]
        let posX = scaleByPixelRatio(touch.pageX)
        let posY = scaleByPixelRatio(touch.pageY)
        pointer.down = true
        pointer.pt[0] = posX / canvas.width
        pointer.pt[1] = 1.0 - posY / canvas.height
    });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        e.preventDefault()
        let touches = e.targetTouches
        let touch = touches[0]
        let posX = scaleByPixelRatio(touch.pageX)
        let posY = scaleByPixelRatio(touch.pageY)
        pointer.pt[0] = posX / canvas.width
        pointer.pt[1] = 1.0 - posY / canvas.height
    }, false);

    window.addEventListener('touchend', e => {
        pointer.down = false
    });

    return pointer
}
function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(program)
    }

    return program
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(shader)
    }

    return shader
}

function Program(gl, vertexShader, fragmentShader) {
    const pg = createProgram(gl, vertexShader, fragmentShader)
    const uniforms = getUniforms(gl, pg)
    function render(uniformValues, target) {
        gl.useProgram(pg)
        setUniforms(gl, uniforms, uniformValues)
        const hasOutputAsInput = Object.values(uniformValues).indexOf(target) != -1
        if (hasOutputAsInput) {
            target.swap()
        }
        
        if (target == null)
        {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }
        else
        {
            gl.viewport(0, 0, target.width, target.height)
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.curr.fbo)
        }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
        gl.useProgram(null)
    }
    return {
        render,
        uniforms
    }
}

function Scene(canvas, size) {
    const gl = canvas.getContext('webgl')

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    return {
        program({vertexShaderSource, fragmentShaderSource}) {
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
            return Program(gl, vertexShader, fragmentShader)
        },
        texture(args) {
            args = args || {}
            args.gl = gl
            args.size = size
            return Texture(args)
        }
    }
}
function createResources({module, scene}) {
    const textures = {}
    Object.entries(module.textures).forEach(([name, config]) => {
        textures[name] = scene.texture(config)
    })
    const programs = {}
    Object.entries(module.programs).forEach(([name, config]) => {
        programs[name] = scene.program(config)
    })
    return {textures, programs}
}

const config = {
    size: 256
}

export async function run({canvas, moduleUri}) {
    canvas.width = scaleByPixelRatio(canvas.clientWidth)
    canvas.height = scaleByPixelRatio(canvas.clientHeight)
    
    const pointer = monitorMouse(canvas)
    const scene = new Scene(canvas, config.size)
    const module = await import(moduleUri)
    const resources = createResources({module, scene})
    const aspectRatio = canvas.width / canvas.height
    const context = {aspectRatio}
    Object.assign(context, resources)
    const simulation = await module.create(context)


    async function update(t) {
        stats.begin()
        const mousePt = pointer.down ? pointer.pt : null
        simulation.step({t, mousePt})
        stats.end()
        requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
    return scene


function getResolution(gl, resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else
        return { width: min, height: max };
}

const RE_UNIFORM = /(?<name>\w+)(?:\[(?<array>\d+)\])?/

function getUniforms(gl, pg) {
    const setters = {
        [gl.FLOAT]: 'uniform1f',
        [gl.FLOAT_VEC2]: 'uniform2f',
        [gl.FLOAT_VEC3]: 'uniform3f',
        [gl.FLOAT_VEC4]: 'uniform4f',
        [gl.INT]: 'uniform1i',
        [gl.INT_VEC2]: 'uniform2i',
        [gl.INT_VEC3]: 'uniform3i',
        [gl.INT_VEC4]: 'uniform4i'
    }
    let uniforms = {}
    let uniformCount = gl.getProgramParameter(pg, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformCount; i++) {
        let info = gl.getActiveUniform(pg, i)
        let match = info.name.match(RE_UNIFORM).groups
        let name = match.name
        uniforms[name] = {
            type: info.type,
            isArray: match.array != null,
            location: gl.getUniformLocation(pg, info.name),
            setterName: setters[info.type]
        }
    }
    return uniforms
}

function setUniforms(gl, uniforms, uniformValues) {
    var textureIndex = 0
    Object.entries(uniformValues).forEach(([name, value]) => {
        if (value != null) {
            let {type, isArray, location, setterName} = uniforms[name]
            if (type == gl.SAMPLER_2D) {
                gl.uniform1i(location, textureIndex)
                gl.activeTexture(gl.TEXTURE0 + textureIndex)
                gl.bindTexture(gl.TEXTURE_2D, value.curr.texture)
                textureIndex += 1
            }
            else {
                if (isArray) {
                    setterName += 'v'
                }
                let setter = gl[setterName].bind(gl)
                value = Array.isArray(value) ? value : [value]
                setter(location, ...value)
            }
        }
    })
}

function createFBO(gl, width, height, {filter}) {
    filter = gl[filter]
    const halfFloat = gl.getExtension('OES_texture_half_float').HALF_FLOAT_OES
    gl.getExtension('OES_texture_half_float_linear')

    gl.activeTexture(gl.TEXTURE0)
    let texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, halfFloat, null)

    let fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    return {
        texture,
        fbo,
        width,
        height
    }
}

function Texture(args) {
    const {gl, size} = args
    const {width, height} = getResolution(gl, size)
    let prev = createFBO(gl, width, height, args)
    let curr = createFBO(gl, width, height, args)
    return {
        width,
        height,
        get curr() {
            return curr
        },
        swap () {
            let temp = prev
            prev = curr
            curr = temp
        },
        writePixels(pixels) {
            gl.bindTexture(gl.TEXTURE_2D, curr.texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, 
                gl.UNSIGNED_BYTE, pixels)
        }
    }
}

const gui = new dat.GUI();
const stats = new Stats();

document.body.appendChild( stats.dom );
stats.showPanel(0)
const canvas = document.getElementById("main-canvas")
const scene = run({canvas, moduleUri: './gol.js'}) 