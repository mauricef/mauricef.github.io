precision highp float;

uniform sampler2D u_backbuffer;
uniform vec2 u_resolution;
varying vec2 vUv;

vec4 sample(sampler2D sampler, float x, float y) {
    vec2 pixel = 1. / u_resolution;
    vec2 sample = mod(vUv + pixel * vec2(x, y), 1.);
    return texture2D(sampler, sample);
}

void main(void) {		
    float value = sample(u_backbuffer, 0., 0.).r;
    
    float sum = 0.0;
    sum += sample(u_backbuffer, -1., -1.).r;
    sum += sample(u_backbuffer, 0., -1.).r;
    sum += sample(u_backbuffer, 1., -1.).r;
    sum += sample(u_backbuffer, -1., 1.).r;
    sum += sample(u_backbuffer, 0., 1.).r;
    sum += sample(u_backbuffer, 1., 1.).r;
    sum += sample(u_backbuffer, -1., 0.).r;
    sum += sample(u_backbuffer, 1., 0.).r;
    
    if(value == 1.0 && (sum < 2.0 || sum > 3.0)){
        value = 0.0;
    } 
    else if(value == 0.0 && sum == 3.0){
        value = 1.0;
    }
    gl_FragColor = vec4(value, value, value, 1.);
}