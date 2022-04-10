import * as GL from '../gl.js'

async function fetchText(path) {
    const response = await fetch(path)
    return await response.text()
}

export async function load({gl, size: {width, height}}) {
	const rendertx = GL.createTexture(gl, width, height)
	const outputtx = GL.createTexture(gl, width, height)
	const fb = GL.createFramebuffer(gl, rendertx)
    const vb = GL.createVertexBuffer(gl)

	return {
		output() {
			return outputtx
		},
		async update({sourcePath, uniforms}) {
			const source = await fetchText(sourcePath)
			const pg = GL.createProgram(gl, GL.VERTEX_SHADER_SOURCE, source)
			const uniformTypes = GL.parseUniforms(source)
			function isTexture(name) {
				const uniformType = uniformTypes[name]
				return uniformType && uniformTypes[name].type == "sampler2D"
			}
	
	
			gl.useProgram(pg)
			Object.entries(uniforms)
				.filter(([name, _]) => isTexture(name))
				.forEach(([name, getter], index) => {
					const tx = getter()
					GL.setTexture(gl, pg, name, index, tx)
				})

			Object.entries(uniforms)
				.filter(([name, _]) => !isTexture(name))
				.forEach(([name, value]) => {			
					const uniformType = uniformTypes[name]
					if (uniformType) {
						const suffix = GL.uniformToMethodSuffix(uniformType)
						GL.setUniform(gl, pg, name, suffix, ...value)
					}
				})
			
			GL.setVertexAttribute(gl, pg, "a_coordinates", vb)

			GL.draw(gl, fb)
			
			GL.copyFramebufferToTexture(gl, fb, outputtx, width, height)

			gl.useProgram(null)
		}
	}
}