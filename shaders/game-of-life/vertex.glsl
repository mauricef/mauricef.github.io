attribute vec2 coordinates;

void main(void){
	gl_Position = vec4(coordinates, 1.0, 1.0);
}