precision highp float;

varying vec2 vUv;
uniform vec2 u_touch;
uniform float aspectRatio;
uniform float u_time;
uniform sampler2D u_cells;
uniform sampler2D u_random;

void main(void) {
    vec2 p = vUv - u_touch;
    p.x *= aspectRatio;
    float dist = abs(length(p));
    bool foundValue = false;
    if (u_touch != vec2(0) && dist < .05) {
        float value = texture2D(u_random, vUv).x;
        gl_FragColor = vec4(vec3(floor(value + .5)), 1.);
    }
    else {
        gl_FragColor = texture2D(u_cells, vUv);
    }
}
