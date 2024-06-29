import { CA } from './ca.js'

function isInViewport(element) {
  var rect = element.getBoundingClientRect();
  var html = document.documentElement;
  var w = window.innerWidth || html.clientWidth;
  var h = window.innerHeight || html.clientHeight;
  return rect.top < h && rect.left < w && rect.bottom > 0 && rect.right > 0;
}

export function createDemo(divId) {
  const root = document.getElementById(divId);
  const $ = q => root.querySelector(q);
  const $$ = q => root.querySelectorAll(q);

  const W = 256, H = 256
  let ca = null;
  const canvas = $('#demo-canvas');
  canvas.width = W; 
  canvas.height = H;
  const gl = canvas.getContext("webgl");
  const params = {
    modelSet: 'demo/models.json',
    models: null,
    model: 0,
    brushSize: 20,
  };
  let gui = null;
  function createGUI(models) {
    if (gui != null) {
      gui.destroy();
    }
    gui = new dat.GUI();
    const name2idx = Object.fromEntries(models.model_names.map((s, i) => [s, i]));
    gui.add(params, 'model').options(name2idx)
  }

  function canvasToGrid(x, y) {
    const [w, h] = ca.gridSize;
    const gridX = x / canvas.clientWidth * w;
    const gridY = y / canvas.clientHeight * h;
    return [gridX, gridY];
  }
  function getMousePos(e) {
    return canvasToGrid(e.offsetX, e.offsetY);
  }
  function getTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return canvasToGrid(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  let prevPos = [0, 0]
  function click(pos) {
    const [x, y] = pos;
    const [px, py] = prevPos;
    ca.clearCircle(x, y, params.brushSize, null, params.zoom);
    ca.paint(x, y, params.brushSize, params.model, [x - px, y - py]);
    prevPos = pos;
  }

  const stats = Stats()
  function initUI() {
    stats.showPanel(0)
    document.body.appendChild(stats.dom)

    let spriteX = 0;
    canvas.onmousedown = e => {
      e.preventDefault();
      if (e.buttons == 1) {
        click(getMousePos(e));
      }
    }
    canvas.onmousemove = e => {
      e.preventDefault();
      if (e.buttons == 1) {
        click(getMousePos(e));
      }
    }
    canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      click(getTouchPos(e.changedTouches[0]));
    });
    canvas.addEventListener("touchmove", e => {
      e.preventDefault();
      for (const t of e.touches) {
        click(getTouchPos(t));
      }
    });
  }

  async function updateCA() {
    const r = await fetch(params.modelSet);
    const models = await r.json();
    params.models = models;
    const firstTime = ca == null;
    createGUI(models);
    ca = new CA(gl, models, [W, H], gui);
    ca.paint(0, 0, 10000, params.model, [0.5, 0.5]);

    window.ca = ca;
    if (firstTime) {
      initUI();
      requestAnimationFrame(render);
    }
  }
  updateCA()
  function render(time) {
    stats.begin()
    ca.step()
    twgl.bindFramebufferInfo(gl)
    ca.draw()
    stats.end()
    requestAnimationFrame(render)
  }
}
