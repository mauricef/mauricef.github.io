import * as GL from './gl.js'

async function fetchText(path) {
	const response = await fetch(path)
	return await response.text()
}

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

export async function loadScene(canvas,  scene) {
	const [width, height] = [canvas.width, canvas.height]
	const {title, graph, root} = scene

	const maxTouch = 5
	const startTime = Date.now()

	const gl = canvas.getContext("webgl") 
	gl.viewport(0, 0, width, height)
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	const render = GL.createRenderer(gl)
	const touches = monitorTouches(canvas, maxTouch)
    const components = {}
	function resolveDependencies(value, dependencies) {
		if (value == null) {
			return value
		}
		else if (typeof value == 'number') {
			return value
		}
		else if (typeof value == 'string') {
			if (value in graph) {
				dependencies[value] = true
				return () => components[value].output()
			}
			else {
				return value
			}
		}
		else if (Array.isArray(value)) {
			return value.map(v => resolveDependencies(v, dependencies))
		}
		else if (typeof value == 'object') {
			return mapObject(value, v => resolveDependencies(v, dependencies))	
		}
		else {
			console.log(`Invalid input value ${value}`)
		}
	}

	await Promise.all(Object.entries(graph).map(async ([name, spec]) => {
		const loader = await import(spec.loaderPath)
		components[name] = await loader.load({gl, size: {width, height}})
	}))
	var initialTouch = true
	touches[0] = {x: 127, y: 500, force: 0}
	touches[1] = {x: 291, y: 129, force: 0}
	touches[2] = {x: 38, y: 209, force: 0}
	touches[3] = {x: 100, y: 300, force: 0}
	async function animate() {
		const executed = {}
		async function update(name) {
			if (!(name in executed)) {
				executed[name] = true
				const dependencies = {}
				const inputs = resolveDependencies(graph[name].inputs, dependencies)
				await Promise.all(Object.keys(dependencies).map(async d => update(d)))
				const component = components[name]
				const uniforms = inputs.uniforms
				uniforms.u_resolution = [width, height]
				uniforms.u_touch = [touches.flatMap(({x, y, force}) => [x, y, force])]
				uniforms.u_time = [(startTime - Date.now()) / 1000]
				await component.update(inputs)				
			}
		}
		await update(root)
		render(components[root].output(), {width, height})
		requestAnimationFrame(animate)
		if (initialTouch) {
			for (let i = 0; i < maxTouch; i++) {
				touches[i] = {x:0, y:0, force: 0}
			}
		}
		initialTouch = false
	}
	requestAnimationFrame(animate)
}