precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_mix;
uniform sampler2D u_backbuffer;
uniform sampler2D u_input;
varying vec2 position;

void main() {
    gl_FragColor =  mix(
            texture2D(u_input, position),
            texture2D(u_backbuffer, position), 
            vec4(u_mix, 1.));
}