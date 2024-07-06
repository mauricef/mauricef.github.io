import { defInput, PREFIX } from "./shared.js"

export const UPDATE = /*glsl*/`#version 300 es

${PREFIX}
${defInput('u_state')}
${defInput('u_update')}
uniform float u_seed;
uniform float u_updateProbability;

in vec2 uv;

// "Hash without Sine" by David Hoskins (https://www.shadertoy.com/view/4djSRW)
float hash13(vec3 p3) {
    p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec4 update = u_update_readUV(uv); 
    vec4 state = u_state_readUV(uv);
    float pUpdate = hash13(vec3(gl_FragCoord.xy, u_seed));
    if (pUpdate <= u_updateProbability) {
        state += update;
    }
    setOutput(state);
}`