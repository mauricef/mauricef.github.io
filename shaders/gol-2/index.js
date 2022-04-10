import {loadScene} from './scene.js'

async function fetchJson(path) {
    const response = await fetch(path)
    return JSON.parse(await response.text())
}

async function renderScene(scene) {

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
    loadScene(canvas, scene)
    
	var resizeId = 0
	window.onresize = () => {
		clearTimeout(resizeId)
		resizeId = setTimeout(() => location.reload(), 500)
	}

	window.onorientationchange = () => {
		location.reload()	
	}  
}
async function run() {   
    const sceneName = 'gol-burn'
    const scene = await import(`./scenes/${sceneName}/scene.js`)
    renderScene(scene.spec)
}
run()