import {run} from './scene.js'

const canvas = document.getElementById("main-canvas")
const scene = run({canvas, moduleUri: './gol.js'})
