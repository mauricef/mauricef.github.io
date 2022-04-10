import jax.numpy as np
import jax.random as random

from halite_jax.public_types import Action

def agent(state, rng, player):
    board_size = state.cells.owner.shape[0]
    board_shape = (board_size, board_size)
    rng, r = random.split(rng)
    ship_action = random.randint(r, minval=0, maxval=6, shape=board_shape)
    rng, r = random.split(rng)
    shipyard_action = random.randint(r, minval=0, maxval=2, shape=board_shape)
    return Action(ship=ship_action, shipyard=shipyard_action)