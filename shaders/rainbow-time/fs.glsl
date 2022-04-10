precision highp float;

#define PI 3.141592

uniform vec2 u_resolution;
uniform float u_time;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float u_seconds = u_time / 1000.;
    float r = abs(sin(u_seconds * PI) + sin(uv.x * 17. * PI));
    float g = abs(sin(u_seconds * 2. * PI) + sin(uv.y * 71. * PI));
    float b = abs(sin(u_seconds * 4. * PI) + sin(uv.x * uv.y * 49. * PI));
    gl_FragColor = vec4(r, g, b, 1.0);
}