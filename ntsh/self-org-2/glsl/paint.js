import { PREFIX} from "./shared.js"

export const PAINT = /*glsl*/`#version 300 es 

${PREFIX}
uniform vec2 u_pos;
uniform float u_r;
uniform float u_blur;

float sigmoid(float x) {
    return 1.0 / (1.0 + exp(-x));
}

void main() {
    vec2 xy = u_pos;
    vec2 xy_out = getOutputXY();
    float diff = u_r - distance(xy_out, xy);
    float sdf = sigmoid(u_blur * diff);
    setOutput(vec4(sdf));
}`