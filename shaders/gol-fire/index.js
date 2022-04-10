import {createGL, monitorTouches, fetchText} from "./utils.js"
import  "./tf.min.js"

async function run() {	
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
    const GL = createGL(gl)
    const initialState = await tf
        .randomUniform([height, width])
        .greater(.95)
        .array()

    const pixels = new Uint8Array(4 * height * width)
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const color = initialState[i][j] ? 255 : 0
            const index = (i * width + j) * 4
            pixels[index + 0] = color
            pixels[index + 1] = color
            pixels[index + 2] = color
            pixels[index + 3] = 255
        }
    }

    const gol = GL.createShaderComponent(width, height, await fetchText("gol.glsl"))
    gol.updateUniforms({
        u_resolution: [width, height],
        u_backbuffer: gol.texture
    })
    GL.copyPixelsToTexture(gol.texture, pixels, width, height)

    const burn = GL.createShaderComponent(width, height, await fetchText("burn.glsl"))
    burn.updateUniforms({
        u_resolution: [width, height],
        u_input: gol.texture,
        u_backbuffer: burn.texture,
        u_mix: [0.95, 0.1, 0.5]
    })

    const render = GL.createRenderer()

    monitorTouches(canvas, touches => {
        gol.updateUniforms({
            u_touch: touches
        })
    })

    function animate(t) {
        gol.updateUniforms({
            u_time: [t / 1000]
        })
        gol.drawTexture()

        burn.drawTexture()

        render(burn.texture, width, height)
        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

}

run()

window.onresize = () => {
    location.reload()
}
window.onorientationchange = () => {
    location.reload()	
}  