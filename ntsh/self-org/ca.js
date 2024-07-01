const vs_code = `
    attribute vec4 position;
    varying vec2 uv;
    void main() {
        uv = position.xy*0.5 + 0.5;
        gl_Position = position;
    }
`

function defInput(name) {
    return `
        uniform Tensor ${name};
        uniform sampler2D ${name}_tex;

        vec4 ${name}_read(vec2 pos, float ch) {return _read(${name}, ${name}_tex, pos, ch);}
        vec4 ${name}_read01(vec2 pos, float ch) {return _read01(${name}, ${name}_tex, pos, ch);}
        vec4 ${name}_readUV(vec2 uv) {return _readUV(${name}, ${name}_tex, uv);}
    `
}

const PREFIX = `
    precision highp float;

    // "Hash without Sine" by David Hoskins (https://www.shadertoy.com/view/4djSRW)
    float hash13(vec3 p3) {
      p3  = fract(p3 * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    vec2 hash23(vec3 p3)
    {
        p3 = fract(p3 * vec3(.1031, .1030, .0973));
        p3 += dot(p3, p3.yzx+33.33);
        return fract((p3.xx+p3.yz)*p3.zy);
    }

    struct Tensor {
        vec2 size;
        vec2 gridSize;
        float depth, depth4;
        vec2 packScaleZero;
    };
    uniform Tensor u_output;

    vec4 _readUV(Tensor tensor, sampler2D tex, vec2 uv) {
        vec4 v = texture2D(tex, uv);
        vec2 p = tensor.packScaleZero;
        v = (v-p.y)*p.x;
        return v;
    }
    vec2 _getUV(Tensor tensor, vec2 pos, float ch) {
        ch += 0.5;
        float tx = floor(mod(ch, tensor.gridSize.x));
        float ty = floor(ch / tensor.gridSize.x);
        vec2 p = fract(pos/tensor.size) + vec2(tx, ty);
        p /= tensor.gridSize;
        return p;
    }
    vec4 _read01(Tensor tensor, sampler2D tex, vec2 pos, float ch) {
        return texture2D(tex, _getUV(tensor, pos, ch));
    }
    vec4 _read(Tensor tensor, sampler2D tex, vec2 pos, float ch) {
        vec2 p = _getUV(tensor, pos, ch);
        return _readUV(tensor, tex, p);
    }
    vec2 getOutputXY() {
        return mod(gl_FragCoord.xy, u_output.size);
    }
    float getOutputChannel() {
        vec2 xy = floor(gl_FragCoord.xy/u_output.size);
        return xy.y*u_output.gridSize.x+xy.x;
    }

    void setOutput(vec4 v) {
        vec2 p = u_output.packScaleZero;
        v = v/p.x + p.y;
        gl_FragColor = v;
    }

    ${defInput('u_input')}
`;

