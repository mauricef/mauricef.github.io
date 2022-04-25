    #version 300 es
    precision highp float;

    uniform sampler2D u_input;
    uniform vec2 offset;
    uniform vec2 scale;
    out vec4 color;

    void main() {
        vec2 xy = gl_FragCoord.xy;
        vec2 uv = xy / scale + offset;
        color = texture(u_input, uv);
    }