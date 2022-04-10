const canvas = document.getElementById("canvas")
const MAX_TEXTURE_SIZE = 1024
{
    var width = canvas.clientWidth
    var height = canvas.clientHeight
    const ratio = width / height
    if (width > MAX_TEXTURE_SIZE && ratio > 1) {
        width = MAX_TEXTURE_SIZE
        height = Math.floor(width / ratio)
    }
    else if (height > MAX_TEXTURE_SIZE && ratio < 1) {
        height = MAX_TEXTURE_SIZE
        width = Math.floor(height * ratio)
    }
}
canvas.width = width
canvas.height = height 

const gl = canvas.getContext("webgl") 
gl.viewport(0, 0, width, height)
gl.enable(gl.BLEND)
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)


const RE_UNIFORM = /uniform (?<type>\w+) (?<name>\w+)(?:\[(?<array>\d+)\])?;/

const UNIFORM_TO_SUFFIX = {
	'float': '1f',
	'vec2': '2f',
	'vec3': '3f'
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_coordinates;
varying vec2 position;

void main(void){
    position = (a_coordinates + 1.0) / 2.0;
	gl_Position = vec4(a_coordinates, 1.0, 1.0);
}`

const RENDER_FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D u_input;
varying vec2 position;

void main(void){
	gl_FragColor = texture2D(u_input, position);
}    
`
{
    const VERTICIES = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        1.0,  1.0
    ])
    var VERTEX_BUFFER = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, VERTEX_BUFFER);
    gl.bufferData(gl.ARRAY_BUFFER, VERTICIES, gl.STATIC_DRAW); 
}

function logShaderInfo(shader) {
    if(gl.getShaderInfoLog(shader)){
        console.warn(gl.getShaderInfoLog(shader))
    }
}

function createShader(type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    logShaderInfo(shader)
    return shader
}

function createTexture(width, height) {
    const tx = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tx)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    return tx
}

function copyPixelsToTexture(pixels, texture, width, height) {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, 
        gl.UNSIGNED_BYTE, pixels)
}

function createProgram(vertexShaderSource, fragmentShaderSource) {
    const program = gl.createProgram()
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource))
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource))
    gl.linkProgram(program)
    return program
}

function setUniform(program, name, suffix, ...args) {
    const location = gl.getUniformLocation(program, name)
    gl[`uniform${suffix}`](location, ...args)
}

function setTexture(program, name, index, texture) {
    const location = gl.getUniformLocation(program, name)
    gl.uniform1i(location, index)
    gl.activeTexture(gl.TEXTURE0 + index)
    gl.bindTexture(gl.TEXTURE_2D, texture)
}

function setVertexAttribute(program, name, vertexBuffer) {
    const location = gl.getAttribLocation(program, name)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
}

function draw(framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

function createRenderer() {
    const pg = createProgram(VERTEX_SHADER_SOURCE, RENDER_FRAGMENT_SHADER_SOURCE)
    setVertexAttribute(pg, "a_coordinates", VERTEX_BUFFER)
    return (texture, width, height) => {
        withProgram(pg, () => {
            setTexture(pg, "u_input", 0, texture)
            draw()
        })
    }
}


function parseUniforms(fragmentShaderSource) {
    const uniforms = fragmentShaderSource
        .split('\n')
        .filter(s => s != "")
        .map(line => line.match(RE_UNIFORM))
        .filter(line => line != undefined)
        .map(line => line.groups)
        .reduce((o, u) => {o[u.name] = u; return o}, {})

    Object.values(uniforms).forEach(uniform => {
        var suffix = UNIFORM_TO_SUFFIX[uniform.type]
        if (suffix && uniform.array) {
            suffix += 'v'
        }
        uniform.suffix = suffix
    })
    return uniforms
}

function setUniforms(pg, uniforms, uniformValues) {
    var textureIndex = 0
    Object.entries(uniformValues).forEach(([name, value]) => {
        const uniform = uniforms[name]
        if (uniform.type == "sampler2D") {
            setTexture(pg, name, textureIndex, value)
            textureIndex += 1
        }
        else {
            setUniform(pg, name, uniform.suffix, ...value)
        }
    })
}

function withProgram(pg, f) {
    gl.useProgram(pg)
    f()
    gl.useProgram(null)
}

async function fetchText(path) {
    const response = await fetch(path)
    return await response.text()
}

function copyTexture(a, b, width, height) {
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, a, 0)

    gl.bindTexture(gl.TEXTURE_2D, b)
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0)
}

function createShaderObject(source) {
    const pg = createProgram(VERTEX_SHADER_SOURCE, source)
    setVertexAttribute(pg, "a_coordinates", VERTEX_BUFFER)

    const uniforms = parseUniforms(source)
    var uniformValues = {}

    return {
        updateUniforms(newUniformValues) {
            Object.assign(uniformValues, newUniformValues)
        },
        drawTexture(tx) {
            withProgram(pg, () => {
                const fb = gl.createFramebuffer()
                gl.bindTexture(gl.TEXTURE_2D, tx)
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
                    gl.TEXTURE_2D, tx, 0)
 
                setUniforms(pg, uniforms, uniformValues)
                gl.drawArrays(gl.TRIANGLES, 0, 6)
            })
		}
	}
}

const MAX_TOUCHES = 5

function monitorTouches(canvas, onTouch) {
	const touches = new Array(MAX_TOUCHES)
	clearTouches()

	function clearTouches() {
		for (let i = 0; i < MAX_TOUCHES; i++) {
			touches[i] = {x:0, y:0, force: 0}
		}
	}
	
	function mapTouchEvent(e) {
        const r = canvas.getBoundingClientRect()
        const offsetX = e.clientX - r.left
        const offsetY = e.clientY - r.top
		const x = offsetX * canvas.width / canvas.clientWidth
		const y = (canvas.clientHeight - offsetY) * canvas.height / canvas.clientHeight
		return [x, y]
	}

	function updateMouse(e) {
		clearTouches()
		if ((e.buttons & 1) === 1) {
			const [x, y] = mapTouchEvent(e)
			touches[0] = {x, y, force:1}
		}
        onTouch([touches.flatMap(({x, y, force}) => [x, y, force])])
	}
	canvas.onmousedown = updateMouse
	canvas.onmousemove = updateMouse
	canvas.onmouseup = updateMouse

	function updateTouch(e) {
		e.preventDefault()
		clearTouches()
		Array.from(e.touches).forEach((touch, i) => {
			if (i < MAX_TOUCHES) {
				const [x, y] = mapTouchEvent(touch)
				touches[i] = {x, y, force: touch.force}
			}
		})
        onTouch([touches.flatMap(({x, y, force}) => [x, y, force])])
	}
	canvas.ontouchstart = updateTouch
	canvas.ontouchmove = updateTouch
	canvas.ontouchend = updateTouch
	canvas.ontouchcancel = updateTouch
	canvas.ontouchforcechange = updateTouch
	canvas.ongesturechange = (e) => {
		e.preventDefault()
	}	
}