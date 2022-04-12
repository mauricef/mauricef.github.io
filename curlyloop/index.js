import {Scene} from './scene.js'
import {Mouse} from './mouse.js'

// const renderFs = /*glsl*/`
//     #version 300 es
//     precision highp float;

//     in vec2 uv;
//     uniform sampler2D u_input;
//     out vec4 color;

//     void main() {
//         color = texture(u_input, uv);
//     }
// `
const renderFs = /*glsl*/`
    #version 300 es
    precision highp float;

    uniform sampler2D u_input;
    uniform vec2 offset;
    uniform vec2 scale;
    out vec4 color;

    void main() {
        vec2 xy = gl_FragCoord.xy;
        vec2 uv = xy / scale + offset;
        color = texture(u_input, uv);
    }
`
    
const randomFs = /*glsl*/`
    #version 300 es
    precision highp float;

    in vec2 uv;
    uniform float u_seed;
    out vec4 color;
    
    float random(float seed, float p, vec2 xy) {
        vec2 v = vec2(12.9898, 78.233);
        float s = 43758.5453123 + 1234.56789 * seed;
        float rnd = fract(sin(dot(uv.xy, v)) * s);
        rnd = rnd < p ? 1. : 0.;
        return rnd;
    }

    void main() {
        float p = .5;
        vec2 xy = gl_FragCoord.xy;
        float value = random(u_seed, p, xy);
        color = vec4(vec3(value), 1.);
    }
`

const golFs = /*glsl*/`
    #version 300 es
    precision highp float;

    in vec2 uv;
    uniform vec2 u_resolution;
    uniform sampler2D u_prev;
    out vec4 color;
        
    vec4 sample_texture(sampler2D sampler, vec2 uv, float dx, float dy) {
        vec2 pixelSize = 1. / u_resolution;
        vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
        return texture(sampler, position);
    }

    float gol(sampler2D state, vec2 uv) {
        float value = sample_texture(state, uv, 0., 0.).r;
        float sum = 0.0;
        for (float dx=-1.;dx<=1.;dx++) {
            for (float dy=-1.;dy<=1.;dy++) {
                sum += sample_texture(state, uv, dx, dy).r;
            }
        }
        if(value == 1.0 && (sum < 2.0 || sum > 3.0)){
            return 0.0;
        } 
        else if(value == 0.0 && sum == 3.0){
            return 1.0;
        }
        else {
            return value;
        }
    }

    void main() {
        float p = .5;
        vec2 xy = gl_FragCoord.xy;
        float value = gol(u_prev, uv);
        color = vec4(vec3(value), 1.);
    }
`

function animate(f) {
    function innerAnimate(t) {
        f(t)
        requestAnimationFrame(innerAnimate)
    }
    requestAnimationFrame(innerAnimate)
}

const canvas = document.getElementById('c')
const MAX_TEXTURE_SIZE = 1024
{
    var width = canvas.clientWidth
    var height = canvas.clientHeight
    const ratio = width / height
    if (width > MAX_TEXTURE_SIZE && ratio > 1) {
        width = MAX_TEXTURE_SIZE
        height = Math.floor(width / ratio)
    }
    else if (height > MAX_TEXTURE_SIZE) {
        height = MAX_TEXTURE_SIZE
        width = Math.floor(height * ratio)
    }
}
canvas.width = width
canvas.height = height 
const mouse = new Mouse(canvas)

const gl = canvas.getContext("webgl2") 
gl.viewport(0, 0, width, height)
const scene = new Scene(gl)
const renderProgram = scene.program(renderFs)
const randomProgram = scene.program(randomFs)
const golProgram = scene.program(golFs)
var buffer = scene.buffer()

randomProgram.execute({
    u_seed: Math.random()
}, buffer)

function render(time) {
    golProgram.execute({
        u_prev: buffer,
        u_resolution: [canvas.width, canvas.height],
    }, buffer)
    renderProgram.execute({
        u_input: buffer,
        offset: mouse.offset,
        scale: mouse.scale
    })
}
animate(render)


// render(buffer) {
//         const scale = [
//             this.resolution.width * this.zoomScale,
//             this.resolution.height * this.zoomScale
//         ]
//         const offset = [
//             this.zoomOffset.x / this.resolution.width,
//             this.zoomOffset.y / this.resolution.height
//         ]
//         this.zoomPg({
//             u_input: buffer,
//             offset: offset,
//             scale: scale,
//         }, this.zoomBuffer)
//         this.shaders.render(this.zoomBuffer)
//     }