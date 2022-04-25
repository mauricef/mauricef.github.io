import {Scene} from '../scene.js'
import {Pointer} from '../pointer.js'
import {html, render} from './libs/lit-html/lit-html.js'

const APPS = [
    'ship',
    'gol'
]
var state = {
    app: null,
    appName: APPS[0],
    paused: false
}


async function load() {
    const canvas = document.getElementById('c')
    const MAX_TEXTURE_SIZE = 1024
    {
        var width = canvas.clientWidth
        var height = canvas.clientHeight
        const ratio = width / height
        if (width > MAX_TEXTURE_SIZE && ratio > 1) {
            width = MAX_TEXTURE_SIZE
            height = Math.floor(width / ratio)
        }
        else if (height > MAX_TEXTURE_SIZE) {
            height = MAX_TEXTURE_SIZE
            width = Math.floor(height * ratio)
        }
    }
    canvas.width = width
    canvas.height = height 

    const gl = canvas.getContext("webgl2") 
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const scene = new Scene(gl)
    const renderProgram = scene.program(await scene.fetchText('./app/render.glsl'))
    const pointer = new Pointer(canvas)
    const context = {scene, canvas, pointer}
    const main = document.getElementById('main')

    function animate() {
        var lastBuffer = null
        function innerAnimate(t) {
            if (!state.paused) {
                lastBuffer = state.app.render(t)
            }
            renderProgram.execute({
                u_input: lastBuffer,
                offset: pointer.offset,
                scale: pointer.scale
            })
            requestAnimationFrame(innerAnimate)
        }
        requestAnimationFrame(innerAnimate)
    }

    async function loadApp(appName) {
        const module = await import(`./app/${appName}/index.js`)
        const app = await module.init(context)
        return app
    }

    function renderAll() {
        const pauseButtonText = state.paused ? 'Play' : 'Pause'
        render(html`
            <button @click=${onPlayPause}>${pauseButtonText}</button>
            <select @input=${onAppSelected} value=${state.appName}>
                ${
                    APPS.map((appName) => html`<option>${appName}</option>`)
                }
            </select>
        `, 
        main)
    }

    async function onAppSelected(e) {
        state.appName = e.target.value
        state.app = await loadApp(state.appName)
        renderAll()
    }
    
    function onPlayPause(e) {
        state.paused = !state.paused
        renderAll()
    }
    state.app = await loadApp(state.appName)
    renderAll()
    animate()
}
load()
