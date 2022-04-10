precision highp float;

uniform sampler2D u_backbuffer;

uniform vec2 u_resolution;
uniform vec3 u_touch[5];
uniform float u_time;

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution.xy;
    float value = texture2D(u_backbuffer, position).r;
	gl_FragColor = vec4(value, value, value, 1.);
}