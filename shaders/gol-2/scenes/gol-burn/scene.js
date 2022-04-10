
export const spec = {
	"title": "Game of Life on Fire",
	"description": `
		An implementation of <a href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life">
		Conway's Game of Life</a> using WebGL with multi-touch support and a simple shader to add
		"flaming" trails to the simulation.
	`,
	"graph": {
		"gol": {
			"loaderPath": "./loaders/shader.js",
			"inputs": {
				"uniforms": {
					"u_backbuffer": "gol"
				},
				"sourcePath": "./scenes/gol-burn/gol.glsl"
			}
		},
		"burn": {
			"loaderPath": "./loaders/shader.js",
			"inputs": {
				"uniforms": { 
					"u_input": "gol",
					"u_backbuffer": "burn",
					"u_mix": [0.95, 0.1, 0.5]
				},
				"sourcePath": "./scenes/gol-burn/burn.glsl"
			}
		}
	},
	"root": "burn"
}