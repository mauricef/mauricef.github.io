#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
uniform vec2 u_resolution;
out vec2 v_texCoord;

void main() {
    v_texCoord = a_texCoord;
    vec2 clipSpace = 2.0 * (a_position / u_resolution) - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}