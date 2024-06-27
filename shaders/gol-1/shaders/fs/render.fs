precision highp float;
precision highp sampler2D;

varying vec2 vUv;
uniform sampler2D u_texture;

void main () {
    vec4 color = texture2D(u_texture, vUv);
    color = vec4(1.) - color;
    gl_FragColor = vec4(color.rgb, 1.);
}