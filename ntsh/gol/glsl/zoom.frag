#version 300 es
precision highp float;
uniform sampler2D u_input;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 scale;
out vec4 fragColor;

void main() {
    vec2 xy = gl_FragCoord.xy;
    vec2 uv = xy / scale + offset;
    fragColor = texture(u_input, uv);
}