const PROGRAMS = {
    paint: `
    uniform vec2 u_pos;
    uniform float u_r;
    uniform vec4 u_brush;

    float sigmoid(float x) {
        return 1.0 / (1.0 + exp(-x));
    }

    void main() {
        vec2 xy = u_pos;
        vec2 xy_out = getOutputXY();
        vec2 diff = abs(xy_out-xy);
        diff = min(diff, u_output.size-diff);
        if (length(diff)>=u_r) 
          discard;
        setOutput(u_brush);

    }`,
    perception: `
    const mat3 sobelX = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0)/8.0;
    const mat3 sobelY = mat3(-1.0,-2.0,-1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0)/8.0;
    const mat3 gauss = mat3(1.0, 2.0, 1.0, 2.0, 4.0-16.0, 2.0, 1.0, 2.0, 1.0)/8.0;
    vec4 conv3x3(vec2 xy, float inputCh, mat3 filter) {
        vec4 a = vec4(0.0);
        for (int y=0; y<3; ++y) {
            for (int x=0; x<3; ++x) {
                vec2 p = xy+vec2(float(x-1), float(y-1));
                a += filter[y][x] * u_input_read(p, inputCh);
            }
        }
        return a;
    }

    void main() {
        vec2 xy = getOutputXY();
        float ch = getOutputChannel();
        if (ch >= u_output.depth4)
            return;

        float filterBand = floor((ch+0.5)/u_input.depth4);
        float inputCh = ch-filterBand*u_input.depth4;
        if (filterBand < 0.5) {
            setOutput(u_input_read(xy, inputCh));
        }
        else if (filterBand < 1.5) {
            vec4 dx = conv3x3(xy, inputCh, sobelX);
            setOutput(dx);
        }
        else if (filterBand < 2.5) {
            vec4 dy = conv3x3(xy, inputCh, sobelY);
            setOutput(dy);
        } 
        else {
            setOutput(conv3x3(xy, inputCh, gauss));
        }
    }`,
    dense: `
    ${defInput('u_control')}
    uniform sampler2D u_weightTex;
    uniform float u_seed;
    uniform vec2 u_weightCoefs; // scale, center
    uniform vec2 u_layout;
    
    const float MAX_PACKED_DEPTH = 32.0;
    
    vec4 readWeightUnscaled(vec2 p) {
        vec4 w = texture2D(u_weightTex, p);
        return w-u_weightCoefs.y;
    }
    
    void main() {
      vec2 xy = getOutputXY();
      float ch = getOutputChannel();
      if (ch >= u_output.depth4)
          return;

      float dy = 1.0/(u_input.depth+1.0)/u_layout.y;
      vec2 p = vec2((ch+0.5)/u_output.depth4, dy*0.5);

      vec2 realXY = xy;
      float modelIdx = u_control_read(realXY, 0.0).x+0.5;
      p.x += floor(mod(modelIdx, u_layout.x));
      p.y += floor(modelIdx/u_layout.x);
      p /= u_layout;
      vec4 result = vec4(0.0);
      for (float i=0.0; i < MAX_PACKED_DEPTH; i+=1.0) {
          vec4 inVec = u_input_read(xy, i);
          result += inVec.x * readWeightUnscaled(p); p.y += dy;
          result += inVec.y * readWeightUnscaled(p); p.y += dy;
          result += inVec.z * readWeightUnscaled(p); p.y += dy;
          result += inVec.w * readWeightUnscaled(p); p.y += dy;
          if (i+1.5>u_input.depth4) {
              break;
          }
      }
      result += readWeightUnscaled(p);  // bias
      setOutput(result*u_weightCoefs.x);
    }`,
    update: `
    ${defInput('u_update')}
    uniform float u_seed, u_updateProbability;

    varying vec2 uv;

    void main() {
      vec2 xy = getOutputXY();
      float ch = getOutputChannel();
      vec4 state = u_input_read(xy, ch);
      vec4 update = vec4(0.0);
      if (hash13(vec3(xy, u_seed)) <= u_updateProbability) {
        update = u_update_readUV(uv);    
      }
      setOutput(state + update);
    }`,
    vis: `
    varying vec2 uv;
    void main() {
        vec2 xy = vec2(uv.x, 1.0-uv.y);
        xy *= u_input.size;
        vec2 fp = 2.0*fract(xy)-1.0;        
        vec3 cellRGB = u_input_read(xy, 0.0).rgb/2.0+0.5;
        vec3 rgb = cellRGB;
        gl_FragColor = vec4(rgb, 1.0);
    }`
}

function createPrograms(gl, defines) {
    defines = defines || '';
    const res = {};
    for (const name in PROGRAMS) {
        const fs_code = defines + PREFIX + PROGRAMS[name];
        const progInfo = twgl.createProgramInfo(gl, [vs_code, fs_code]);
        progInfo.name = name;
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
        self = this;
        this.gl = gl;
        this.gridSize = gridSize || [96, 96];
        this.updateProbability = 0.5;
        this.layers = [];
        this.setWeights(models);
        this.progs = createPrograms(gl);
        this.quad = twgl.createBufferInfoFromArrays(gl, {
            position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
        });
        this.setupBuffers();
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
            u_input: this.buf.state,
        });
        let inputBuf = this.buf.perception;
        for (let i=0; i<this.layers.length; ++i) {
            this.runDense(this.buf[`layer${i}`], inputBuf, this.layers[i]);
            inputBuf = this.buf[`layer${i}`];
        }
        this.runLayer(this.progs.update, this.buf.newState, {
            u_input: this.buf.state, u_update: inputBuf,
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
        
        setTensorUniforms(uniforms, 'u_input', inputBuf);
        twgl.setUniforms(this.progs.vis, uniforms);
        twgl.drawBufferInfo(gl, this.quad);
    }
}