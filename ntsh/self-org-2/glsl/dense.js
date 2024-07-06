import { defInput , PREFIX} from "./shared.js"

export const DENSE = /*glsl*/`#version 300 es
${PREFIX}
${defInput('u_input')}
${defInput('u_mask')}
uniform sampler2D u_weightTex;
uniform float u_seed;
uniform vec2 u_weightCoefs; // scale, center
uniform vec2 u_layout;

const float MAX_PACKED_DEPTH = 32.0;

vec4 readWeightUnscaled(vec2 p) {
    vec4 w = texture(u_weightTex, p);
    return w - u_weightCoefs.y;
}

vec4 computeResultForModel(int idx) {
    float modelIdx = float(idx) + .5;

    vec2 xy = getOutputXY();
    float ch = getOutputChannel();

    float dy = 1.0/(u_input.depth+1.0)/u_layout.y;
    vec2 p = vec2((ch+0.5)/u_output.depth4, dy*0.5);

    vec2 realXY = xy;
    p.x += floor(mod(modelIdx, u_layout.x));
    p.y += floor(modelIdx/u_layout.x);
    p /= u_layout;
    vec4 result = vec4(0.0);
    for (float i=0.0; i < MAX_PACKED_DEPTH; i+=1.0) {
        vec4 inVec = u_input_read(xy, i);
        result += inVec.x * readWeightUnscaled(p); p.y += dy;
        result += inVec.y * readWeightUnscaled(p); p.y += dy;
        result += inVec.z * readWeightUnscaled(p); p.y += dy;
        result += inVec.w * readWeightUnscaled(p); p.y += dy;
        if (i+1.5>u_input.depth4) {
            break;
        }
    }
    result += readWeightUnscaled(p);  // bias
    return result;
}

void main() {
    vec2 xy = getOutputXY();
    vec2 realXY = xy;
    float mask = u_mask_read(realXY, 0.0).x;
    vec4 r0 = computeResultForModel(0);
    vec4 r1 = computeResultForModel(1);
    vec4 result = r0 + (r1 - r0) * mask;
    setOutput(result * u_weightCoefs.x);
}`