#version 300 es
precision highp float;

in vec2 uv;
uniform vec2 u_resolution;
uniform sampler2D u_ship_action;
uniform sampler2D u_prev;
out vec4 color;

vec4 sample_texture(sampler2D sampler, vec2 offset) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(offset.x, offset.y), 1.);
    return texture(sampler, position);
}

bool has_ship(vec2 dir) {
    return sample_texture(u_prev, dir).r == 1.;
}

const vec2[5] directions = vec2[5](
    vec2(0., 0.),
    vec2(1., 0.),
    vec2(0., 1.),
    vec2(-1., 0.),
    vec2(0., -1.)
);

void main() {
    int ship_count = 0;
    for (int i = 0; i < 5; i++)
    {
        vec2 direction = directions[i];
        int action = int(sample_texture(u_ship_action, direction).r * 5.);
        if (has_ship(direction) && action == i) {
            ship_count += 1;
        }
    }
    ship_count = min(1, ship_count);
    color = vec4(vec3(ship_count), 1.);
}