let font = null
let message = "Happy St Patrick's Day"
let fontSize = 64
let greenIcons = [
  {
    path: 'assets/images/shamrock_2618-fe0f.png',
  },
  {
    path: 'assets/images/shamrock_2618-fe0f.png'
  }
]

let otherIcons = [
  {
    path: 'assets/images/clinking-beer-mugs_1f37b.png'
  },
  {
    path: 'assets/images/flag-ireland_1f1ee-1f1ea.png',
  },
  {
    path: 'assets/images/four-leaf-clover_1f340.png'
  },
  {
    path: 'assets/images/rainbow_1f308.png'
  },
]

let allIcons = greenIcons.concat(otherIcons)
let iconRadius =  { x: 250, y: 100}
let sampleCount = 1000
let samples = []
let greenIconWeight = .9

function setup() {
  let w = 800
  let h = 800
  createCanvas(w, h);
  let xc = w / 2
  let yc = h / 2
  font = loadFont('assets/fonts/CelticKnots-Bq55.ttf')
  allIcons.forEach((icon) => {
    icon.image = loadImage(icon.path)
  })
  for (let i = 0; i < sampleCount; i++) {
    let icon = null
    if (i < greenIconWeight * sampleCount) {
      let iconIndex = floor(random() * greenIcons.length)
      icon = greenIcons[iconIndex]
    }
    else {
      let iconIndex = floor(random() * otherIcons.length)
      icon = otherIcons[iconIndex]
    }
    let size = 32 + random() * 64
    samples.push({
        position: {x: random() * w, y: random() * h},
        size: {w: size, h: size},
        icon: icon
      })
  }
}

function draw() {
  let xc = width / 2
  let yc = height / 2
  background(255);
  fill(151, 190, 70)
  fill(0)
  line(0, yc, width, yc)
  line(xc, 0, xc, height)
  fill(255)
  samples.forEach((sample) => {
      imageMode(CENTER)
      image(
        sample.icon.image, 
        sample.position.x, 
        sample.position.y, 
        sample.size.w, 
        sample.size.h)
  })
  ellipse(xc, yc, iconRadius.x * 2, iconRadius.y * 2)
  fill(151, 190, 70)
  rectMode(CENTER)
  textFont(font)
  textSize(fontSize)
  textAlign(CENTER, CENTER)
  text(message, xc, yc, 400, 300)
}
