precision highp float;
// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com
float random(vec2 uv, float seed) {
    vec2 v = vec2(12.9898, 78.233);
    float s = 43758.5453123 + 1234.56789 * seed;
    float rnd = fract(sin(dot(uv.xy, v)) * s);
    return rnd;
}

varying vec2 uv;
uniform float u_seeds[3];

void main() {
    float r = random(uv, u_seeds[0]);
    float g = random(uv, u_seeds[1]);
    float b = random(uv, u_seeds[2]);
    gl_FragColor = vec4(vec3(r,g,b), 1.0);
}