precision highp float;

varying vec2 vUv;
uniform float u_time;

float random() {
    vec2 seed_vec = vec2(12.9898,78.233);
    float seed_scale = 43758.5453123;
    return fract(
        sin(
            dot(gl_FragCoord.xy, seed_vec)) * seed_scale * u_time);
}

void main(void) {
    gl_FragColor = vec4(vec3(random()), 1.);
}