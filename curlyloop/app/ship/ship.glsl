#version 300 es
precision highp float;

struct MoveAction {
    vec2 direction;
    int action;
};

in vec2 uv;
uniform float u_seed;
uniform vec2 u_resolution;
uniform sampler2D u_prev;
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
vec4 sample_texture(sampler2D sampler, vec2 uv, float dx, float dy) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
    return texture(sampler, position);
}

bool has_ship(vec2 dir) {
    return sample_texture(u_prev, uv, dir.x, dir.y).r == 1.;
}

const vec2[5] directions = vec2[5](
    vec2(0., 0.),
    vec2(1., 0.),
    vec2(0., 1.),
    vec2(-1., 0.),
    vec2(0., -1.)
);

void main() {
    float rng = u_seed;
    int direction = randint(rng);
    int ship_count = 0;
    for (int i = 0; i < 5; i++)
    {
        if (has_ship(directions[i]) && direction == i) {
            ship_count += 1;
        }
    }
    ship_count = min(1, ship_count);
    color = vec4(vec3(ship_count), 1.);
}