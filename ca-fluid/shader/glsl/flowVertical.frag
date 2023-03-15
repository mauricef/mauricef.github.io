#version 300 es
precision highp float;

uniform float u_fluidMax;
uniform sampler2D u_fluidAmount;
uniform sampler2D u_solid;
out vec4 outputFluidAmount;

void main ()
{
    ivec2 texelPos = ivec2(gl_FragCoord.xy);
    bool isSolid = texelFetch(u_solid, texelPos, 0).r == 1.;
    float nextFluidAmount = 0.;
    if (isSolid) {
        nextFluidAmount = 0.;
    }
    else {
        float fluidAmount = texelFetch(u_fluidAmount, texelPos, 0).r;
        float fluidAmountAbove = texelFetch(u_fluidAmount, texelPos + ivec2(0, 1), 0).r;
        float fluidAmountBelow = texelFetch(u_fluidAmount, texelPos + ivec2(0, -1), 0).r;
        bool isSolidBelow = texelFetch(u_solid, texelPos + ivec2(0, -1), 0).r == 1.;
        isSolidBelow = isSolidBelow || (texelPos.y == 0);
        float inFlowAbove = min(fluidAmountAbove, u_fluidMax - fluidAmount);
        float outFlowBelow = 0.;
        if (!isSolidBelow) {
            outFlowBelow = min(fluidAmount, u_fluidMax - fluidAmountBelow);
        }
        nextFluidAmount = fluidAmount + inFlowAbove - outFlowBelow;
    }
    outputFluidAmount = vec4(nextFluidAmount, 0., 0., 1.);
}