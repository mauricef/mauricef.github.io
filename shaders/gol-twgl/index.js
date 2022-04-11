import {Scene} from './scene.js'

const renderFs = /*glsl*/`
    precision highp float;

    varying vec2 uv;
    uniform sampler2D u_input;

    void main() {
        gl_FragColor = texture2D(u_input, uv);
    }
`

const randomFs = /*glsl*/`
    precision highp float;

    varying vec2 uv;
    uniform float u_seed;

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
        gl_FragColor = vec4(vec3(value), 1.);
    }
`

const golFs = /*glsl*/`
    precision highp float;

    varying vec2 uv;
    uniform vec2 u_resolution;
    uniform sampler2D u_prev;

    vec4 sample(sampler2D sampler, vec2 uv, float dx, float dy) {
        vec2 pixelSize = 1. / u_resolution;
        vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
        return texture2D(sampler, position);
    }

    float gol(sampler2D state, vec2 uv) {
        float value = sample(state, uv, 0., 0.).r;
        float sum = 0.0;
        for (float dx=-1.;dx<=1.;dx++) {
            for (float dy=-1.;dy<=1.;dy++) {
                sum += sample(state, uv, dx, dy).r;
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
        gl_FragColor = vec4(vec3(value), 1.);
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
const scene = new Scene(canvas)
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
    renderProgram.execute({u_input: buffer})
}
animate(render)