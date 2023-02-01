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

    return twgl.createBufferInfoFromArrays(gl, {
            a_position: {
                numComponents: 2,
                data: new Float32Array([
                    x1, y1,
                    x2, y1,
                    x1, y2,
                    x1, y2,
                    x2, y1,
                    x2, y2
                ])
            }
        })
}

async function run() {
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#c")
    var gl = canvas.getContext("webgl2", {preserveDrawingBuffer:true})
    var vss = await fetchText("./main.vert")
    var fss = await fetchText("./main.frag")
    var programInfo = twgl.createProgramInfo(gl, [vss, fss])
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    function render() {
        var bufferInfo = setRectangle(gl, randomInt(300), randomInt(300), randomInt(300), randomInt(300))
        gl.useProgram(programInfo.program)
        twgl.setUniforms(programInfo, {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_color: [Math.random(), Math.random(), Math.random(), 1]
        })
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.drawBufferInfo(gl, bufferInfo)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
run()

