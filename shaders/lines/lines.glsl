precision highp float;

uniform vec2 p0;
uniform vec2 p1;
varying vec2 position;
const float radius = 2.;


void main(void) {		
    vec2 a = p0;
    vec2 n = normalize(p1 - p0);
    vec2 p = gl_FragCoord.xy;
    float d = length((a - p) - (dot((a - p), n) * n));
    float c = 1. - d / radius;
	gl_FragColor = vec4(vec3(c), 1.);
}