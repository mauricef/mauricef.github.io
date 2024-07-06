
export const PREFIX = /*glsl*/`

precision highp float;

struct Tensor {
    vec2 size;
    vec2 gridSize;
    float depth;
    float depth4;
    vec2 packScaleZero;
};
uniform Tensor u_output;

out vec4 output_value;

vec4 _readUV(Tensor tensor, sampler2D tex, vec2 uv) {
    vec4 v = texture(tex, uv);
    vec2 p = tensor.packScaleZero;
    v = (v-p.y)*p.x;
    return v;
}
vec2 _getUV(Tensor tensor, vec2 pos, float ch) {
    ch += 0.5;
    float tx = floor(mod(ch, tensor.gridSize.x));
    float ty = floor(ch / tensor.gridSize.x);
    vec2 p = fract(pos/tensor.size) + vec2(tx, ty);
    p /= tensor.gridSize;
    return p;
}
vec4 _read(Tensor tensor, sampler2D tex, vec2 pos, float ch) {
    vec2 p = _getUV(tensor, pos, ch);
    return _readUV(tensor, tex, p);
}

vec2 getOutputXY() {
    return mod(gl_FragCoord.xy, u_output.size);
}

float getOutputChannel() {
    vec2 xy = floor(gl_FragCoord.xy/u_output.size);
    return xy.y * u_output.gridSize.x + xy.x;
}

void setOutput(vec4 v) {
    vec2 p = u_output.packScaleZero;
    v = v/p.x + p.y;
    output_value = v;
}`

export function defInput(name) {
    return /*glsl*/`
        uniform Tensor ${name};
        uniform sampler2D ${name}_tex;

        vec4 ${name}_read(vec2 pos, float ch) {return _read(${name}, ${name}_tex, pos, ch);}
        vec4 ${name}_readUV(vec2 uv) {return _readUV(${name}, ${name}_tex, uv);}
    `
}