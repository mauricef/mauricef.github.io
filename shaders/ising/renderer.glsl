precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_mix;
uniform sampler2D u_backbuffer;
uniform sampler2D u_input;

void main() {
    vec2 position = gl_FragCoord.xy / u_resolution;  
    if (texture2D(u_input, position).rbg == vec3(1.)) {
        gl_FragColor = texture2D(u_input, position);
    }
    else {
        gl_FragColor =  mix(
            texture2D(u_input, position),
            texture2D(u_backbuffer, position), 
            vec4(u_mix, 1.));
    }
}