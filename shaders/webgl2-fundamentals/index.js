function createShader(gl, type, source) {
    var shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader
    }
    console.log(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    var success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) {
        return program
    }
    console.log(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
}

async function fetchText(url) {
    var response = await fetch(url)
    var text = await response.text()
    return text
}

function randomInt(range) {
    return Math.floor(Math.random() * range)
}

function setRectangle(gl, x, y, width, height) {
    var x1 = x
    var x2 = x + width
    var y1 = y
    var y2 = y + height

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2
    ]), gl.STATIC_DRAW)
}

async function run() {
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#c")
    var gl = canvas.getContext("webgl2", {preserveDrawingBuffer:true})
    var vertexShaderSource = await fetchText("./main.vert")
    var fragmentShaderSource = await fetchText("./main.frag")
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    var program = createProgram(gl, vertexShader, fragmentShader)
    var positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    var vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position")
    gl.enableVertexAttribArray(positionAttributeLocation)
    var size = 2
    var type = gl.FLOAT
    var normalize = false
    var stride = 0
    var offset = 0
    gl.vertexAttribPointer(
        positionAttributeLocation,
        size,
        type,
        normalize,
        stride,
        offset
    )
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");    
    gl.useProgram(program)
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height)
    gl.bindVertexArray(vao)
    var colorLocation = gl.getUniformLocation(program, "u_color")
    function render() {
        setRectangle(gl, randomInt(300), randomInt(300), randomInt(300), randomInt(300))
        gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);
        var primitiveType = gl.TRIANGLES
        var offset = 0
        var count = 6
        gl.drawArrays(primitiveType, offset, count)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
run()

