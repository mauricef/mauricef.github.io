import { defInput, PREFIX } from "./shared.js"

export const VIS =  /*glsl*/`

${PREFIX}
${defInput('u_state')}
varying vec2 uv;
void main() {
    vec2 xy = vec2(uv.x, 1.0-uv.y);
    xy *= u_state.size;     
    vec3 cellRGB = u_state_read(xy, 0.0).rgb/2.0+0.5;
    vec3 rgb = cellRGB;
    gl_FragColor = vec4(rgb, 1.0);
}`