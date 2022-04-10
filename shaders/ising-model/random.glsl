precision highp float;

const float dist_min = 20.;
uniform vec3 u_touch[5];
uniform sampler2D u_seed;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 position;

vec4 sample(sampler2D sampler, float x, float y) {
    vec2 pixel = 1. / u_resolution;
	vec2 sample = mod(position + pixel * vec2(x, y), 1.);
	return texture2D(sampler, sample);
}

void main(void) {
	float rand_seed = sample(u_seed, 0., 0.).r;
	vec2 seed_vec = vec2(12.9898,78.233);
	float seed_scale = 43758.5453123;
    float value = fract(
		sin(rand_seed * 
			dot(gl_FragCoord.xy, seed_vec)) * seed_scale * fract(u_time));

    gl_FragColor = vec4(vec3(value), 1);
}