#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform float u_kernel[9];
in vec2 v_texCoord;
out vec4 outValue;

float readKernel(vec2 offset) {
    int index = int(offset.x + 3. * offset.y);
    return u_kernel[index];
}

vec4 readPixel(vec2 offset) {
    vec2 onePixel = vec2(1.) / float(textureSize(u_image,0));
    return texture(u_image, v_texCoord + onePixel * offset);
}

void main() {
    vec4 color = vec4(0.);
    for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <=1; j++) {
            vec2 offset = vec2(i, j);
            vec4 pixel = readPixel(offset);
            float kernel = readKernel(offset);
            color += pixel * kernel;
        }
    }
    outValue = color;
}