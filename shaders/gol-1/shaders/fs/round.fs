precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_random;

void main () {
    float value = texture2D(u_random, vUv).x;
    value = floor(value + .5);
    gl_FragColor = vec4(vec3(value), 1.);
}