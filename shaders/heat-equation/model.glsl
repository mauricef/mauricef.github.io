precision highp float;

uniform sampler2D u_previous;
uniform sampler2D u_random;
uniform sampler2D u_mouse;
uniform vec2 u_resolution;
uniform vec2 u_touch[5];

float getValue(sampler2D texture, vec2 offset) {
    vec2 position = (gl_FragCoord.xy + offset) / u_resolution;
	if (position.x <= 0. || 
	    position.x >= 1. || 
		position.y <= 0. || 
		position.y >= 1.) {
		return 0.;
	}
	else {
		return texture2D(texture, position).r;
	}
}

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution;
	float newValue = 0.;
	if (getValue(u_mouse, vec2(0.)) == 1.) {
		newValue = 1.;
	}
	else {
		float currValue = getValue(u_previous, vec2(0.));
		float currRand = getValue(u_random, vec2(0.));
		float total = 0.;
		float count = 0.;
		for (float i = -1.; i <= 1.; i++) {
			for (float j = -1.; j <= 1.; j++) {
				float otherRand = getValue(u_random, vec2(i, j));
				float otherValue = getValue(u_previous, vec2(i, j));
				if (currRand >= otherRand) {
					total += otherValue;
					count += 1.;
				}
			}
		}
		newValue = min(1., max(0., total / count));
	}
	gl_FragColor = vec4(vec3(newValue), 1.);
}