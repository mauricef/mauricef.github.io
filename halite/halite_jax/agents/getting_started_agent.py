import jax.numpy as np
from jax.scipy.signal import correlate
import jax.random as random

from kaggle_environments.envs.halite.helpers import ShipAction, ShipyardAction

from halite_jax.public_types import Action

def generate_manhattan_distances(size):
    a = np.abs(np.arange(size) - size // 2)
    return a + a[:, None]

def generate_smoothing_kernel(kernel_size, discount=.5):
    center = kernel_size // 2
    distances = generate_manhattan_distances(kernel_size)
    return np.power(discount, distances)

def calculate_smooth_field(field, discount=.5):
    kernel_size = field.shape[0]
    kernel = generate_smoothing_kernel(kernel_size, discount)
    field = np.pad(field, pad_width=kernel_size//2, mode='wrap')
    return correlate(field, kernel, mode='valid')

def roll_moves(a):
    rolled = np.array([
        a,
        np.roll(a, (1, 0), axis=(0, 1)),
        np.roll(a, (0, -1), axis=(0, 1)),
        np.roll(a, (-1, 0), axis=(0, 1)),
        np.roll(a, (0, 1), axis=(0, 1)),
    ])
    rolled = np.moveaxis(rolled, 0, -1)
    return rolled


def agent(
    state, 
    rng, 
    player,
    shipyard_discount,
    cell_halite_discount,
    min_mining_halite,
    max_cargo
    ):
    
    board_shape = state.cells.owner.shape
    size = board_shape[0]
    
    ship_actions = np.zeros(board_shape)
    shipyard_actions = np.zeros(board_shape)

    ships = np.array(state.cells.ship & (state.cells.owner == player), float)
    shipyards = np.array(state.cells.shipyard & (state.cells.owner == player), float)
    ship_count = np.sum(ships)
    shipyard_count = np.sum(shipyards)

    shipyard_action = np.where(ship_count == 0, ShipyardAction.SPAWN.value, 0) * shipyards
    ship_actions = np.where(shipyard_count == 0, ShipAction.CONVERT.value, 0) * ships
    is_converting = np.array(ship_actions == ShipAction.CONVERT.value, float)

    cell_halite = calculate_smooth_field(state.cells.halite, discount=cell_halite_discount)
    cell_halite_moves = roll_moves(cell_halite)
    ship_direction_to_most_halite = np.argmax(cell_halite_moves, -1)

    shipyard_distances = calculate_smooth_field(shipyards, discount=shipyard_discount)
    shipyard_distances = roll_moves(shipyard_distances)
    ship_direction_to_nearest_shipyard = np.argmax(shipyard_distances, axis=-1)

    shipyard_action = np.where((shipyards == 1) & (ship_count == 0), ShipyardAction.SPAWN.value, 0)

    ships_to_convert = (ships == 1) & (shipyard_count == 0)
    ships_to_move_to_shipyard = (ships == 1) & (~ships_to_convert) & (state.cells.cargo >= max_cargo)
    ships_to_mine_halite = (ships == 1) & (state.cells.halite >= min_mining_halite) & (~ships_to_move_to_shipyard)
    ships_to_move_to_halite = (ships == 1) & ~ships_to_convert & ~ships_to_move_to_shipyard & ~ships_to_mine_halite
    ship_action = np.where(ships_to_convert, ShipAction.CONVERT.value, 0)
    ship_action += np.where(ships_to_move_to_halite, ship_direction_to_most_halite, 0)
    ship_action += np.where(ships_to_move_to_shipyard, ship_direction_to_nearest_shipyard, 0)
    action = Action(ship=ship_action, shipyard=shipyard_action)
    return action