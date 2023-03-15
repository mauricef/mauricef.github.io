#version 300 es
precision highp float;

uniform ivec2 u_mousePixelPos;
uniform sampler2D u_fluidAmount;
uniform float u_fluidAmountMax;
uniform float u_fluidAmountIncrement;
out vec4 o_fragColor;

void main()
{
    ivec2 texelPos = ivec2(gl_FragCoord.xy);
    float fluidAmount = texelFetch(u_fluidAmount, texelPos, 0).r;
    if (u_mousePixelPos == texelPos) {
        fluidAmount += u_fluidAmountIncrement;
    }
    fluidAmount = min(u_fluidAmountMax, fluidAmount);
    o_fragColor = vec4(fluidAmount, 0., 0., 1.);
}