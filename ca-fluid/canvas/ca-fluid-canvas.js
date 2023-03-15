const gridWidth = 32
const gridHeight = 32
const cellWidth = 16
const cellHeight = 16
const displayWidth =  gridWidth * cellWidth
const displayHeight = gridHeight * cellHeight

const MaxMass = 1.0
const MaxCompress = 0.1
const MaxFlow = 1/4
const MinFlow = 0.01
const SimulateSteps = 4

function cellPosFromMouseEvent(e) {
    const canvas = e.target
    const canvasRect = canvas.getBoundingClientRect()
    var x = e.clientX - canvasRect.left
    var y = e.clientY - canvasRect.top
    return {
        x: Math.floor(x / cellWidth) + 1, 
        y: Math.floor(y / cellHeight) + 1
    }
}

function get_stable_state_b(total_mass){
  if (total_mass <= 1){
    return 1
  } else if (total_mass < 2*MaxMass + MaxCompress){
    return (MaxMass*MaxMass + total_mass*MaxCompress)/(MaxMass + MaxCompress)
  } else {
    return (total_mass + MaxCompress)/2
  }
}

function simulate(massGrid, solidGrid) {
    const newMassGrid = []
    for (let y = 0; y < massGrid.length; y++) {
        newMassGrid[y] = []
        for (let x = 0; x < massGrid[y].length; x++) {
            newMassGrid[y][x] = massGrid[y][x]
        }
    }
    for (let y = 1; y < gridHeight + 1; y++) {
        for (let x = 1; x < gridWidth + 1; x++) {
            let mass = massGrid[y][x]
            let massBelow = massGrid[y+1][x]
            let massAbove = massGrid[y-1][x]
            let massLeft = massGrid[y][x-1]
            let massRight = massGrid[y][x+1]
            let isSolid = solidGrid[y][x]
            let isSolidBelow = solidGrid[y+1][x]
            let isSolidAbove = solidGrid[y-1][x]
            let isSolidLeft = solidGrid[y][x-1]
            let isSolidRight = solidGrid[y][x+1]
            let flow = 0
            let remainingMass = mass
            if (isSolid || mass <= 0) {
                continue
            }
            if (!isSolidBelow) {
                flow = get_stable_state_b(mass + massBelow) - massBelow
            }
            flow = Math.max(0, Math.min(flow, MaxFlow, remainingMass))
            newMassGrid[y][x] -= flow
            newMassGrid[y+1][x] += flow
            remainingMass -= flow

            if (remainingMass <= 0) {
                continue
            }

            // Left
            if (!isSolidLeft) {
                flow = (mass - massLeft) / 4 //TODO why 4?
                flow = Math.max(0, Math.min(flow, MaxFlow, remainingMass))
                newMassGrid[y][x] -= flow
                newMassGrid[y][x-1] += flow
                remainingMass -= flow
            }
            if (remainingMass <= 0) {
                continue
            }

            // Right
            if (!isSolidRight) {
                flow = (mass - massRight) / 4 //TODO why 4?
                flow = Math.max(0, Math.min(flow, MaxFlow, remainingMass))
                newMassGrid[y][x] -= flow
                newMassGrid[y][x+1] += flow
                remainingMass -= flow
            }
            if (remainingMass <= 0) {
                continue
            }

            //Up. Only compressed water flows upwards.
            if (!isSolidAbove) {
                flow = remainingMass - get_stable_state_b(remainingMass + massAbove)
                flow = Math.max(0, Math.min(flow, MaxFlow, remainingMass))
                newMassGrid[y][x] -= flow
                newMassGrid[y-1][x] += flow
                remainingMass -= flow
            }
        }
    }
    for (let y = 0; y < massGrid.length; y++) {
        for (let x = 0; x < massGrid[y].length; x++) {
            massGrid[y][x] = newMassGrid[y][x]
        }
    }
}

function renderGrid(ctx, massGrid, solidGrid) {
    for (let y = 1; y < gridHeight + 1; y++) {
        for (let x = 1; x < gridWidth + 1; x++) {
            var fillStyle = "white"
            let isSolid = solidGrid[y][x]
            if (isSolid) {
                fillStyle = "black"
            }
            else {
                let mass = massGrid[y][x]
                let blue = Math.min(255, Math.floor(255 * mass))
                fillStyle = `rgb(${255 - blue}, ${255 - blue}, 255)`
            }
            ctx.fillStyle = fillStyle
            ctx.fillRect((x - 1) * cellWidth, (y - 1) * cellHeight, cellWidth, cellHeight)    
        }
    }
}

function run() {
    const canvas = document.getElementById("c")
    canvas.width = displayWidth
    canvas.height = displayHeight
    const ctx = canvas.getContext("2d")
    const solidGrid = []
    const massGrid = []
    var mouseButtons = 0
    var cellPos = null
    var solidValueToWrite = false
    
    for (let y = 0; y < gridHeight + 2; y++) {
        solidGrid[y] = []
        for (let x = 0; x < gridWidth + 2; x++) {
            let isBorder = (y == 0) || (y == gridHeight + 1) || (x == 0) || (x == gridWidth + 1)
            solidGrid[y][x] = isBorder
        }
    }

    for (let y = 0; y < gridHeight + 2; y++) {
        massGrid[y] = []
        for (let x = 0; x < gridWidth + 2; x++) {
            massGrid[y][x] = 0
        }
    }

    canvas.oncontextmenu = (e) => {
        e.preventDefault()
    }
    canvas.onmousedown = (e) => {
        mouseButtons = e.buttons
        cellPos = cellPosFromMouseEvent(e)
        solidValueToWrite = !solidGrid[cellPos.y][cellPos.x]
        // if (mouseButtons & 1) {
        //     massGrid[cellPos.y][cellPos.x] = 1.
        // }
    }
    canvas.onmousemove = (e) => {
        mouseButtons = e.buttons
        cellPos = cellPosFromMouseEvent(e)
    }
    canvas.onmouseup = (e) => {
        mouseButtons = 0
        cellPos = cellPosFromMouseEvent(e)
    }

    function render() {
        for (let i = 0; i < SimulateSteps; i++) {
            if (mouseButtons & 1) {
                massGrid[cellPos.y][cellPos.x] = 1.
            }
            if (mouseButtons & 2) {
                solidGrid[cellPos.y][cellPos.x] = solidValueToWrite
            }
            simulate(massGrid, solidGrid)
        }
        renderGrid(ctx, massGrid, solidGrid)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}
run()