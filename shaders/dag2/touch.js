
function monitorTouches(canvas, maxTouches) {
	const touches = new Array(maxTouches)

	function clearTouches() {
		for (let i = 0; i < maxTouches; i++) {
			touches[i] = {x:0, y:0, force: 0}
		}
	}
	
	function mapTouchEvent(e) {
		const x = e.clientX 
		const y = innerHeight - e.clientY
		return [x, y]
	}

	function updateMouse(e) {
		clearTouches()
		if ((e.buttons & 1) === 1) {
			const [x, y] = mapTouchEvent(e)
			touches[0] = {x, y, force:1}
		}
	}
	canvas.onmousedown = updateMouse
	canvas.onmousemove = updateMouse
	canvas.onmouseup = updateMouse

	function updateTouch(e) {
		e.preventDefault()
		clearTouches()
		Array.from(e.touches).forEach((touch, i) => {
			if (i < maxTouches) {
				const [x, y] = mapTouchEvent(touch)
				touches[i] = {x, y, force: touch.force}
			}
		})
	}
	canvas.ontouchstart = updateTouch
	canvas.ontouchmove = updateTouch
	canvas.ontouchend = updateTouch
	canvas.ontouchcancel = updateTouch
	canvas.ontouchforcechange = updateTouch
	canvas.ongesturechange = (e) => {
		e.preventDefault()
	}	

	clearTouches()
	return touches
}

var resizeId = 0
onresize = () => {
    clearTimeout(resizeId)
	resizeId = setTimeout(() => location.reload(), 500)
}

onorientationchange = () => {
	location.reload()	
}