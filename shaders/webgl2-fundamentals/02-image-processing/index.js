async function fetchImage(url) {
    return new Promise(resolve => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.src = url;
        im.onload = () => resolve(im);
    })
}

async function fetchText(url) {
    var response = await fetch(url)
    var text = await response.text()
    return text
}

function createQuadArray(x, y, width, height) {
    var x1 = x
    var x2 = x + width
    var y1 = y
    var y2 = y + height
    return new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2
    ])
}

function blurKernel(weight) {
    var c = weight
    var n = (1 - weight) / 8
    return [
        n,n,n,
        n,c,n,
        n,n,n
    ]
}
async function run() {
    /** @type {HTMLCanvasElement} */
    var canvas = document.querySelector("#c")
    var gl = canvas.getContext("webgl2", {preserveDrawingBuffer:true})
    var vss = await fetchText("./main.vert")
    var fss = await fetchText("./main.frag")
    var img = await fetchImage("./emoji_u1f30d.png")
    var imgTex = twgl.createTexture(gl, {
        src: img
    })
    var programInfo = twgl.createProgramInfo(gl, [vss, fss])
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    var bufferInfo = twgl.createBufferInfoFromArrays(gl, {
        a_texCoord: {
            numComponents: 2,
            data: createQuadArray(0, 0, 1, 1)
        },
        a_position: {
            numComponents: 2,
            data: createQuadArray(0, 0, img.width, img.height)        
        }
    })

    function render(time) {
        var timeInSeconds = time / 1000
        var weight = Math.sin(Math.PI * 2 * timeInSeconds)
        weight = Math.abs(weight)
        console.log(weight)
        gl.useProgram(programInfo.program)
        twgl.setUniforms(programInfo, {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_image: imgTex,
            u_kernel: blurKernel(weight)
        })
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
        twgl.drawBufferInfo(gl, bufferInfo)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
run()

