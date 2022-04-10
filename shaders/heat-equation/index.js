import {createGL, monitorTouches, fetchText} from "./utils.js"
import  "./tf.min.js"

function initialPixels() {
    const pixels = new Uint8Array(4 * width * height)
    for (var i = 0; i < pixels.length; i++) {
        pixels[i] = 255
    }
    return pixels
}
async function randomPixels() {
    const values = await tf.randomUniform([width * height], 0, 256, 'int32').array()
    const pixels = new Uint8Array(4 * width * height) 
    for (var i = 0; i < width * height; i++) {
        const j = i * 4
        pixels[j] = values[i]
        pixels[j+1] = values[i]
        pixels[j+2] = values[i]
        pixels[j+3] = values[i]
    }
    return pixels
}

async function run(canvas) {	

    const gl = canvas.getContext("webgl") 
    const GL = createGL(gl)   

    const random = GL.createShaderComponent(width, height, await fetchText("random.glsl"))
    random.updateUniforms({
        u_resolution: [width, height]
    })
    const randomTexture = GL.createTexture(width, height)

    const mouse = GL.createShaderComponent(width, height, await fetchText("mouse.glsl"))
    mouse.updateUniforms({
        u_resolution: [width, height]
    })

    const model = GL.createShaderComponent(width, height, await fetchText("model.glsl"))
    model.updateUniforms({
        u_resolution: [width, height],
        u_random: randomTexture,
        u_mouse: mouse.texture,
        u_previous: model.texture
    })

    const output = GL.createShaderComponent(width, height, await fetchText("render.glsl"))
    output.updateUniforms({
        u_resolution: [width, height],
        u_input: model.texture,
    })

    const render = GL.createRenderer()

    function animate(t) {
        model.drawTexture()
        output.drawTexture()
        render(output.texture, width, height)
        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)

    async function updateRandom() {
        const pixels = await randomPixels()
        GL.copyPixelsToTexture(randomTexture, pixels, width, height)
        setTimeout(updateRandom, 0)
    }
    updateRandom()

    monitorTouches(canvas, touches => {
        mouse.updateUniforms({
            u_touch: touches
        })
        mouse.drawTexture()
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