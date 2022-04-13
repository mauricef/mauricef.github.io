import {Scene} from './scene.js'
import {Pointer} from './pointer.js'

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
const mouseFs = /*glsl*/`
    #version 300 es
    precision highp float;

    in vec2 uv;
    uniform float u_seed;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    out vec4 color;

    float toroidalDistance(vec2 p1, vec2 p2, vec2 dims) {
        // https://blog.demofox.org/2017/10/01/calculating-the-distance-between-points-in-wrap-around-toroidal-space/
        float dx = abs(p1.x - p2.x);
        dx = min(dx, dims.x - dx);
        float dy = abs(p1.y - p2.y);
        dy = min(dy, dims.y - dy);
        return sqrt(dx*dx + dy*dy);
    }
    float random(float seed, float p, vec2 xy) {
        vec2 v = vec2(12.9898, 78.233);
        float s = 43758.5453123 + 1234.56789 * seed;
        float rnd = fract(sin(dot(uv.xy, v)) * s);
        rnd = rnd < p ? 1. : 0.;
        return rnd;
    }
    void main() {
        vec2 xy = gl_FragCoord.xy;
        if(u_pointer != vec2(0.) && toroidalDistance(u_pointer, xy, u_resolution) < 20.) {
            float value = random(u_seed, .5, uv);
            color = vec4(vec3(value), 1.);
        }
        else {
            color = vec4(0.);
        }
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
const resolution = [width, height]

const pointer = new Pointer(canvas)

const gl = canvas.getContext("webgl2") 
gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

const scene = new Scene(gl)
const renderProgram = scene.program(renderFs)
const randomProgram = scene.program(randomFs)
const mouseProgram = scene.program(mouseFs)
const golProgram = scene.program(golFs)
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
animate(render)
