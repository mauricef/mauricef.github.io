async function fetchText(path) {
	const response = await fetch(path)
	return await response.text()
}

function logShaderInfo(gl, shader) {
	if(gl.getShaderInfoLog(shader)){
		console.warn(gl.getShaderInfoLog(shader))
	}
}

function createShader(gl, type, source) {
	const shader = gl.createShader(type)
	gl.shaderSource(shader, source)
	gl.compileShader(shader)
	logShaderInfo(gl, shader)
	return shader
}

function createTexture(gl, width, height) {
	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	return tx
}

function createFramebuffer(gl, texture) {
	const framebuffer = gl.createFramebuffer()
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
	return framebuffer
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
	const program = gl.createProgram()
	gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource))
	gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))
	gl.linkProgram(program)
	return program
}

function setUniform(gl, program, name, type, ...args) {
    gl.useProgram(program)
    const location = gl.getUniformLocation(program, name)
    gl[`uniform${type}`](location, ...args)
    gl.useProgram(null)
}

function setTexture(gl, program, name, index, texture) {
	gl.useProgram(program)
	const location = gl.getUniformLocation(program, name)
	gl.uniform1i(location, index)
	gl.activeTexture(gl.TEXTURE0 + index)
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.useProgram(null)
}

function setVertexAttribute(gl, program, name, vertexBuffer) {
	gl.useProgram(program)
	const location = gl.getAttribLocation(program, name)
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
	gl.enableVertexAttribArray(location)
	gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
	gl.useProgram(program)
}

function draw(gl, program, framebuffer) {
    gl.useProgram(program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.useProgram(null)
}

function createVertexBuffer(gl) {
	const vertices = new Float32Array([
		-1.0, -1.0,
		1.0, -1.0,
		-1.0,  1.0,
		-1.0,  1.0,
		1.0, -1.0,
		1.0,  1.0
	])
	const vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); 
	return vertexBuffer
}

function copyFramebufferToTexture(gl, framebuffer, texture, width, height) {
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0)
}

const maxTouch = 5
const startTime = Date.now()
const width = innerWidth
const height = innerHeight
const canvas = document.getElementById("canvas")
canvas.width = width
canvas.height = height

const gl = canvas.getContext("webgl", { alpha: false }) 

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_coordinates;

void main(void){
	gl_Position = vec4(a_coordinates, 1.0, 1.0);
}`


const VERTEX_BUFFER = createVertexBuffer(gl)

function mapObject(o, f) {
	const o2 = {}
	Object.keys(o).forEach(k => {
		o2[k] = f(o[k])
	})
	return o2
}

function Program(gl, {source, size: {width, height}, inputs, parameters}) {
	const pg = createProgram(gl, VERTEX_SHADER_SOURCE, source)
	const tx = createTexture(gl, width, height)
	const tx2 = createTexture(gl, width, height)
	const fb = createFramebuffer(gl, tx)

	setVertexAttribute(gl, pg, "a_coordinates", VERTEX_BUFFER)
	
	return {
		tx,
		updateParameters(update) {
			Object.entries(update).forEach(([name, value]) => {
				const type = parameters[name]
				setUniform(gl, pg, name, type, ...value)
			})
		},
		execute() {
			Object.entries(inputs).forEach(([name, input], index) => {
				const itx = input ? input.tx : tx2
				setTexture(gl, pg, name, index, itx)
			})
			draw(gl, pg, fb)
			copyFramebufferToTexture(gl, fb, tx2, width, height)
		},
		render() {
			draw(gl, pg, null)
		},
	}
}

async function run() {
	const simulate = Program(gl, {
		source: await fetchText('shaders/simulate.glsl'),
		size: {width, height},
		inputs: {
			'u_backbuffer': null
		},
		parameters: {
			'u_resolution': '2f',
			'u_touch': '3fv',
			'u_time': '1f'
		}
	})
	const blur = Program(gl, {
		source: await fetchText('shaders/blur.glsl'),
		size: {width, height},
		inputs: {
			'u_input': simulate,
			'u_prev': null
		},
		parameters: {
			'u_resolution': '2f',
		}
	})
	const color = Program(gl, {
		source: await fetchText('shaders/color.glsl'),
		size: {width, height},
		inputs: {
			'u_input': blur,
		},
		parameters: {
			'u_resolution': '2f'
		}
	})
	
	const touches = monitorTouches(canvas, maxTouch)

	function render() {
		simulate.updateParameters({
			u_resolution: [width, height],
			u_touch: [touches.flatMap(({x, y, force}) => [x, y, force])],
			u_time: [(startTime - Date.now()) / 1000]
		})
		simulate.execute()

		blur.updateParameters({
			u_resolution: [width, height],
		})
		blur.execute()
		blur.render()

		// color.updateParameters({
		// 	u_resolution: [width, height],
		// })
		// color.render()

		requestAnimationFrame(render)
	}

	requestAnimationFrame(render)
}

var resizeId = 0
onresize = () => {
    clearTimeout(resizeId)
	resizeId = setTimeout(() => location.reload(), 500)
}

onorientationchange = () => {
	location.reload()	
}

run()
