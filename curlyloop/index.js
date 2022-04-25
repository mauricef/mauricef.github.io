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

function animate() {
    function innerAnimate(t) {
        if (!state.paused) {
            state.app.render(t)
        }
        requestAnimationFrame(innerAnimate)
    }
    requestAnimationFrame(innerAnimate)
}

async function loadApp(appName, context) {
    const module = await import(`./app/${appName}/index.js`)
    const app = await module.init(context)
    return app
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

    const main = document.getElementById('main')
    const pointer = new Pointer(canvas)
    const context = {canvas, pointer}

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
        state.app = await loadApp(state.appName, context)
        renderAll()
    }
    
    function onPlayPause(e) {
        state.paused = !state.paused
        renderAll()
    }
    state.app = await loadApp(state.appName, context)
    renderAll()
    animate()
}
load()
