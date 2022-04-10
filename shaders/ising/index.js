import {createGL, monitorTouches, fetchText} from "./utils.js"
import  "./tf.min.js"


async function copyRandPixels(gl, texture, p, x, y, width, height) {
    const GL = createGL(gl)

    const values = await tf
        .randomUniform([height, width])
        .greater(p)
        .array()

    const pixels = new Uint8Array(4 * height * width)
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const color = values[i][j] ? 255 : 0
            const index = (i * width + j) * 4
            pixels[index + 0] = color
            pixels[index + 1] = color
            pixels[index + 2] = color
            pixels[index + 3] = 255
        }
    }
    GL.copyPixelsToSubTexture(texture, pixels, x, y, width, height)
}

async function run(canvas) {	

    const gl = canvas.getContext("webgl") 
    const GL = createGL(gl)   

    const model = GL.createShaderComponent(width, height, await fetchText("model.glsl"))
    model.updateUniforms({
        u_resolution: [width, height],
        u_backbuffer: model.texture
    })
    const renderer = GL.createShaderComponent(width, height, await fetchText("renderer.glsl"))
    renderer.updateUniforms({
        u_resolution: [width, height],
        u_input: model.texture,
        u_backbuffer: renderer.texture,
        u_mix: [0.95, 0.1, 0.5]
    })

    copyRandPixels(gl, model.texture, .5, 0, 0, width, height)

    const render = GL.createRenderer()

    function animate(t) {
        model.updateUniforms({
            u_time: [(t / 1000)],
            u_rand: [Math.random()]
        })
        model.drawTexture()
        renderer.drawTexture()
        render(renderer.texture, width, height)
        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    monitorTouches(canvas, touches => {
        model.updateUniforms({
            u_touch: touches
        })
    })
}
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

window.onresize = () => {
    location.reload()
}
window.onorientationchange = () => {
    location.reload()	
}  
run(canvas)