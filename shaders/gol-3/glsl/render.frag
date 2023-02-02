#version 300 es
precision highp float;

in vec2 uv;
uniform sampler2D u_input;
out vec4 fragColor;

void main() {
    fragColor = texture(u_input, uv);
}