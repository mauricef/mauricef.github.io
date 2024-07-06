import { PREFIX} from "./shared.js"

export const PAINT = /*glsl*/`#version 300 es 

${PREFIX}
uniform vec2 u_pos;
uniform float u_r;
uniform vec4 u_brush;

float sigmoid(float x) {
    return 1.0 / (1.0 + exp(-x));
}

void main() {
    vec2 xy = u_pos;
    vec2 xy_out = getOutputXY();
    vec2 diff = abs(xy_out-xy);
    diff = min(diff, u_output.size-diff);
    if (length(diff)>=u_r) 
    discard;
    setOutput(u_brush);

}`