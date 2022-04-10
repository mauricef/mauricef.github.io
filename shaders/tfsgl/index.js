import  "./tf.min.js"
// Access the raw webgltexture for a TFJS tensor, render it to the TFJS offscreen canvas then blit
// it to a visible canvas

const canvas = document.getElementById("canvas")
const canvasSize = {width:canvas.width, height:canvas.height}

const backend = tf.backend()
const gpgpu = backend.gpgpu
const tensorSize = [canvasSize.width, canvasSize.height]
const tensor = tf.randomUniform(tensorSize).round()
const tensorTextureData = backend.texData.get(tensor.dataId)
const texture = tensorTextureData.texture

const gl = gpgpu.gl
const offscreenCanvas = backend.canvas

function createShader(source, type) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, source)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh))
    }
    return sh
}
const vsSource = `#version 300 es
    precision highp float;
    in vec2 u_position;
    out vec2 v_position;

    void main () {
        gl_Position = vec4(u_position.x, u_position.y, 0.0, 1.0);
        v_position = (u_position + vec2(1.)) / vec2(2.);
    }`
const vs = createShader(vsSource, gl.VERTEX_SHADER)
const fsSource = `#version 300 es
    uniform sampler2D u_texture;
    precision highp float;
    in vec2 v_position;
    out vec4 color;

    void main () {
        color = texture(u_texture, v_position);
    }`
const fs = createShader(fsSource, gl.FRAGMENT_SHADER)

const pg = gl.createProgram()
gl.attachShader(pg, vs)
gl.attachShader(pg, fs)
gl.linkProgram(pg)
if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(pg))
}

const coordinates = [-1, -1, 1, -1, 1, 1, 1, 1, -1, 1, -1, -1]
const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordinates), gl.STATIC_DRAW)
gl.bindBuffer(gl.ARRAY_BUFFER, null)

gl.useProgram(pg)

const u_texture = gl.getUniformLocation(pg, "u_texture")
gl.uniform1i(u_texture, 0)
gl.activeTexture(gl.TEXTURE0 + 0)
gl.bindTexture(gl.TEXTURE_2D, texture)

const u_position = gl.getAttribLocation(pg, "u_position")
gl.enableVertexAttribArray(u_position)
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.vertexAttribPointer(
    u_position,
    2, 
    gl.FLOAT,
    gl.FALSE,
    0,
    0
)

gl.bindFramebuffer(gl.FRAMEBUFFER, null)

gl.drawArrays(
    gl.TRIANGLES, // Type of primitive
    0, // Start index in the array of vector points
    6 // Number of vertices to be rendered
)

gl.bindTexture(gl.TEXTURE_2D, null)
gl.useProgram(null)

const bitmap = offscreenCanvas.transferToImageBitmap()
const bitmapRendererContext = canvas.getContext("bitmaprenderer")
bitmapRendererContext.transferFromImageBitmap(bitmap)