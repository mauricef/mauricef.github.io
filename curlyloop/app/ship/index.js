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
    const renderProgram = scene.program(await fetchText('./app/ship/render.glsl'))
    const randomProgram = scene.program(await fetchText('./app/ship/random.glsl'))
    const mouseProgram = scene.program(await fetchText('./app/ship/mouse.glsl'))
    const shipActionProgram = scene.program(await fetchText('./app/ship/ship_action.glsl'))    
    const shipProgram = scene.program(await fetchText('./app/ship/ship.glsl'))
    var buffer = [scene.buffer(), scene.buffer()]
    var shipActionBuffer = scene.buffer()
    randomProgram.execute({
        u_seed: Math.random()
    }, buffer[0])

    function render(time) {
        shipActionProgram.execute({
            u_seed: Math.random(),            
        }, shipActionBuffer)

        shipProgram.execute({
            u_prev: buffer[0],
            u_ship_action: shipActionBuffer,
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