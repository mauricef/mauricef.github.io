
const VERTEX_SHADER_SOURCE = 'shaders/vs/gol.vs'
const GOL_SHADER_SOURCE = 'shaders/fs/gol.fs'
const RANDOM_SHADER_SOURCE = 'shaders/fs/random.fs'
const MOUSE_SHADER_SOURCE = 'shaders/fs/mouse.fs'
const ROUND_SHADER_SOURCE = 'shaders/fs/round.fs'
const RENDER_SHADER_SOURCE = 'shaders/fs/render.fs'

export const textures = {
    cells: {filter: 'NEAREST'},
    burn: {filter: 'NEAREST'},
    random: {filter: 'NEAREST'}
}

export const programs = {
    gol: {
        vertexShaderSource: VERTEX_SHADER_SOURCE,
        fragmentShaderSource: GOL_SHADER_SOURCE
    },
    mouse: {
        vertexShaderSource: VERTEX_SHADER_SOURCE,
        fragmentShaderSource: MOUSE_SHADER_SOURCE
    },
    render: {
        vertexShaderSource: VERTEX_SHADER_SOURCE,
        fragmentShaderSource: RENDER_SHADER_SOURCE
    },
    random: {
        vertexShaderSource: VERTEX_SHADER_SOURCE,
        fragmentShaderSource: RANDOM_SHADER_SOURCE
    },
    round: {
        vertexShaderSource: VERTEX_SHADER_SOURCE,
        fragmentShaderSource: ROUND_SHADER_SOURCE
    }
}

export async function create({aspectRatio, textures, programs}){
    var initializedCells = false

    function step({t, mousePt}) {
        programs.random.render({
            u_time: (t / 1000) % 1,
        }, textures.random) 

        if (!initializedCells) {
            programs.round.render({u_random: textures.random}, textures.cells)
            initializedCells = true
        }

        if (mousePt) {
            programs.mouse.render({
                aspectRatio: aspectRatio,
                u_random: textures.random,
                u_cells: textures.cells,
                u_touch: mousePt
            }, textures.cells) 
        }
        programs.render.render({u_texture: textures.cells})
        
        programs.gol.render({
            u_resolution: [textures.cells.width, textures.cells.height], 
            u_backbuffer: textures.cells
        }, textures.cells)
        
        programs.render.render({u_texture: textures.cells})
    }
    return {
        step
    }
}
