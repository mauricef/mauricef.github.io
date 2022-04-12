
export class Mouse {
    constructor(canvas) {
        this.drawPointer = false
        this.inGesture = false
        this.pointerPos = {x:0, y:0}
        this.zoomTicks = 0
        this.zoomOffset = {x:0, y:0}
        this.zoomScale = 1
        this.dragPixel = null
        this.dragInitialZoomOffset = null
        this.dragInitialZoomScale = null
        this.canvas = canvas

        canvas.oncontextmenu = (e) => {
            e.preventDefault()
        }
        canvas.ongesturestart = (e) => {
            this.inGesture = true
            this.updatePointerPos(e)
            this.drawPointer = false
            this.dragPixel = this.getPixelPos()
            this.dragInitialZoomOffset = this.zoomOffset
            this.dragInitialZoomScale = this.zoomScale
        }
        canvas.ongesturechange = (e) => {
            e.preventDefault()
            this.drawPointer = false
            this.updatePointerPos(e)
            this.updatePan()
            const newZoomScale = this.dragInitialZoomScale * e.scale
            this.updateZoom(newZoomScale)
        }
        canvas.ongestureend = (e) => {
            this.inGesture = false
            this.dragPixel = null
            this.dragInitialZoomOffset = null
            this.dragInitialZoomScale = null
        }
        canvas.onmousewheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault()
                const newZoomScale = this.zoomScale - e.deltaY * .1
                this.updateZoom(newZoomScale)            
            }
            else {            
                this.zoomTicks += e.deltaY
                this.zoomTicks = Math.min(this.zoomTicks, 11 / .01)
                this.zoomTicks = Math.max(this.zoomTicks, 0)
                var newZoomScale = Math.pow(2, this.zoomTicks * .01)
                this.updateZoom(newZoomScale)
            }
        }
        canvas.onmousedown = (e) => {
            if (e.buttons & 2) {
                e.preventDefault()
                this.dragPixel = this.getPixelPos()
                this.dragInitialZoomOffset = this.zoomOffset
            }
            else if (e.buttons & 1) {
                this.drawPointer = true
            }
        }
        canvas.onmousemove = (e) => {
            this.updatePointerPos(e)
            this.updatePan()
        }
        canvas.onmouseup = (e) => {
            this.drawPointer = false
            this.dragPixel = null
            this.dragInitialZoomOffset = null
        }
        canvas.onmouseleave = (e) => {
            this.drawPointer = false
            this.dragPixel = null
            this.dragInitialZoomOffset = null
        }
        canvas.ontouchstart = (e) => {
            e.preventDefault()
        }
        canvas.ontouchmove = (e) => {
            if (!this.inGesture && e.touches.length > 0) {
                this.drawPointer = true
                const t = e.touches[0]
                this.updatePointerPos(t)
            }
        }
        canvas.ontouchend = (e) => {
            this.drawPointer = false
        }
    }
    get offset() {
        return [
            this.zoomOffset.x / this.canvas.width,
            this.zoomOffset.y / this.canvas.height
        ]
    }
    get scale() {
        return [
            this.canvas.width * this.zoomScale,
            this.canvas.height * this.zoomScale
        ]
    }
    getPixelPos() {
        var x = this.pointerPos.x, y = this.pointerPos.y
        x *= this.canvas.width / this.zoomScale
        y *= this.canvas.height / this.zoomScale
        return {x, y}
    }
    updatePointerPos(e) {
        const r = this.canvas.getBoundingClientRect()
        const offsetX = e.clientX - r.left
        const offsetY = e.clientY - r.top
        var x = offsetX / this.canvas.clientWidth
        var y = 1 - (offsetY / this.canvas.clientHeight)
        this.pointerPos = {x, y}
    }
    updateZoom(newZoomScale) {
        newZoomScale = Math.max(1, newZoomScale)
        newZoomScale = Math.min(512, newZoomScale)
        const scaleFactor = newZoomScale / this.zoomScale
        var pixelPos = this.getPixelPos()
        pixelPos = {
            x: pixelPos.x + this.zoomOffset.x, 
            y: pixelPos.y + this.zoomOffset.y
        }
        this.zoomScale = newZoomScale
        var newPixelPos = this.getPixelPos()
        this.zoomOffset = {
            x: pixelPos.x - newPixelPos.x, 
            y: pixelPos.y - newPixelPos.y
        }
    }
    updatePan() {
        if (this.dragPixel != null) {
            const currentPixel = this.getPixelPos()
            const dragOffset = {
                x: this.dragPixel.x - currentPixel.x,
                y: this.dragPixel.y - currentPixel.y,
            }
            this.zoomOffset = {
                x: this.dragInitialZoomOffset.x + dragOffset.x,
                y: this.dragInitialZoomOffset.y + dragOffset.y
            }
        }
    }
}