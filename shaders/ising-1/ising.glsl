precision highp float;

const float dist_min = 20.;
uniform sampler2D u_backbuffer;
uniform sampler2D u_random;
uniform vec2 u_resolution;
varying vec2 position;

vec4 sample(sampler2D sampler, float x, float y) {
    vec2 pixel = 1. / u_resolution;
	vec2 sample = mod(position + pixel * vec2(x, y), 1.);
	return texture2D(sampler, sample);
}

void main(void) {		
	float value = sample(u_backbuffer, 0., 0.).r;
	value += sample(u_backbuffer, -1., -1.).r;
	value += sample(u_backbuffer, 0., -1.).r;
	value += sample(u_backbuffer, 1., -1.).r;
	value += sample(u_backbuffer, -1., 1.).r;
	value += sample(u_backbuffer, 0., 1.).r;
	value += sample(u_backbuffer, 1., 1.).r;
	value += sample(u_backbuffer, -1., 0.).r;
	value += sample(u_backbuffer, 1., 0.).r;

	float random = sample(u_random, 0., 0.).r;
	value = value > (9. * random)  ? 1. : 0.;
	gl_FragColor = vec4(value, value, value, 1.);
}