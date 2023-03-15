#version 300 es
in vec4 a_position;
out vec2 uv;

void main() {
    gl_Position = a_position;
    uv = (a_position.xy + 1. ) / 2.;
}