import {Scene} from '../../scene.js'
import {Pointer} from '../../pointer.js'

async function fetchText(path) {
    var response = await fetch(path)
    return await response.text()
}

export async function init(canvas) {
    const resolution = [canvas.width, canvas.height]
    const pointer = new Pointer(canvas)
    const gl = canvas.getContext("webgl2") 
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const scene = new Scene(gl)
    const renderProgram = scene.program(await fetchText('./app/gol/render.glsl'))
    const randomProgram = scene.program(await fetchText('./app/gol/random.glsl'))
    const mouseProgram = scene.program(await fetchText('./app/gol/mouse.glsl'))
    const golProgram = scene.program(await fetchText('./app/gol/gol.glsl'))
    var buffer = [scene.buffer(), scene.buffer()]

    randomProgram.execute({
        u_seed: Math.random()
    }, buffer[0])


    function render(time) {
        golProgram.execute({
            u_prev: buffer[0],
            u_resolution: resolution,
        }, buffer[1])
        
        mouseProgram.execute({
            u_seed: Math.random(),
            u_pointer: pointer.position,
            u_resolution: resolution
        }, buffer[1])

        renderProgram.execute({
            u_input: buffer[1],
            offset: pointer.offset,
            scale: pointer.scale
        })
        buffer.reverse()
    }
    return {render}
}