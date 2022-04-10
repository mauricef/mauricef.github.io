precision highp float;

const float dist_min = 20.;
uniform sampler2D u_backbuffer;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_rand;
uniform vec2 u_touch[5];

float random() {
	vec2 seed_vec = vec2(12.9898,78.233);
	float seed_scale = 43758.5453123;
    return fract(
		abs(sin(
			dot(gl_FragCoord.xy, seed_vec))) * seed_scale * fract(u_time));
}

float sigmoid(float x) {
	return 1. / (1. + exp(-x));
}

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution;
    vec2 pixel = 1. / u_resolution;
	float pixelWeight = min(pixel.x, pixel.y);

	float value = 0.;
	float randomValue = random();
	float bias = .1;
	bool found = false;

	for (int i = 0; i < 5; i++) { 
		float dist = abs(distance(gl_FragCoord.xy, u_touch[i]));
		if (u_touch[i] != vec2(0.0) && dist < dist_min) {
			found = true;
			break;
		}
	}
	if (found) {
		value = random() > .6 ? 1. : 0.;
	}
	else {
		float sum = 0.;
		for (int i = -1; i < 2; ++i) {
			for (int j = -1; j < 2; ++j) {
				if (!(i == 0 && j == 0)) {
					sum += texture2D(u_backbuffer, position + pixel * vec2(i, j)).r;
				}
			}
		}
		if (sum == 0.) {
			value = 0.;
		}
		else if (sum == 8.) {
			value = 1.;
		}
		else {
			value = random() < sigmoid((sum - 4. + .1) * 4.) ? 1. : 0.;
		}
	}

	gl_FragColor = vec4(value, value, value, 1.);
}