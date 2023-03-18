
function setup() {
  let w = 800
  let h = 800
  createCanvas(w, h);
}

class Circle {
  constructor({center, radius}) {
    this.center = center
    this.radius = radius
  }
}

let circleRadius = 50
function drawCircle(c, index) {
  fill(200, 189, 171)
  stroke(255, 0, 0)
  strokeWeight(4)
  circle(c.center.x, c.center.y, c.radius * 2)
  rectMode(CENTER)
  textAlign(CENTER, CENTER)
  textSize(26)
  stroke(0)
  strokeWeight(1)
  fill(0)
  text(index, c.center.x, c.center.y)
}

function draw() {
  let canvasCenter = new p5.Vector(width / 2, height / 2)
  noLoop()
  background(255);
  fill(151, 190, 70)
  fill(0)
  line(0, canvasCenter.y, width, canvasCenter.y)
  line(canvasCenter.x, 0, canvasCenter.x, height)
  let ca = null
  let cb = new Circle({center: canvasCenter.copy(), radius: circleRadius})
  for (let i = 0; i < 10; i++) {
    drawCircle(cb, i)
    let cc = new Circle({center: new p5.Vector(0, 0), radius: circleRadius})
    let angleToNewCircleCenter = null
    if (prevCircle == null) {
      angleToNewCircleCenter = 0 // 2 * PI * random()
    }
    else {
      let ra = ca.radius
      let rb = cb.radius
      let rc = newCircleRadius
      let a = rb + rc
      let b = ra + rc
      let c = ra + rb
      let A = acos((pow(b, 2) + pow(c, 2) - pow(a, 2)) / (2 * b * c))
      let vc = cb.center.copy()
      vc.sub(ca.center.copy())
      vc.rotate(A)
      angleToNewCircleCenter = vc.heading()
    }
    cc.center.rotate(angleToNewCircleCenter)
    if (prevCircle != null) {
      newCircleCenter.add(currCircle.center)
    }
    prevCircle = currCircle
    currCircle = new Circle({center: newCircleCenter, radius: newCircleRadius})
  }
}
