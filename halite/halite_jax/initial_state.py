import jax.numpy as np
import jax.random as random

from halite_jax.public_types import State, Cell, Action
from halite_jax.utils import random_mask

def generate_initial_state(
    rng, 
    configuration, 
    player_count=1, 
    halite_cell_pct=.5, 
    initial_player_halite=5000., 
    ships_per_player=1, 
    shipyards_per_player=0):
    
    board_size = configuration['size']
    max_cell_halite = configuration['maxCellHalite']
    
    board_shape = (board_size, board_size)
    ship_count = player_count * ships_per_player
    shipyard_count = player_count * shipyards_per_player
    cell_count = board_size ** 2
    halite_count = np.array(np.ceil(halite_cell_pct * cell_count), int)

    rng, r = random.split(rng)
    ship_mask = random_mask(r, (cell_count,), ship_count)

    rng, r = random.split(rng)
    shipyard_mask = random_mask(r, (cell_count,), shipyard_count, ship_mask)

    rng, r = random.split(rng)
    halite_mask = random_mask(r, (cell_count,), halite_count, ship_mask | shipyard_mask)
    
    rng, r = random.split(rng)
    halite = random.uniform(r, shape=(cell_count,))
    halite = np.where(halite_mask, halite, 0.)
    halite *= max_cell_halite
    
    owner = np.ones(cell_count) * -1
    for player in range(player_count):
        rng, r = random.split(rng)
        owner_filter_mask = ~((ship_mask | shipyard_mask) & (owner == -1))
        owner_mask = random_mask(r, (cell_count,), ships_per_player + shipyards_per_player, owner_filter_mask)
        owner = np.where(owner_mask, player, owner)
        
    return State(
        halite=np.array([initial_player_halite] * player_count, float),
        step=np.array(0, int),
        cells=Cell(
            owner=np.array(owner.reshape(board_shape), int),
            halite=halite.reshape(board_shape),
            shipyard=np.array(shipyard_mask.reshape(board_shape), bool),
            ship=np.array(ship_mask.reshape(board_shape), bool),
            cargo=np.zeros(board_shape, float)
        )
    )