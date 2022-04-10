import { createCA } from './ca.js'

function isInViewport(element) {
  var rect = element.getBoundingClientRect();
  var html = document.documentElement;
  var w = window.innerWidth || html.clientWidth;
  var h = window.innerHeight || html.clientHeight;
  return rect.top < h && rect.left < w && rect.bottom > 0 && rect.right > 0;
}

export function createDemo() {  
    const W=96, H=96;
    let demo;
    const modelDir = 'webgl_models8';
    let target = '🦎';
    let experiment = 'ex3';
    let paused = false;

    const canvas = document.getElementById('demo-canvas');
    const gl = canvas.getContext("webgl");
    canvas.width = W*6;
    canvas.height = H*6;

    function initUI() {
      let spriteX = 0;

      function canvasToGrid(x, y) {
        const [w, h] = demo.gridSize;
        const gridX = Math.floor(x / canvas.clientWidth * w);
        const gridY = Math.floor(y / canvas.clientHeight * h);
        return [gridX, gridY];
      }
      function getMousePos(e) {
        return canvasToGrid(e.offsetX, e.offsetY);
      }
      function getTouchPos(touch) {
        const rect = canvas.getBoundingClientRect();
        return canvasToGrid(touch.clientX-rect.left, touch.clientY - rect.top);
      }
  
      let doubleClick = false;
      let justSeeded = false;
      function click(pos) {
        const [x, y] = pos;
        if (doubleClick) {
          demo.paint(x, y, 1, 'seed');
          doubleClick = false;
          justSeeded = true;
          setTimeout(()=>{ justSeeded = false; }, 100);
        } else {
          doubleClick = true;
          setTimeout(()=>{ 
            doubleClick = false; 
          }, 300);
          demo.paint(x, y, 8, 'clear');
        }
      }
      function move(pos) {
        const [x, y] = pos;
        if (!justSeeded) {
          demo.paint(x, y, 8, 'clear');
        }
      }

      canvas.onmousedown = e => {
        e.preventDefault();
        if (e.buttons == 1) {
          click(getMousePos(e));
        }
      }
      canvas.onmousemove = e => {
        e.preventDefault();
        if (e.buttons == 1) {
          move(getMousePos(e));
        }
      }
      canvas.addEventListener("touchstart", e=>{
        e.preventDefault();
        click(getTouchPos(e.changedTouches[0]));
      });
      canvas.addEventListener("touchmove", e=>{
        e.preventDefault();
        for (const t of e.touches) {
          move(getTouchPos(t));
        }
      });
    }

    async function updateModel() {
      const r = await fetch(`webgl.json`);
      const model = await r.json();
      if (!demo) {
        demo = createCA(gl, model, [W, H]);
        initUI();        
        requestAnimationFrame(render);
      } else {
        demo.setWeights(model);
        demo.reset();
      }
    }
    updateModel();
  
    let lastDrawTime = 0;
    let stepsPerFrame = 1;
    let frameCount = 0;
  
    function render(time) {
      if  (!isInViewport(canvas)) {
        requestAnimationFrame(render);
        return;
      }
  
      if (!paused) {
        const speed = 1.
        if (speed <= 0) {  // slow down by skipping steps
          const skip = [1, 2, 10, 60][-speed];
          stepsPerFrame = (frameCount % skip) ? 0 : 1;
          frameCount += 1;
        } else if (speed > 0) { // speed up by making more steps per frame
          const interval = time - lastDrawTime;
          stepsPerFrame += interval<20.0 ? 1 : -1;
          stepsPerFrame = Math.max(1, stepsPerFrame);
          stepsPerFrame = Math.min(stepsPerFrame, [1, 2, 4, Infinity][speed])
        }
        const rotation = 45;
        demo.setAngle(rotation);
        for (let i=0; i<stepsPerFrame; ++i) {
          demo.step();
        }
      }
      lastDrawTime = time;

      twgl.bindFramebufferInfo(gl);
      demo.draw();
      requestAnimationFrame(render);
    }
}