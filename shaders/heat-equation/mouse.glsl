precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_touch[5];

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution;
	bool found = false;

	for (int i = 0; i < 5; i++) { 
		float dist = abs(distance(gl_FragCoord.xy, u_touch[i]));
		if (u_touch[i] != vec2(0.0) && dist < 20.) {
			found = true;
			break;
		}
	}
	if (found) {
		gl_FragColor = vec4(vec3(1.), 1.);
	}
	else {
		gl_FragColor = vec4(vec3(0.), 1.);
	}
}