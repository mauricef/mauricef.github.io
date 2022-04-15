#version 300 es
precision highp float;

uniform float u_seed;
out vec4 color;

float random(float seed, vec2 xy) {
    vec2 v = vec2(12.9898, 78.233);
    float s = 43758.5453123 + 1234.56789 * seed;
    return fract(sin(dot(xy, v)) * s);
}

void main() {
    vec2 xy = gl_FragCoord.xy;
    float value = random(u_seed, xy);
    if (value < .2) {
        value = 0.;
    }
    else if (value < .4) {
        value = .2;
    }
    else if (value < .6) {
        value = .4;
    }
    else if (value < .8) {
        value = .6;
    }
    else {
        value = .8;
    }
    color = vec4(vec3(value), 1.);
}