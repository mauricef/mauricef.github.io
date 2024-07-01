#version 300 es
precision highp float;

in vec2 uv;
uniform bool u_first;
uniform float u_seed;
uniform vec2 u_resolution;
uniform sampler2D u_prev;
out vec4 fragColor;

vec4 readPixel(sampler2D sampler, vec2 uv, float dx, float dy) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
    return texture(sampler, position);
}

float random(float seed, float p, vec2 xy) {
    vec2 v = vec2(12.9898, 78.233);
    float s = 43758.5453123 + 1234.56789 * seed;
    float rnd = fract(sin(dot(uv.xy, v)) * s);
    rnd = rnd < p ? 1. : 0.;
    return rnd;
}

float gol(sampler2D state, vec2 uv) {
    float value = readPixel(state, uv, 0., 0.).r;
    float sum = 0.0;
    for (float dx=-1.;dx<=1.;dx++) {
        for (float dy=-1.;dy<=1.;dy++) {
            sum += readPixel(state, uv, dx, dy).r;
        }
    }
    if(value == 1.0 && sum == 3.0)
    {
        return 1.0;
    } 
    if(value == 1.0 && sum == 4.0)
    {
        return 1.0;
    }
    if(value == 0.0 && sum == 3.0){
        return 1.0;
    }
    return 0.0;
}

void main() {
    float p = .5;
    vec2 xy = gl_FragCoord.xy;
    float value = 0.;
    if (u_first) {
        value = random(u_seed, p, xy);
    }
    else {
        value = gol(u_prev, uv);
    }
    fragColor = vec4(vec3(value), 1.);
}