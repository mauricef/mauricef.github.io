

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_coordinates;

void main(void){
	gl_Position = vec4(a_coordinates, 1.0, 1.0);
}`

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

function createFramebuffer(gl, width, height) {
	const texture = createTexture(gl, width, height)
	const framebuffer = gl.createFramebuffer()
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	return framebuffer
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
	const program = gl.createProgram()
	gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource))
	gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))
	gl.linkProgram(program)
	return program
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
	return [vertexBuffer, vertices.length / 2]
}

function copyFramebufferToTexture(gl, framebuffer, texture, width, height) {
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0)
}

function useProgram(gl, shaderProgram, {width, height, vertexBuffer, touches, startTime}) {
	gl.useProgram(shaderProgram)

	const aCoordinates = gl.getAttribLocation(shaderProgram, "a_coordinates");
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
	gl.enableVertexAttribArray(aCoordinates)
	gl.vertexAttribPointer(aCoordinates, 2, gl.FLOAT, false, 0, 0)

	const uResolution = gl.getUniformLocation(shaderProgram, "u_resolution")
	gl.uniform2f(uResolution, width, height)

	const uTouch = gl.getUniformLocation(shaderProgram, "u_touch")
	gl.uniform3fv(uTouch, touches.flatMap(({x, y, force}) => [x, y, force]))

	const uTime = gl.getUniformLocation(shaderProgram, "u_time")
	gl.uniform1f(uTime, (startTime - Date.now()) / 1000)
}

function monitorTouches(canvas, maxTouches) {
	const touches = new Array(maxTouches)

	function clearTouches() {
		for (let i = 0; i < maxTouches; i++) {
			touches[i] = {x:0, y:0, force: 0}
		}
	}
	
	function mapTouchEvent(e) {
		const x = e.clientX 
		const y = innerHeight - e.clientY
		return [x, y]
	}

	function updateMouse(e) {
		clearTouches()
		if ((e.buttons & 1) === 1) {
			const [x, y] = mapTouchEvent(e)
			touches[0] = {x, y, force:1}
		}
	}
	canvas.onmousedown = updateMouse
	canvas.onmousemove = updateMouse
	canvas.onmouseup = updateMouse

	function updateTouch(e) {
		e.preventDefault()
		clearTouches()
		Array.from(e.touches).forEach((touch, i) => {
			if (i < maxTouches) {
				const [x, y] = mapTouchEvent(touch)
				touches[i] = {x, y, force: touch.force}
			}
		})
	}
	canvas.ontouchstart = updateTouch
	canvas.ontouchmove = updateTouch
	canvas.ontouchend = updateTouch
	canvas.ontouchcancel = updateTouch
	canvas.ontouchforcechange = updateTouch
	canvas.ongesturechange = (e) => {
		e.preventDefault()
	}	

	clearTouches()
	return touches
}

async function run(path) {
	const maxTouch = 5
	const startTime = Date.now()
	const width = innerWidth
	const height = innerHeight
	const canvas = document.getElementById("canvas")
	canvas.width = width
	canvas.height = height

	const gl = canvas.getContext("webgl") 

	const simulateFragmentShaderSource = await fetchText(path + '/simulate.glsl')
	const simulateProgram = createProgram(gl, VERTEX_SHADER_SOURCE, simulateFragmentShaderSource)
	const u_backbuffer = gl.getUniformLocation(simulateProgram, 'u_backbuffer')

	const renderFragmentShaderSource = await fetchText(path + '/render.glsl')
	const renderProgram = createProgram(gl, VERTEX_SHADER_SOURCE, renderFragmentShaderSource)

	const [vertexBuffer, vertexBufferSize] = createVertexBuffer(gl)
	
	const tx = createTexture(gl, width, height)
	const fb = createFramebuffer(gl, width, height)

	const touches = monitorTouches(canvas, maxTouch)

	function useProgramWithContext(program) {
		useProgram(gl, program, {
			width, height, vertexBuffer, touches, startTime
		})
	}

	function simulate() {
		useProgramWithContext(simulateProgram)
		
		gl.useProgram(simulateProgram)
		gl.uniform1i(u_backbuffer, 1)
		gl.activeTexture(gl.TEXTURE0 + 1)
		gl.bindTexture(gl.TEXTURE_2D, tx)
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
		gl.drawArrays(gl.TRIANGLES, 0, vertexBufferSize)
		
		copyFramebufferToTexture(gl, fb, tx, width, height)
	}

	function render() {
		useProgramWithContext(renderProgram)
		gl.bindTexture(gl.TEXTURE_2D, tx)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.drawArrays(gl.TRIANGLES, 0, vertexBufferSize)
		requestAnimationFrame(render)
	}

	setInterval(simulate, 25)
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

run('game-of-life')
