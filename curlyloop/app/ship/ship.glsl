#version 300 es
precision highp float;

in vec2 uv;
uniform vec2 u_resolution;
uniform sampler2D u_prev;
uniform sampler2D u_direction;
out vec4 color;
    
vec4 sample_texture(sampler2D sampler, vec2 uv, float dx, float dy) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
    return texture(sampler, position);
}

float ship_moved_in(vec2 dir) {
    float value = sample_texture(u_prev, uv, dir.x, dir.y).r;
    float move = sample_texture(u_direction, uv, dir.x, dir.y).r;
    if (dir == vec2(0., 0.) && move == 0.) {
        return value;
    }
    if (dir == vec2(0., 1.) && move == .2) {
        return value;
    }
    if (dir == vec2(1., 0.) && move == .4) {
        return value;
    }
    if (dir == vec2(-1., 0.) && move == .6) {
        return value;
    }
    if (dir == vec2(0., -1.) && move == .8) {
        return value;
    }
    return 0.;
}

void main() {
    float has_ship = 0.;
    has_ship += ship_moved_in(vec2(0., 0.));
    has_ship += ship_moved_in(vec2(1., 0.));
    has_ship += ship_moved_in(vec2(0., 1.));
    has_ship += ship_moved_in(vec2(-1., 0.));
    has_ship += ship_moved_in(vec2(0., -1.));
    has_ship = min(has_ship, 1.);
    color = vec4(vec3(has_ship), 1.);
}