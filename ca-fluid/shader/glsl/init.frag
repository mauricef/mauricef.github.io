#version 300 es
precision highp float;

uniform uint u_seed;
uniform uint u_frame;
out vec4 o_fragColor;

//https://www.shadertoy.com/view/4tfyW4
const uint UI0 = 1597334673U;
const uint UI1 = 3812015801U;
const uvec2 UI2 = uvec2(UI0, UI1);
const uvec3 UI3 = uvec3(UI0, UI1, 2798796415U);
const uvec4 UI4 = uvec4(UI3, 1979697957U);
const float UIF = (1.0 / float(0xffffffffU));
float hash14(uvec4 q)
{
	q *= UI4;
	uint n = (q.x ^ q.y ^ q.z ^ q.w) * UI0;
	return float(n) * UIF;
}

void main()
{
    uvec4 p = uvec4(gl_FragCoord.xy, u_frame, u_seed);   
    float fluidAmount = hash14(p);
    o_fragColor = vec4(fluidAmount, 0., 0., 1.);
}