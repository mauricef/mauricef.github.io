export async function init(context) {
    const {scene, canvas, pointer} = context
    const resolution = [canvas.width, canvas.height]
    const randomProgram = scene.program(await scene.fetchText('./app/gol/random.glsl'))
    const mouseProgram = scene.program(await scene.fetchText('./app/gol/mouse.glsl'))
    const golProgram = scene.program(await scene.fetchText('./app/gol/gol.glsl'))
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

        buffer.reverse()
        return buffer[0]
    }
    return {render}
}