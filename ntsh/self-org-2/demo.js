import { CA } from './ca.js'

async function createDemo() {
    const root = document.body
    const $ = q => root.querySelector(q)
    const $$ = q => root.querySelectorAll(q)
    const canvas = $('#demo-canvas')
    const gl = canvas.getContext("webgl2")
    const stats = Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    const r = await fetch('assets/models.3.json')
    const models = await r.json()
    const gui = new dat.GUI()
    const params = {
        bg_model: 2,
        center_model: 1,
        size: {w: 256, h: 256},
        reload: function() { reloadDemo() },
        stepsPerFrame: 1
    }
    const name2idx = Object.fromEntries(models.model_names.map((s, i) => [s, i]));
    gui.add(params, 'bg_model').options(name2idx)
    gui.add(params, 'center_model').options(name2idx)
    gui.add(params, 'stepsPerFrame')
    gui.add(params.size, 'w')
    gui.add(params.size, 'h')
    gui.add(params, 'reload')

    var ca = null

    async function reloadDemo() {
        const {w, h} = params.size
        ca = new CA(gl, models, [w, h], gui);
        ca.paint(0, 0, 10000, params.bg_model);
        ca.paint(w/2, h/2, w/4, params.center_model)
        canvas.width = w
        canvas.height = h
    }

    reloadDemo()

    function render(time) {
        stats.begin()
        for (var i=0; i <= params.stepsPerFrame; i++) {
            ca.step()
        }
        twgl.bindFramebufferInfo(gl)
        ca.draw()
        stats.end()
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

createDemo()