precision highp float;

const float dist_min = 20.;
uniform vec3 u_touch[5];
uniform float u_time;
varying vec2 position;

float random() {
	vec2 seed_vec = vec2(12.9898,78.233);
	float seed_scale = 43758.5453123;
    return fract(
		sin(
			dot(gl_FragCoord.xy, seed_vec)) * seed_scale * fract(u_time));
}

void main(void) {
	bool foundValue = false;
	float value = 0.;
	for (int i = 0; i < 5; i++) { 
		float dist = abs(distance(gl_FragCoord.xy, u_touch[i].xy));
		float threshold = dist_min;
		if (u_touch[i] != vec3(0) && dist < threshold) {
			value = 0.; 
			foundValue = true;
		}
	}
    float a = foundValue ? 1. : 0.;
	value = value * a;
    gl_FragColor = vec4(vec3(value), a);
}