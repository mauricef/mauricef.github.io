precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

const vec2 seed_vec = vec2(12.9898,78.233);
const float seed_scale = 43758.5453123;

void main(void){
    float color = fract(u_time);
    color *= seed_scale;
    color *= dot(gl_FragCoord.xy/u_resolution.xy, seed_vec);
    color = sin(color);
    color = fract(color);
    gl_FragColor = vec4(vec3(color), 1.);
}