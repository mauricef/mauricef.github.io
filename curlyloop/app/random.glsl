#version 300 es
precision highp float;

uniform float u_seed;
out vec4 color;

float random(float rng) {
    vec2 xy = gl_FragCoord.xy;
    vec2 v = vec2(12.9898, 78.233);
    float s = 43758.5453123 + 1234.56789 * rng;
    return fract(sin(dot(xy, v)) * s);
}

int randint(float rng) {
    float value = random(rng);
    if (value < .5) {
        return 0;
    }
    else {
        return 1;
    }
}

void main() {
    float rng = u_seed;
    float action = float(randint(rng)) / 1.;
    color = vec4(vec3(action), 1.);
}