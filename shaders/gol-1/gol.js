
const VERTEX_SHADER_SOURCE = `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`

const GOL_SHADER_SOURCE = `
    precision highp float;

    uniform sampler2D u_backbuffer;
    uniform vec2 u_resolution;
    varying vec2 vUv;

    vec4 sample(sampler2D sampler, float x, float y) {
        vec2 pixel = 1. / u_resolution;
        vec2 sample = mod(vUv + pixel * vec2(x, y), 1.);
        return texture2D(sampler, sample);
    }

    void main(void) {		
        float value = sample(u_backbuffer, 0., 0.).r;
        
        float sum = 0.0;
        sum += sample(u_backbuffer, -1., -1.).r;
        sum += sample(u_backbuffer, 0., -1.).r;
        sum += sample(u_backbuffer, 1., -1.).r;
        sum += sample(u_backbuffer, -1., 1.).r;
        sum += sample(u_backbuffer, 0., 1.).r;
        sum += sample(u_backbuffer, 1., 1.).r;
        sum += sample(u_backbuffer, -1., 0.).r;
        sum += sample(u_backbuffer, 1., 0.).r;
        
        if(value == 1.0 && (sum < 2.0 || sum > 3.0)){
            value = 0.0;
        } 
        else if(value == 0.0 && sum == 3.0){
            value = 1.0;
        }
        gl_FragColor = vec4(value, value, value, 1.);
    }
`
const RANDOM_SHADER_SOURCE = `
    precision highp float;

    varying vec2 vUv;
    uniform float u_time;

    float random() {
        vec2 seed_vec = vec2(12.9898,78.233);
        float seed_scale = 43758.5453123;
        return fract(
            sin(
                dot(gl_FragCoord.xy, seed_vec)) * seed_scale * u_time);
    }

    void main(void) {
        gl_FragColor = vec4(vec3(random()), 1.);
    }
`
const MOUSE_SHADER_SOURCE = `
    precision highp float;

    varying vec2 vUv;
    uniform vec2 u_touch;
    uniform float aspectRatio;
    uniform float u_time;
    uniform sampler2D u_cells;
    uniform sampler2D u_random;

    void main(void) {
        vec2 p = vUv - u_touch;
        p.x *= aspectRatio;
        float dist = abs(length(p));
        bool foundValue = false;
        if (u_touch != vec2(0) && dist < .05) {
            float value = texture2D(u_random, vUv).x;
            gl_FragColor = vec4(vec3(floor(value + .5)), 1.);
        }
        else {
            gl_FragColor = texture2D(u_cells, vUv);
        }
    }
`

const ROUND_SHADER_SOURCE = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D u_random;

    void main () {
        float value = texture2D(u_random, vUv).x;
        value = floor(value + .5);
        gl_FragColor = vec4(vec3(value), 1.);
    }
`

const RENDER_SHADER_SOURCE = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D u_texture;

    void main () {
        vec4 color = texture2D(u_texture, vUv);
        color = vec4(1.) - color;
        gl_FragColor = vec4(color.rgb, 1.);
    }
`
const size = 1920

export const textures = {
    cells: {size: size, filter: 'NEAREST'},
    burn: {size: size, filter: 'NEAREST'},
    random: {size: size, filter: 'NEAREST'}
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
