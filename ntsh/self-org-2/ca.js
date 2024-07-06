import { PAINT } from './glsl/paint.js'
import { PERCEPTION } from './glsl/perception.js';
import { DENSE } from './glsl/dense.js';
import { UPDATE } from './glsl/update.js';
import { VIS } from './glsl/vis.js'

const vs_code = /*glsl*/`#version 300 es

in vec4 position;
out vec2 uv;
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

class Dense {
    constructor({gl, gridSize}) {
        this.gl = gl
        this.gridSize = gridSize
        this.layers = []
        this.buf = {}
    }
    createDenseInfo(params) {
        const gl = this.gl
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
    setWeights(models) {
        this.layers = models.layers.map(layer=>this.createDenseInfo(layer))
    }
    setupBuffers() {
        const [gridW, gridH] = this.gridSize;
        for (let i=0; i<this.layers.length; ++i) {
            const layer = this.layers[i];
            this.buf[`layer${i}`] = createTensor(this.gl, gridW, gridH, layer.out_n, layer.quantScaleZero);
        }
    }
}

class Grid {
    constructor({gl, gridSize}) {
        this.gl = gl
        this.gridSize = gridSize
        this.quad = twgl.createBufferInfoFromArrays(gl, {
            position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        })
    }
    runProgram(program, inputs, output) {
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
        if (output != null) {
            setTensorUniforms(uniforms, 'u_output', output);
            twgl.bindFramebufferInfo(gl, output.fbi);
        }

        gl.useProgram(program.program);
        twgl.setBuffersAndAttributes(gl, program, this.quad);
        twgl.setUniforms(program, uniforms);
        twgl.drawBufferInfo(gl, this.quad);
    }
}

const PERCEPTION_KERNEL_COUNT = 4
export class CA {
    constructor({gl, models, gridSize, ch, quantScaleZero}) {
        self = this
        this.gl = gl
        this.grid = new Grid({gl, gridSize})
        this.ch = ch
        this.quantScaleZero = quantScaleZero
        this.dense = new Dense({gl, gridSize})
        this.gridSize = gridSize
        this.updateProbability = 0.5
        this.dense.setWeights(models)
        this.progs = createPrograms(gl, PROGRAMS)
        this.setupBuffers()
        this.dense.setupBuffers()
    }

    setupBuffers() {
        const gl = this.gl;
        const [gridW, gridH] = this.gridSize;
        const stateQuantization = this.quantScaleZero;
        this.buf = {
            mask: createTensor(gl, gridW, gridH, 1, [255.0, 0.0]),
            state: createTensor(gl, gridW, gridH, this.ch, stateQuantization),
            newState: createTensor(gl, gridW, gridH, this.ch, stateQuantization),
            perception: createTensor(gl, gridW, gridH, PERCEPTION_KERNEL_COUNT * this.ch, stateQuantization),
        }
    }

    step() {
        this.grid.runProgram(self.progs.perception, {
            u_state: this.buf.state,
        }, this.buf.perception);

        let inputBuf = this.buf.perception;
        for (let i=0; i<this.dense.layers.length; ++i) {
            this.runDense(this.dense.layers[i], inputBuf, this.dense.buf[`layer${i}`]);
            inputBuf = this.dense.buf[`layer${i}`];
        }
        this.grid.runProgram(this.progs.update,{
            u_state: this.buf.state, u_update: inputBuf,
            u_seed: Math.random() * 1000, u_updateProbability: this.updateProbability
        }, this.buf.newState);
        [this.buf.state, this.buf.newState] = [this.buf.newState, this.buf.state];
    }

    paint(x, y, r, blur) {
        this.grid.runProgram(this.progs.paint, {
            u_pos: [x, y], u_r: r, u_blur: blur
        }, this.buf.mask);
    }
    
    runDense(layer, input, output) {
        return this.grid.runProgram(this.progs.dense, {
            u_input: input, u_mask: this.buf.mask,
            u_weightTex: layer.tex, u_weightCoefs: layer.coefs, u_layout: layer.layout,
            u_seed: Math.random() * 1000
        }, output);
    }

    draw() {
        this.grid.runProgram(this.progs.vis, {u_state: this.buf.state})
    }
}