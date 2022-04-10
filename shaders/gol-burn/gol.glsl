precision highp float;

const float dist_min = 20.;
uniform sampler2D u_backbuffer;
uniform vec2 u_resolution;
uniform vec3 u_touch[5];
uniform float u_time;

float random(vec2 st) {
	vec2 seed_vec = vec2(12.9898,78.233);
	float seed_scale = 43758.5453123;
    return fract(
		sin(
			dot(st.xy, seed_vec)) * seed_scale * fract(u_time));
}

void main(void){
    vec2 position = gl_FragCoord.xy / u_resolution;
    vec2 pixel = 1. / u_resolution;
	bool foundValue = false;
    
	float value = texture2D(u_backbuffer, position).r;
	for (int i = 0; i < 5; i++) { 
		float dist = abs(distance(gl_FragCoord.xy, u_touch[i].xy));
		float threshold = dist_min;
		if (u_touch[i] != vec3(0) && dist < threshold) {
			value = floor(random(gl_FragCoord.xy) + .5);
			foundValue = true;
		}
	}
	if (foundValue) {
		gl_FragColor = vec4(value, value, value, 1.0);
	}
	else {
		float sum = 0.0;

		sum += texture2D(u_backbuffer, position + pixel * vec2(-1.0, -1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(0.0, -1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(1.0, -1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(-1.0, 1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(0.0, 1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(1.0, 1.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(-1.0, 0.0)).r;
		sum += texture2D(u_backbuffer, position + pixel * vec2(1.0, 0.0)).r;
		
		if(value == 1.0 && (sum < 2.0 || sum > 3.0)){
			value = 0.0;
		} 
		else if(value == 0.0 && sum == 3.0){
			value = 1.0;
		}
		gl_FragColor = vec4(value, value, value, 1.);
	}
}