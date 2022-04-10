precision highp float;

// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com
float random(vec2 uv, float seed) {
    vec2 v = vec2(12.9898, 78.233);
    float s = 43758.5453123 + 1234.56789 * seed;
    float rnd = fract(sin(dot(uv.xy, v)) * s);
    return rnd;
}

float toroidalDistance(vec2 p1, vec2 p2, vec2 dims) {
    // https://blog.demofox.org/2017/10/01/calculating-the-distance-between-points-in-wrap-around-toroidal-space/
    float dx = abs(p1.x - p2.x);
    dx = min(dx, dims.x - dx);
    float dy = abs(p1.y - p2.y);
    dy = min(dy, dims.y - dy);
    return sqrt(dx*dx + dy*dy);
}

#define temperature 1000.
#define radius 20.
#define magnetism 0.

varying vec2 uv;
uniform bool u_first;
uniform float u_seeds[2];
uniform vec2 u_resolution;
uniform sampler2D u_prev;
uniform vec2 u_pointer;
 

vec4 sample(sampler2D sampler, float dx, float dy) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
    return texture2D(sampler, position);
}

float ising() {
    float value = sample(u_prev, 0., 0.).r;
	float sum = 0.;
    sum += sample(u_prev, 0., 1.).r;
	sum += sample(u_prev, 0., -1.).r;
	sum += sample(u_prev, 1., 0.).r;
	sum += sample(u_prev, -1., 0.).r;
    float energy = sum / 4.  - .5;
    energy = 1. / (1. + exp(-(energy - magnetism) * temperature));
    return random(uv, u_seeds[1]) < energy ? 1. : 0.;
}

void main() {
    vec2 xy = gl_FragCoord.xy;
    float value = sample(u_prev, 0., 0.).r;
    if (u_first) {
        value = random(uv, u_seeds[0]);
        value = (value > .5) ? 1. : 0.;
    }
    else if(u_pointer != vec2(0.) && toroidalDistance(u_pointer, xy, u_resolution) < radius) {
        value = random(uv, u_seeds[0]);
    }
    else if (random(uv, u_seeds[0]) > .5) {
        value = ising();
    }
    gl_FragColor = vec4(vec3(value), 1.);
}