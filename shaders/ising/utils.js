export async function fetchText(path) {
    const response = await fetch(path)
    return await response.text()
}

const MAX_TEXTURE_SIZE = 1024
export function resizeCanvas(canvas) {
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
	canvas.width = width
	canvas.height = height
}

export function reloadOnResize() {
	var resizeId = 0
	window.onresize = () => {
		clearTimeout(resizeId)
		resizeId = setTimeout(() => location.reload(), 500)
	}

	window.onorientationchange = () => {
		location.reload()	
	}  
}

const RE_UNIFORM = /uniform (?<type>\w+) (?<name>\w+)(?:\[(?<array>\d+)\])?;/

const UNIFORM_TO_SUFFIX = {
	'float': '1f',
	'vec2': '2f',
	'vec3': '3f'
}

const VERTEX_SHADER_SOURCE = `
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

export function createGL(gl) {
	return {
		VERTEX_SHADER_SOURCE: `
			attribute vec2 a_coordinates;

			void main(void){
				gl_Position = vec4(a_coordinates, 1.0, 1.0);
			}`
		,
		logShaderInfo(shader) {
			if(gl.getShaderInfoLog(shader)){
				console.warn(gl.getShaderInfoLog(shader))
			}
		},
		createShader(type, source) {
			const shader = gl.createShader(type)
			gl.shaderSource(shader, source)
			gl.compileShader(shader)
			this.logShaderInfo(shader)
			return shader
		},
		createTexture(width, height) {
			const tx = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tx);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			return tx
		},
		copyPixelsToTexture(texture, pixels, width, height) {
			gl.bindTexture(gl.TEXTURE_2D, texture)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, 
				gl.UNSIGNED_BYTE, pixels)
		},
		copyPixelsToSubTexture(texture, pixels, x, y, width, height) {
			gl.bindTexture(gl.TEXTURE_2D, texture)
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, width, height, gl.RGBA, 
				gl.UNSIGNED_BYTE, pixels)
		},
		createFramebuffer(texture) {
			const framebuffer = gl.createFramebuffer()
			gl.bindTexture(gl.TEXTURE_2D, texture)
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
			return framebuffer
		},
		createProgram(vertexShaderSource, fragmentShaderSource) {
			const program = gl.createProgram()
			gl.attachShader(program, this.createShader(gl.VERTEX_SHADER, vertexShaderSource))
			gl.attachShader(program, this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource))
			gl.linkProgram(program)
			return program
		},
		setUniform(program, name, suffix, ...args) {
			const location = gl.getUniformLocation(program, name)
			gl[`uniform${suffix}`](location, ...args)
		},
		setTexture(program, name, index, texture) {
			const location = gl.getUniformLocation(program, name)
			gl.uniform1i(location, index)
			gl.activeTexture(gl.TEXTURE0 + index)
			gl.bindTexture(gl.TEXTURE_2D, texture)
		},
		setVertexAttribute(program, name, vertexBuffer) {
			const location = gl.getAttribLocation(program, name)
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
			gl.enableVertexAttribArray(location)
			gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
		},
		draw(framebuffer) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null)
			gl.drawArrays(gl.TRIANGLES, 0, 6)
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		},
		createRenderer() {
			const pg = this.createProgram(this.VERTEX_SHADER_SOURCE, RENDER_FRAGMENT_SHADER_SOURCE)
			const vb = this.createVertexBuffer()
			this.setVertexAttribute(pg, "a_coordinates", vb)
			return (texture, width, height) => {
				this.withProgram(pg, () => {
					this.setUniform(pg, "u_resolution", "2f", width, height)
					this.setTexture(pg, "u_input", 0, texture)
					this.draw()
				})
			}
		},
		createVertexBuffer() {
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
		},
		copyFramebufferToTexture(framebuffer, texture, width, height) {
			gl.bindTexture(gl.TEXTURE_2D, texture)
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
			gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0)
		},
		parseUniforms(fragmentShaderSource) {
			const uniforms = fragmentShaderSource
				.split('\n')
				.filter(s => s != "")
				.map(line => line.match(RE_UNIFORM))
				.filter(line => line != undefined)
				.map(line => line.groups)
				.reduce((o, u) => {o[u.name] = u; return o}, {})

			Object.values(uniforms).forEach(uniform => {
				var suffix = UNIFORM_TO_SUFFIX[uniform.type]
				if (uniform.type == "sampler2D") {
					uniform.isTexture = true
				}
				else {
					if (suffix && uniform.array) {
						suffix += 'v'
					}
					uniform.suffix = suffix
				}
			})
			return uniforms
		},
		setUniforms(pg, uniformTypes, uniformValues) {
			var textureIndex = 0
			Object.entries(uniformValues).forEach(([name, value]) => {
				const uniformType = uniformTypes[name]
				if (uniformType.type == "sampler2D") {
					this.setTexture(pg, name, textureIndex, value)
					textureIndex += 1
				}
				else {
					this.setUniform(pg, name, uniformType.suffix, ...value)
				}
			})
		},
		withProgram(pg, f) {
			gl.useProgram(pg)
			f()
			gl.useProgram(null)
		},
		createShaderComponent(width, height, source) {
			const texture = this.createTexture(width, height)
			const fb = this.createFramebuffer(this.createTexture(width, height))
			const vb = this.createVertexBuffer()
			
			const pg = this.createProgram(this.VERTEX_SHADER_SOURCE, source)
			const uniformTypes = this.parseUniforms(source)
			var uniformValues = {}

			return {
				texture,
				uniformTypes,
				updateUniforms(newUniformValues) {
					Object.assign(uniformValues, newUniformValues)
				},
				drawTexture: () => {
					this.withProgram(pg, () => {
						this.setUniforms(pg, uniformTypes, uniformValues)
						this.setVertexAttribute(pg, "a_coordinates", vb)
						this.draw(fb)
						this.copyFramebufferToTexture(fb, texture, width, height)
					})
				}
			}
		}

	}
}


const MAX_TOUCHES = 5

export function monitorTouches(canvas, onTouch) {
	const touches = new Array(MAX_TOUCHES)
	clearTouches()

	function clearTouches() {
		for (let i = 0; i < MAX_TOUCHES; i++) {
			touches[i] = {x:0, y:0}
		}
	}
	
	function mapTouchEvent(e) {
        const rect = e.target.getBoundingClientRect()
        const offsetX = e.clientX - rect.left
        const offsetY = e.clientY - rect.top
		const x = offsetX * canvas.width / canvas.clientWidth
		const y = (canvas.clientHeight - offsetY) * canvas.height / canvas.clientHeight
		return [x, y]
	}

	function updateMouse(e) {
		clearTouches()
		if ((e.buttons & 1) === 1) {
			const [x, y] = mapTouchEvent(e)
			touches[0] = {x, y}
		}
		onTouch([touches.flatMap(({x, y}) => [x, y])])
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
				touches[i] = {x, y}
			}
		})
		onTouch([touches.flatMap(({x, y}) => [x, y])])
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
