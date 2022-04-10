'use strict';

import {fetchText, scaleByPixelRatio} from './utils.js'
import {pointers} from './input.js'
import {blit, canvas, gl, ext, compileShader, createFBO, createDoubleFBO} from './webgl.js'
import {Program} from './program.js'

async function run() {
   resizeCanvas();

    let config = {
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 128,
        DENSITY_DISSIPATION: .5,
        VELOCITY_DISSIPATION: 0.2,
        PRESSURE_ITERATIONS: 32,
        SPLAT_RADIUS: 0.01,
        SPLAT_FORCE: 6000
    }

    let splatStack = [];
    
    let dye;
    let pixelatedDye;
    let velocity;
    let pressure;


    const baseVertexShader = compileShader(gl.VERTEX_SHADER, await fetchText('./glsl/baseVertex.glsl'))

    async function createProgram(fragmentShaderName) {
        let source = await fetchText(`./glsl/${fragmentShaderName}.glsl`)
        let fragmentShader = compileShader(gl.FRAGMENT_SHADER, source);
        return new Program(baseVertexShader, fragmentShader)
    }

    const splatProgram           = await createProgram('splat')
    const advectionProgram       = await createProgram('advection')
    const pressureProgram        = await createProgram('pressure')
    const gradienSubtractProgram = await createProgram('gradientSubtract')
    const displayProgram = await createProgram('display')
    const displayProgram2 = await createProgram('display2')

    function initFramebuffers () {
        let simRes = getResolution(config.SIM_RESOLUTION);
        let dyeRes = getResolution(config.DYE_RESOLUTION);

        const texType = ext.halfFloatTexType;
        const rgba    = ext.formatRGBA;
        const rg      = ext.formatRG;
        const r       = ext.formatR;
        const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

        gl.disable(gl.BLEND);

        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);  
        pressure   = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        pixelatedDye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
    }

    initFramebuffers();
    multipleSplats(parseInt(Math.random() * 20) + 5);

    let lastUpdateTime = Date.now();
    update();

    function update () {
        const dt = calcDeltaTime();
        applyInputs();
        step(dt);
        render(null);
        requestAnimationFrame(update);
    }

    function calcDeltaTime () {
        let now = Date.now();
        let dt = (now - lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        lastUpdateTime = now;
        return dt;
    }

    function resizeCanvas () {
        let width = scaleByPixelRatio(canvas.clientWidth);
        let height = scaleByPixelRatio(canvas.clientHeight);
        if (canvas.width != width || canvas.height != height) {
            canvas.width = width;
            canvas.height = height;
            return true;
        }
        return false;
    }

    function applyInputs () {
        if (splatStack.length > 0)
            multipleSplats(splatStack.pop());

        pointers.forEach(p => {
            if (p.moved) {
                p.moved = false;
                splatPointer(p);
            }
        });
    }

    function step (dt) {
        gl.disable(gl.BLEND);

        pressureProgram.bind();
        gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(pressureProgram.uniforms.uVelocity, velocity.read.attach(0));
        for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
            gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        gradienSubtractProgram.bind();
        gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        advectionProgram.bind();
        gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        let velocityId = velocity.read.attach(0);
        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
        gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
        gl.uniform1f(advectionProgram.uniforms.dt, dt);
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
        blit(dye.write);
        dye.swap();

        displayProgram2.bind();
        gl.uniform1i(displayProgram2.uniforms.uTexture, dye.read.attach(0));
        blit(pixelatedDye.write);
        pixelatedDye.swap();
    }

    function render (target) {
        if (target == null || !config.TRANSPARENT) {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
        }
        else {
            gl.disable(gl.BLEND);
        }
        drawDisplay(target);
    }


    function drawDisplay (target) {
        displayProgram.bind();
        gl.uniform1i(displayProgram.uniforms.uTexture, pixelatedDye.read.attach(0));
        blit(target);
    }

    function splatPointer (pointer) {
        let dx = pointer.deltaX * config.SPLAT_FORCE;
        let dy = pointer.deltaY * config.SPLAT_FORCE;
        splat(pointer.texcoordX, pointer.texcoordY, dx, dy);
    }

    function multipleSplats (amount) {
        for (let i = 0; i < amount; i++) {
            const x = Math.random();
            const y = Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            splat(x, y, dx, dy);
        }
    }

    function splat (x, y, dx, dy) {
        splatProgram.bind();
        gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(splatProgram.uniforms.point, x, y);
        gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(splatProgram.uniforms.color, 256, 256, 256);
        blit(dye.write);
        dye.swap();
    }

    function correctRadius (radius) {
        let aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1)
            radius *= aspectRatio;
        return radius;
    }

    window.addEventListener('keydown', e => {
        if (e.code === 'KeyP')
            config.PAUSED = !config.PAUSED;
        if (e.key === ' ')
            splatStack.push(parseInt(Math.random() * 20) + 5);
    });


    function wrap (value, min, max) {
        let range = max - min;
        if (range == 0) return min;
        return (value - min) % range + min;
    }

    function getResolution (resolution) {
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1)
            aspectRatio = 1.0 / aspectRatio;

        let min = Math.round(resolution);
        let max = Math.round(resolution * aspectRatio);

        if (gl.drawingBufferWidth > gl.drawingBufferHeight)
            return { width: max, height: min };
        else
            return { width: min, height: max };
    }

    function getTextureScale (texture, width, height) {
        return {
            x: width / texture.width,
            y: height / texture.height
        };
    }
}

run()