import { PAINT } from './glsl/paint.js'
import { PERCEPTION } from './glsl/perception.js';
import { DENSE } from './glsl/dense.js';
import { UPDATE } from './glsl/update.js';
import { VIS } from './glsl/vis.js'

const vs_code = /*glsl*/`

attribute vec4 position;
varying vec2 uv;
void main() {
    uv = position.xy*0.5 + 0.5;
    gl_Position = position;
}
`

const PROGRAMS = {
    paint: PAINT,
    perception: PERCEPTION,
    dense: DENSE,
    update: UPDATE,
    vis: VIS
}

function createPrograms(gl, programs) {
    const res = {};
    for (const name in programs) {
        const fs_code = programs[name];
        const progInfo = twgl.createProgramInfo(gl, [vs_code, fs_code]);
        res[name] = progInfo;
    }
    return res;
}

function createTensor(gl, w, h, depth, packScaleZero) {
    const depth4 = Math.ceil(depth / 4);
    const gridW = Math.ceil(Math.sqrt(depth4));
    const gridH = Math.floor((depth4 + gridW - 1) / gridW);
    const texW = w * gridW, texH = h * gridH;

    const attachments = [{ minMag: gl.NEAREST }];
    const fbi = twgl.createFramebufferInfo(gl, attachments, texW, texH);
    const tex = fbi.attachments[0];
    return {
        _type: 'tensor',
        fbi, w, h, depth, gridW, gridH, depth4, tex, packScaleZero
    };
}

function setTensorUniforms(uniforms, name, tensor) {
    uniforms[name + '.size'] = [tensor.w, tensor.h];
    uniforms[name + '.gridSize'] = [tensor.gridW, tensor.gridH];
    uniforms[name + '.depth'] = tensor.depth;
    uniforms[name + '.depth4'] = tensor.depth4;
    uniforms[name + '.packScaleZero'] = tensor.packScaleZero;
    if (name != 'u_output') {
        uniforms[name + '_tex'] = tensor.tex;
    }
}

function createDenseInfo(gl, params) {
    const coefs = [params.scale, 127.0 / 255.0];
    const [in_n, out_n] = params.shape;
    const info = { 
        coefs, 
        layout: params.layout, 
        in_n: in_n - 1, 
        out_n,
        quantScaleZero: params.quant_scale_zero, 
        ready: false 
    }
    info.tex = twgl.createTexture(gl, {
        minMag: gl.NEAREST, src: params.data, flipY: false, premultiplyAlpha: false,
    }, ()=>{
        info.ready = true;
    });
    return info;
}

export class CA {
    constructor(gl, models, gridSize, gui) {
        self = this
        this.gl = gl
        this.gridSize = gridSize
        this.updateProbability = 0.5
        this.layers = []
        this.setWeights(models)
        this.progs = createPrograms(gl, PROGRAMS)
        this.quad = twgl.createBufferInfoFromArrays(gl, {
            position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        })
        this.setupBuffers()
    }

    setupBuffers() {
        const gl = this.gl;
        const [gridW, gridH] = this.gridSize;
        const perception_n = this.layers[0].in_n;
        const lastLayer = this.layers[this.layers.length-1];
        const channel_n = lastLayer.out_n;
        const stateQuantization = lastLayer.quantScaleZero;
        this.buf = {
            control: createTensor(gl, gridW, gridH, 4, [255.0, 0.0]),
            state: createTensor(gl, gridW, gridH, channel_n, stateQuantization),
            newState: createTensor(gl, gridW, gridH, channel_n, stateQuantization),
            perception: createTensor(gl, gridW, gridH, perception_n, stateQuantization),
        };
        for (let i=0; i<this.layers.length; ++i) {
            const layer = this.layers[i];
            this.buf[`layer${i}`] = createTensor(gl, gridW, gridH, layer.out_n, layer.quantScaleZero);
        }
    }

    step() {
        if (!this.layers.every(l=>l.ready)) 
            return;
            
        this.runLayer(self.progs.perception, this.buf.perception, {
            u_state: this.buf.state,
        });
        let inputBuf = this.buf.perception;
        for (let i=0; i<this.layers.length; ++i) {
            this.runDense(this.buf[`layer${i}`], inputBuf, this.layers[i]);
            inputBuf = this.buf[`layer${i}`];
        }
        this.runLayer(this.progs.update, this.buf.newState, {
            u_state: this.buf.state, u_update: inputBuf,
            u_seed: Math.random() * 1000, u_updateProbability: this.updateProbability
        });
        [this.buf.state, this.buf.newState] = [this.buf.newState, this.buf.state];
    }

    paint(x, y, r, brush) {
        this.runLayer(this.progs.paint, this.buf.control, {
            u_pos: [x, y], u_r: r, u_brush: [brush, 0, 0, 0]
        });
    }

    setWeights(models) {
        const gl = this.gl;
        this.layers = models.layers.map(layer=>createDenseInfo(gl, layer));
    }

    runLayer(program, output, inputs) {
        const gl = this.gl;
        inputs = inputs || {};
        const uniforms = {};
        for (const name in inputs) {
            const val = inputs[name];
            if (val._type == 'tensor') {
                setTensorUniforms(uniforms, name, val);
            } else {
                uniforms[name] = val;
            }
        }
        setTensorUniforms(uniforms, 'u_output', output);

        twgl.bindFramebufferInfo(gl, output.fbi);
        gl.useProgram(program.program);
        twgl.setBuffersAndAttributes(gl, program, this.quad);
        twgl.setUniforms(program, uniforms);
        twgl.drawBufferInfo(gl, this.quad);
        return { programName: program.name, output }
    }

    runDense(output, input, layer) {
        return this.runLayer(this.progs.dense, output, {
            u_input: input, u_control: this.buf.control,
            u_weightTex: layer.tex, u_weightCoefs: layer.coefs, u_layout: layer.layout,
            u_seed: Math.random() * 1000
        });
    }

    draw() {
        const gl = this.gl;
        gl.useProgram(this.progs.vis.program);
        twgl.setBuffersAndAttributes(gl, this.progs.vis, this.quad);
        const uniforms = {}
        let inputBuf = this.buf.state;
        
        setTensorUniforms(uniforms, 'u_state', inputBuf);
        twgl.setUniforms(this.progs.vis, uniforms);
        twgl.drawBufferInfo(gl, this.quad);
    }
}