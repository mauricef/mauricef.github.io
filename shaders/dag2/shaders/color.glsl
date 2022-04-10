precision highp float;

uniform sampler2D u_input;
uniform vec2 u_resolution;

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution.xy;
    float value = texture2D(u_input, position).r;
    if (value == 0.) {
        gl_FragColor = vec4(vec3(0.), 1.);
    }
    else {
        gl_FragColor = vec4(1., position.x, position.y, 1.);
    }
}