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
    if (value < .2) {
        return 0;
    }
    else if (value < .4) {
        return 1;
    }
    else if (value < .6) {
        return 2;
    }
    else if (value < .8) {
        return 3;
    }
    else {
        return 4;
    }
}

void main() {
    float rng = u_seed;
    float action = float(randint(rng)) / 5.;
    color = vec4(vec3(action), 1.);
}