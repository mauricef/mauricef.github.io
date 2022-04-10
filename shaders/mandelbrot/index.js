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

function setUniform(gl, program, name, suffix, ...args) {
    const location = gl.getUniformLocation(program, name)
    gl[`uniform${suffix}`](location, ...args)
}

function setTexture(gl, program, name, index, texture) {
	const location = gl.getUniformLocation(program, name)
	gl.uniform1i(location, index)
	gl.activeTexture(gl.TEXTURE0 + index)
	gl.bindTexture(gl.TEXTURE_2D, texture)
}

function setVertexAttribute(gl, program, name, vertexBuffer) {
	const location = gl.getAttribLocation(program, name)
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
	gl.enableVertexAttribArray(location)
	gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
}

function draw(gl, framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer || null)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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


const VERTEX_SHADER_SOURCE = `
attribute vec2 a_coordinates;

void main(void){
	gl_Position = vec4(a_coordinates, 1.0, 1.0);
}`


function mapObject(o, f) {
	const o2 = {}
	Object.keys(o).forEach(k => {
		o2[k] = f(o[k])
	})
	return o2
}
function arrToObj(arr) {
	const obj = {}
	arr.forEach(([k, v]) => {
		obj[k] = v
	})
	return obj
}

const RE_UNIFORM = /uniform (?<type>\w+) (?<name>\w+)(?:\[(?<array>\d+)\])?;/
function parseUniforms(fragmentShaderSource) {
    return fragmentShaderSource
		.split('\n')
		.filter(s => s != "")
		.map(line => line.match(RE_UNIFORM))
		.filter(line => line != undefined)
		.map(line => line.groups)
		.reduce((o, u) => {o[u.name] = u; return o}, {})
}
const UNIFORM_TO_SUFFIX = {
	'float': '1f',
	'vec2': '2f',
	'vec3': '3f'
}
function uniformToMethodSuffix(uniform) {
	var suffix = UNIFORM_TO_SUFFIX[uniform.type]
	if (uniform.array) {
		suffix += 'v'
	}
	return suffix
}

function monitorTouches(canvas, maxTouches) {
	const touches = new Array(maxTouches)

	function clearTouches() {
		for (let i = 0; i < maxTouches; i++) {
			touches[i] = {x:0, y:0, force: 0}
		}
	}
	
	function mapTouchEvent(e) {
		const x = e.clientX * canvas.width / canvas.clientWidth
		const y = (canvas.clientHeight - e.clientY) * canvas.height / canvas.clientHeight
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

function Shader(gl, {name, source, size: {width, height}, inputs, vb}) {
	const pg = createProgram(gl, VERTEX_SHADER_SOURCE, source)
	const currtx = createTexture(gl, width, height)
	const prevtx = createTexture(gl, width, height)
	const fb = createFramebuffer(gl, currtx)
	const uniforms = parseUniforms(source)
	const textures = []
	const parameters = []
	const dependencies = []
	Object.entries(inputs).forEach(([name, value]) => {
		const uniform = uniforms[name]
		if (uniform) {
		const type = uniform.type
	   		if (type == "sampler2D") {
				const tx = value ? value.tx : prevtx
				textures.push({name, tx})
				if (value) {
					dependencies.push(value)
				}
			}
			else {
				const suffix = uniformToMethodSuffix(uniform)
				const getter = value instanceof Function ? value : () => value
				parameters.push({name, getter, suffix})
			}
		}
	})
	gl.useProgram(pg)
	setVertexAttribute(gl, pg, "a_coordinates", vb)
	gl.useProgram(null)
	
	return {
		name,
		tx: currtx,
		dependencies,
		execute(render) {
			gl.useProgram(pg)
			textures.forEach(({name, tx}, index) => {
				setTexture(gl, pg, name, index, tx)
			})
			parameters.forEach(({name, getter, suffix}) => {
				const value = getter()
				setUniform(gl, pg, name, suffix, ...value)
			})
			draw(gl, fb)
			copyFramebufferToTexture(gl, fb, prevtx, width, height)
			if (render) {
				draw(gl, null)
			}
			gl.useProgram(null)
		}
	}
}

export async function loadScene(sceneName) {
	const {title, graph, root} = JSON.parse(await fetchText(`scene.json`))
	const maxTouch = 5
	const startTime = Date.now()
	const canvas = document.getElementById("canvas")
	{
		const MAX_TEXTURE_SIZE = 1024
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
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	const vb = createVertexBuffer(gl)

	Object.values(graph).forEach(spec => {
		spec.inputs = spec.inputs || {}
	})
	const shaderSource = {}
	await Promise.all(Object.keys(graph).map(async name => {
		shaderSource[name] = await fetchText(`${name}.glsl`)
	}))

	const touches = monitorTouches(canvas, maxTouch)
	function getTouches() {
		return [touches.flatMap(({x, y, force}) => [x, y, force])]
	}
	function getTime() {
		return [(startTime - Date.now()) / 1000]
	}
	const builtins = {
		u_resolution: [width, height],
		u_backbuffer: null,
		u_touch: getTouches,
		u_time: getTime
	}
    const shaders = {}
	function parseSpecInput(value) {
		return value in graph ? getShader(value) : value
	}
	function shaderFromSpec(name, {inputs}) {
		const source = shaderSource[name]
		return Shader(gl, {
			name,
			source: source,
			size: {width, height},
			inputs: Object.assign(mapObject(inputs, parseSpecInput), builtins),
			vb
		})
	}
	function getShader(name) {
		if (!(name in shaders)) {
			const spec = graph[name]
			shaders[name] = shaderFromSpec(name, spec)
		}
		return shaders[name]
	}

	function animate() {
		const executed = {}
		function execute(name) {
			if (!(name in executed)) {
				executed[name] = true
				const shader = getShader(name)
				shader.dependencies.forEach(d => execute(d.name))
				shader.execute(name == root)				
			}
		}
		execute(root)
		requestAnimationFrame(animate)
	}
	requestAnimationFrame(animate)

	var resizeId = 0
	window.onresize = () => {
		clearTimeout(resizeId)
		resizeId = setTimeout(() => location.reload(), 500)
	}

	window.onorientationchange = () => {
		location.reload()	
	}
}

loadScene()