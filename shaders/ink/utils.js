export async function fetchText(uri) {
    let response = await fetch(uri)
    let text = await response.text()
    return text
}

export function scaleByPixelRatio (input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}
