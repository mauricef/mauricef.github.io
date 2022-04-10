precision mediump float;

uniform sampler2D u_input;
uniform sampler2D u_prev;
uniform vec2 u_resolution;

void main() {
    vec2 position = gl_FragCoord.xy / u_resolution;  
    if (texture2D(u_input, position) == vec4(1.)) {
        gl_FragColor = vec4(1.);
    }
    else {
        gl_FragColor =  mix(
            texture2D(u_input, position),
            texture2D(u_prev, position), 
            vec4(.99, .8, .5, 1.));
    }
}