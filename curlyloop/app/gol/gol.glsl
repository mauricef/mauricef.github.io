#version 300 es
precision highp float;

in vec2 uv;
uniform vec2 u_resolution;
uniform sampler2D u_prev;
out vec4 color;
    
vec4 sample_texture(sampler2D sampler, vec2 uv, float dx, float dy) {
    vec2 pixelSize = 1. / u_resolution;
    vec2 position = mod(uv + pixelSize * vec2(dx, dy), 1.);
    return texture(sampler, position);
}
float gol(sampler2D state, vec2 uv) {
    float value = sample_texture(state, uv, 0., 0.).r;
    float sum = 0.0;
    for (float dx=-1.;dx<=1.;dx++) {
        for (float dy=-1.;dy<=1.;dy++) {
            sum += sample_texture(state, uv, dx, dy).r;
        }
    }
    if(value == 1.0 && (sum < 2.0 || sum > 3.0)){
        return 0.0;
    } 
    else if(value == 0.0 && sum == 3.0){
        return 1.0;
    }
    else {
        return value;
    }
}

void main() {
    float p = .5;
    vec2 xy = gl_FragCoord.xy;
    float value = gol(u_prev, uv);
    color = vec4(vec3(value), 1.);
}