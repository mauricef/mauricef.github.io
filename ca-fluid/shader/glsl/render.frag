#version 300 es
precision highp float;

uniform sampler2D u_fluidAmount;
uniform sampler2D u_solid;
out vec4 o_fragColor;

void main()
{
    ivec2 texelPos = ivec2(gl_FragCoord.xy);
    float fluidAmount = texelFetch(u_fluidAmount, texelPos, 0).r;
    float solidFlag = texelFetch(u_solid, texelPos, 0).r;
    if (solidFlag == 1.) {
        o_fragColor = vec4(0, 0, 0, 1);
    }
    else {
        o_fragColor = vec4(0, 0, 1, fluidAmount);
    }
}