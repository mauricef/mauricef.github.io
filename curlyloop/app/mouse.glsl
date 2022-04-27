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