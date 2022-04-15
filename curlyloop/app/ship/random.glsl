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