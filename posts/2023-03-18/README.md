Generate new circle so it touches current circle and previous circle.
Should work with random radius sizes. Then start adding logic to detect overlap with previous circles.

Could this be reimplemented as a simulation, where at each step we adjust the center of different
circles, trying to keep them close to the circle that spawned them (their parent) but not overlapping other
circles. And maybe keep the first circle fixed at the origin?

What would a simulation like that look like? Could I implement it in jax but have it render in p5js?