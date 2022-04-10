async function generateRandom() {
    const initialState = await tf.tidy(() => tf
        .randomUniform([height, width])
        .array() )
        
    const pixels = new Uint8Array(4 * height * width)
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const color = Math.round(initialState[i][j]  * 255);
            const index = (i * width + j) * 4
            pixels[index + 0] = color
            pixels[index + 1] = color
            pixels[index + 2] = color
            pixels[index + 3] = 255
        }
    }
    return pixels
}


async function run() {
    const initialState = await tf
        .randomUniform([height, width])
        .greater(.5)
        .array()

    const pixels = new Uint8Array(4 * height * width)
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const color = initialState[i][j] ? 255 : 0
            const index = (i * width + j) * 4
            pixels[index + 0] = color
            pixels[index + 1] = color
            pixels[index + 2] = color
            pixels[index + 3] = 255
        }
    }
    const random = createShaderObject(await fetchText("random.glsl"));
    const randomTx = createTexture(width, height);
    const seedTx = createTexture(width, height);
    random.updateUniforms({
        u_seed: seedTx,
        u_resolution: [width, height],
    })

    const mouse = createShaderObject(await fetchText("mouse.glsl"));

    const ising = createShaderObject(await fetchText("ising.glsl"))
    const cellsTx = createTexture(width, height)
    const cellsPrevTx = createTexture(width, height)
    copyPixelsToTexture(pixels, cellsPrevTx, width, height)
    ising.updateUniforms({
        u_resolution: [width, height],
        u_random: randomTx,
        u_backbuffer: cellsPrevTx,
    })

    const burn = createShaderObject(await fetchText("burn.glsl"))
    const burnTx1 = createTexture(width, height)
    const burnTx2 = createTexture(width, height)

    burn.updateUniforms({
        u_resolution: [width, height],
        u_input: cellsTx,
        u_backbuffer: burnTx2,
        u_mix: [0.95, 0.1, 0.5]
    })

    const render = createRenderer()

    monitorTouches(canvas, touches => {
        mouse.updateUniforms({
            u_touch: touches
        })
    })
    
    async function updateRandom() {
        copyPixelsToTexture(await generateRandom(), seedTx, width, height)
        setTimeout(updateRandom, 1000)
    }
    updateRandom()
    
    function animate(t) {
        random.updateUniforms({
            u_time: [t / 1000]
        })
        random.drawTexture(randomTx)
        ising.drawTexture(cellsTx)
        mouse.drawTexture(cellsTx)        
        render(cellsTx, width, height)
        copyTexture(cellsTx, cellsPrevTx, width, height)
        copyTexture(burnTx1, burnTx2, width, height)

        requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
}

run()