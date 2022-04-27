export async function init(context) {
    const {scene, canvas, pointer} = context
    const resolution = [canvas.width, canvas.height]
    const randomProgram = scene.program(await scene.fetchText('./app/random.glsl'))
    const shipActionProgram = scene.program(await scene.fetchText('./app/ship/ship_action.glsl'))    
    const shipProgram = scene.program(await scene.fetchText('./app/ship/ship.glsl'))
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

        buffer.reverse()
        // return shipActionBuffer
        return buffer[0]
    }
    return {render}
}