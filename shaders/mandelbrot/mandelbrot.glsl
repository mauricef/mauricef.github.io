precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_zoomCenter;
uniform float u_zoomSize;

const int u_maxIter = 1000;

vec2 f(vec2 z, vec2 c) {
    return vec2(z.x * z.x - z.y * z.y, z.x * z.y + z.x * z.y) + c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  
  vec2 c = u_zoomCenter + (uv * 4.0 - vec2(2.0)) * (u_zoomSize / 4.0);
  
  vec2 z = vec2(0.0);
  bool escaped = false;
  int iter;
  for (int i = 0; i < u_maxIter; i++) {
    iter = i;
    z = f(z, c);
    if (length(z) > 2.0) {
      escaped = true;
      break;
    }
  }
  float iterPct = float(iter) / float(u_maxIter);
  vec3 iterColor = mix(vec3(0.0, 0.5, 1.), vec3(1., 0.8, 0.0), iterPct);
  vec3 color = escaped ? iterColor : vec3(0.0);
  gl_FragColor = vec4(color, 1.0);
}