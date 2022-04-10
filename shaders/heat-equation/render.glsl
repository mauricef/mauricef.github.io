precision highp float;

uniform sampler2D u_input;
uniform vec2 u_resolution;

void main(void){
    vec2 position = gl_FragCoord.xy/u_resolution.xy;
    vec3 value = texture2D(u_input, position).rgb;
    gl_FragColor = vec4(vec3(1.) - value, 1.);
}