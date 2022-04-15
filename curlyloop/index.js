import {init} from './app/gol/index.js'

function animate(f) {
    function innerAnimate(t) {
        f(t)
        requestAnimationFrame(innerAnimate)
    }
    requestAnimationFrame(innerAnimate)
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


    const app = await init(canvas)
    animate(app.render)
}
load()
