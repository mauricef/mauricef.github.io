import {defInput, PREFIX} from './shared.js'

export const PERCEPTION = /*glsl*/`#version 300 es

${PREFIX}
${defInput('u_state')}

const mat3 sobelX = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0)/8.0;
const mat3 sobelY = mat3(-1.0,-2.0,-1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0)/8.0;
const mat3 gauss = mat3(1.0, 2.0, 1.0, 2.0, 4.0-16.0, 2.0, 1.0, 2.0, 1.0)/8.0;
vec4 conv3x3(vec2 xy, float inputCh, mat3 kernel) {
    vec4 a = vec4(0.0);
    for (int y=0; y<3; ++y) {
        for (int x=0; x<3; ++x) {
            vec2 p = xy+vec2(float(x-1), float(y-1));
            a += kernel[y][x] * u_state_read(p, inputCh);
        }
    }
    return a;
}

void main() {
    vec2 xy = getOutputXY();
    float ch = getOutputChannel();
    
    float filterBand = floor((ch+0.5)/u_state.depth4);
    float inputCh = ch-filterBand*u_state.depth4;
    if (filterBand < 0.5) {
        setOutput(u_state_read(xy, inputCh));
    }
    else if (filterBand < 1.5) {
        vec4 dx = conv3x3(xy, inputCh, sobelX);
        setOutput(dx);
    }
    else if (filterBand < 2.5) {
        vec4 dy = conv3x3(xy, inputCh, sobelY);
        setOutput(dy);
    } 
    else {
        setOutput(conv3x3(xy, inputCh, gauss));
    }
}`