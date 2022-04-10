precision highp float;
precision highp sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uTexture;


void main () {
    vec3 c = texture2D(uTexture, vUv).rgb;
    gl_FragColor = vec4(1. - c, 1.);
}