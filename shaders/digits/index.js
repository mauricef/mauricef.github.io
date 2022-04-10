function updatePointerDownData(posX, posY) {
    pointer.down = true;
    pointer.x = posX / canvas.clientWidth;
    pointer.y = posY / canvas.clientHeight;
}

function updatePointerMoveData(posX, posY) {
    pointer.x = posX / canvas.clientWidth;
    pointer.y = posY / canvas.clientHeight;
}

function updatePointerUpData() {
    pointer.down = false;
}


let canvas = document.getElementsByTagName('canvas')[0]

let pointer = {x: 0, y: 0, down: false}

canvas.addEventListener('mousedown', e => {
    let posX = e.offsetX
    let posY = e.offsetY
    updatePointerDownData(posX, posY);
});

canvas.addEventListener('mousemove', e => {
    if (!pointer.down) return;
    let posX = e.offsetX
    let posY = e.offsetY
    updatePointerMoveData(posX, posY);
});

window.addEventListener('mouseup', () => {
    updatePointerUpData();
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    const touch = touches[0]
    let posX = touch.pageX
    let posY = touch.pageY
    updatePointerDownData(posX, posY);
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    const touch = touches[0]
    let posX = touch.pageX
    let posY = touch.pageY
    updatePointerMoveData(posX, posY);
}, false);

window.addEventListener('touchend', e => {
    updatePointerUpData();
});

function logit(p) {
  return Math.log(p / (1 - p))
}

async function run() {
    let model = await tf.loadLayersModel('./decoder/model.json')
    var z = [Math.random(), Math.random()]
    function animate(t) {
      if (pointer.down) {
        z = [pointer.x, pointer.y]
      }
      else {
        z[0] += (Math.random() - .5 ) / 50
        z[1] += (Math.random() - .5 ) / 50
      }
      z[0] = Math.max(.01, Math.min(.99, z[0]))
      z[1] = Math.max(.01, Math.min(.99, z[1]))
      let zt = tf.tensor2d([[logit(z[0]), logit(z[1])]])
      let digit = model.apply(zt)
      digit = digit.squeeze(0)
      digit = tf.sigmoid(digit)
      digit = tf.sub(1, digit)
      tf.browser.toPixels(digit, canvas)
      requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
}
run()