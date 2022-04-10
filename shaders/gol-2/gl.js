

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

export function createTexture(gl, width, height) {
	const pixels = new ArrayBuffer(4 * width * height)
	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			const index = (i * 20 + j) * 4
			pixels[index + 0] = 100
			pixels[index + 1] = 200
			pixels[index + 2] = 50
			pixels[index + 3] = 255
		}
	}
	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
		new Uint8Array(pixels));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	return tx
}

export function createFramebuffer(gl, texture) {
	const framebuffer = gl.createFramebuffer()
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
	return framebuffer
}

export function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
	const program = gl.createProgram()
	gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource))
	gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource))
	gl.linkProgram(program)
	return program
}

export function setUniform(gl, program, name, suffix, ...args) {
    const location = gl.getUniformLocation(program, name)
    gl[`uniform${suffix}`](location, ...args)
}

export function setTexture(gl, program, name, index, texture) {
	const location = gl.getUniformLocation(program, name)
	gl.uniform1i(location, index)
	gl.activeTexture(gl.TEXTURE0 + index)
	gl.bindTexture(gl.TEXTURE_2D, texture)
}

export function setVertexAttribute(gl, program, name, vertexBuffer) {
	const location = gl.getAttribLocation(program, name)
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
	gl.enableVertexAttribArray(location)
	gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
}

export function draw(gl, framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_coordinates;

void main(void){
	gl_Position = vec4(a_coordinates, 1.0, 1.0);
}`

const RENDER_FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D u_input;
uniform vec2 u_resolution;

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution;
	gl_FragColor = texture2D(u_input, position);
}    
`

export function createRenderer(gl) {
    const pg = createProgram(gl, VERTEX_SHADER_SOURCE, RENDER_FRAGMENT_SHADER_SOURCE)
    const vb = createVertexBuffer(gl)
    setVertexAttribute(gl, pg, "a_coordinates", vb)
    return function render(texture, {width, height}) {
        gl.useProgram(pg)
		setUniform(gl, pg, "u_resolution", "2f", width, height)
        setTexture(gl, pg, "u_input", 0, texture)
        draw(gl)
        gl.useProgram(null)
    }
}

export function createVertexBuffer(gl) {
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

export function copyFramebufferToTexture(gl, framebuffer, texture, width, height) {
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0)
}

const RE_UNIFORM = /uniform (?<type>\w+) (?<name>\w+)(?:\[(?<array>\d+)\])?;/

const UNIFORM_TO_SUFFIX = {
	'float': '1f',
	'vec2': '2f',
	'vec3': '3f'
}

export function parseUniforms(fragmentShaderSource) {
    return fragmentShaderSource
		.split('\n')
		.filter(s => s != "")
		.map(line => line.match(RE_UNIFORM))
		.filter(line => line != undefined)
		.map(line => line.groups)
		.reduce((o, u) => {o[u.name] = u; return o}, {})
}

export function uniformToMethodSuffix(uniform) {
	var suffix = UNIFORM_TO_SUFFIX[uniform.type]
	if (uniform.array) {
		suffix += 'v'
	}
	return suffix
}