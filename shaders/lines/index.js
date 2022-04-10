async function run() {
    const lines = createShaderObject(await fetchText("lines.glsl"));
    const linesTx = createTexture(width, height);
    lines.updateUniforms({
        p0: [100, 100],
        p1: [150, 150],
    })
    const render = createRenderer()

    function animate(t) {
        lines.drawTexture(linesTx)        
        render(linesTx, width, height)
        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
}

run()