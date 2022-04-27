export async function init(context) {
    const {scene, canvas, pointer} = context
    const resolution = [canvas.width, canvas.height]
    const randomProgram = scene.program(await scene.fetchText('./app/random.glsl'))
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

        buffer.reverse()
        return buffer[0]
    }
    return {render}
}