precision mediump float;

varying vec2 uv;
uniform vec2 u_pointer;
uniform sampler2D u_prev;

void main() {
    vec2 xy = gl_FragCoord.xy;
    vec3 color = vec3(0.);
    if (distance(xy, u_pointer) < 2.) {
        color = vec3(1.);
    }
    else {
        color = texture2D(u_prev, uv).rgb;
    }
    gl_FragColor = vec4(color, 1.);
}