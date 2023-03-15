#version 300 es
precision highp float;

uniform ivec2 u_mousePixelPos;
uniform sampler2D u_solid;
uniform bool u_solidValue;
out vec4 o_fragColor;

void main()
{
    ivec2 texelPos = ivec2(gl_FragCoord.xy);
    bool value = texelFetch(u_solid, texelPos, 0).r == 1.;
    if (u_mousePixelPos == texelPos) {
        value = u_solidValue;
    }
    o_fragColor = vec4(value ? 1. : 0., 0., 0., 1.);
}