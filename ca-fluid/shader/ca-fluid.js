import {Context, SingleBuffer, DoubleBuffer, fetchText, canvasPixelPositionFromMouseEvent, readPixelValueFromFrameBuffer} from './shared.js'

const MAX_UINT32 = 4294967295
const MAX_FLUID = 1.
const MOUSE_FLUID_FLOW_RATE = 16/256;

async function run() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#c")
    const vss = await fetchText("./glsl/main.vert")
    const context = new Context({canvas, vss})
    const gl = context.gl
    const initProgram = await context.createProgram("./glsl/init.frag")
    const mouseSolidProgram = await context.createProgram("./glsl/mouseSolid.frag")
    const flowVerticalProgram = await context.createProgram("./glsl/flowVertical.frag")
    const mouseFluidProgram = await context.createProgram("./glsl/mouseFluid.frag")
    const renderProgram = await context.createProgram("./glsl/render.frag")
    const randomTexture = new SingleBuffer(gl)
    const fluidAmountTexture = new DoubleBuffer(gl)
    const solidTexture = new DoubleBuffer(gl)
    initProgram.execute(randomTexture, {
        u_seed: Math.random() * MAX_UINT32
    })

    canvas.oncontextmenu = (e) => {
        e.preventDefault()
    }

    var mouseButtons = 0
    var mousePixelPos = null
    var solidValueToWrite = false
    canvas.onmousedown = (e) => {
        mouseButtons = e.buttons
        mousePixelPos = canvasPixelPositionFromMouseEvent(e)
        if (mouseButtons & 1) {
            const framebuffer = solidTexture.buffers[0].fbi.framebuffer
            const pixelValue = readPixelValueFromFrameBuffer(gl, framebuffer, mousePixelPos)
            solidValueToWrite = pixelValue[0] == 0
        }
    }
    canvas.onmousemove = (e) => {
        mouseButtons = e.buttons
        mousePixelPos = canvasPixelPositionFromMouseEvent(e)
    }
    canvas.onmouseup = (e) => {
        mouseButtons = 0
        mousePixelPos = null
    }

    const canvasPixelSize =  [canvas.width, canvas.height]
    function render(time) {
        flowVerticalProgram.execute(fluidAmountTexture, {
            u_fluidMax: MAX_FLUID,
            u_fluidAmount: fluidAmountTexture,
            u_solid: solidTexture
        })

        if (mouseButtons & 1) {
            mouseSolidProgram.execute(solidTexture, {
                u_solid: solidTexture,
                u_mousePixelPos: [mousePixelPos.x, mousePixelPos.y],
                u_solidValue: solidValueToWrite
            })
        }
        if (mouseButtons & 2) {
            mouseFluidProgram.execute(fluidAmountTexture, {
                u_fluidAmount: fluidAmountTexture,
                u_fluidAmountMax: MAX_FLUID,
                u_fluidAmountIncrement: MOUSE_FLUID_FLOW_RATE,
                u_mousePixelPos: [mousePixelPos.x, mousePixelPos.y],
            })
        }
        renderProgram.execute(null, {
            u_fluidAmount: fluidAmountTexture,
            u_solid: solidTexture
        })
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
run()

