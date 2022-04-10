from collections import namedtuple
from typing import NamedTuple

import jax
import jax.numpy as np
import jax.lax as lax
from jax.ops import index_update
import jax.random as random
from jax.tree_util import tree_map

from kaggle_environments import evaluate, make
from kaggle_environments.envs.halite.helpers import ShipAction, ShipyardAction, board_agent

from halite_jax.public_types import Cell
from halite_jax.public_types import State
from halite_jax.public_types import Action
from halite_jax.public_types import Episode
from halite_jax.utils import tree_stack, tree_index, tree_prepend

class Ship(NamedTuple):
    exists: bool
    cargo: float
    owner: int
    
def generate_empty_state(board_size):
    board_shape = (board_size, board_size)
    return State(
        halite=np.array([0]),
        step=np.array(0),
        cells=Cell(
            owner=np.ones(board_shape, np.int32) * -1,
            halite=np.zeros(board_shape),
            shipyard=np.zeros(board_shape, np.bool_),
            ship=np.zeros(board_shape, np.bool_),
            cargo=np.zeros(board_shape),
        )
    )

@jax.vmap
def _resolve_ship_collision(ship):
    min_cargo = np.min(np.where(ship.exists, ship.cargo, np.inf))
    total_cargo = np.sum(np.where(ship.exists, ship.cargo, 0))
    winners = ship.exists & (ship.cargo == min_cargo)
    has_winner = np.count_nonzero(winners) == 1
    winning_index = np.where(has_winner, np.argmax(winners), -1)
    return winning_index, Ship(
        exists=has_winner,
        cargo=np.where(has_winner, total_cargo, 0),
        owner=np.where(has_winner, np.max(np.where(winners, ship.owner, -1)), -1)
    )


def get_next_state(configuration, state, actions):
    size = state.cells.ship.shape[0]
    cells = state.cells
    halite = cells.halite
    cargo = cells.cargo
    ship_exists = cells.ship
    ship_owner = cells.owner
    shipyard_exists = cells.shipyard
    shipyard_owner = cells.owner
    
    ships = []
    costs = 0
    deposits = 0

    # 0. Mining
    mining_ship = Ship(
        exists=ship_exists & (actions.ship == 0), 
        cargo=cargo,
        owner=ship_owner)
    ships.append(mining_ship)

    # 1. Spawning
    ship_spawned = actions.shipyard == ShipyardAction.SPAWN.value
    costs += np.where(ship_spawned, configuration.spawnCost, 0)
    spawned_ship = Ship(
        exists=ship_spawned, 
        cargo=np.zeros_like(ship_spawned), 
        owner=shipyard_owner)
    ships.append(spawned_ship)

    # 2. Conversion
    shipyard_created = actions.ship == ShipAction.CONVERT.value   
    costs += np.where(shipyard_created, configuration.convertCost, 0)
    deposits += np.where(shipyard_created, cargo, 0)    
    shipyard_exists = np.where(shipyard_created, True, shipyard_exists)
    shipyard_owner = np.where(shipyard_created, ship_owner, shipyard_owner)
    ship_exists = np.where(shipyard_created, False, ship_exists)
    ship_owner = np.where(shipyard_created, -1, ship_owner)
    cargo = np.where(shipyard_created, 0, cargo)
    halite = np.where(shipyard_created, 0, halite)

    # 3. Movement
    def move_ship(action, offset):
        exists = ship_exists & (actions.ship == action)
        ship = Ship(
            exists=exists,
            cargo=np.where(exists, cargo, 0),
            owner=np.where(exists, ship_owner, -1))

        def roll(a):
            return np.roll(a, offset, axis=(0, 1))
        return tree_map(roll, ship)

    ships += [
        move_ship(ShipAction.NORTH.value, (-1, 0)),
        move_ship(ShipAction.SOUTH.value, (1, 0)),
        move_ship(ShipAction.EAST.value, (0, 1)),
        move_ship(ShipAction.WEST.value, (0, -1))        
    ]

    ships = Ship(*map(np.array, zip(*ships)))
    ships = tree_map(lambda a: np.moveaxis(a, 0, -1), ships)
    ships = tree_map(lambda a: np.reshape(a, (size * size, -1)), ships)

    # 4. Ship Collision
    results = _resolve_ship_collision(ships)
    results = tree_map(lambda x: np.reshape(x, (size, size)), results)
    winning_index, ship = results
    ship_exists = ship.exists
    ship_owner = np.where(ship.exists, ship.owner, -1)
    cargo = ship.cargo

    # 5. Shipyard Collision
    shipyard_collision = ship_exists & shipyard_exists & (ship_owner != shipyard_owner)
    ship_exists = np.where(shipyard_collision, False, ship_exists)
    ship_owner = np.where(shipyard_collision, -1, ship_owner)
    cargo = np.where(shipyard_collision, 0, cargo)
    shipyard_exists = np.where(shipyard_collision, False, shipyard_exists)
    shipyard_owner = np.where(shipyard_collision, -1, shipyard_owner)

    # 6. Halite Depositing
    deposits += np.where(ship_exists & shipyard_exists, cargo, 0)
    cargo = np.where(ship_exists & shipyard_exists, 0, cargo)

    # 7. Halite Mining
    is_mining = winning_index == 0
    mined_halite = np.where(is_mining, halite * configuration.collectRate, 0)
    mined_halite = np.fix(mined_halite)
    cargo += mined_halite
    halite -= mined_halite

    # 8. Halite Regeneration
    halite += np.where(~ship_exists, halite * configuration.regenRate, 0)
    halite = np.round(halite, decimals=3)
    halite = np.clip(halite, 0, configuration.maxCellHalite)


    return State(
        step=state.step + 1,
        halite=jax.ops.index_add(state.halite, cells.owner, deposits - costs),
        cells=Cell(
            halite=halite,
            owner=np.where(ship_exists, ship_owner, np.where(shipyard_exists, shipyard_owner, -1)),
            cargo=cargo,
            ship=np.array(ship_exists, dtype=np.bool_),
            shipyard=shipyard_exists,
        )
    )

def ensure_valid_action(rng, configuration, player, state, action):
    board_size = configuration['size']
    board_shape = board_size, board_size
    player_halite = state.halite[player]
    cell_count = board_size ** 2
    spawn_cost = configuration.spawnCost
    convert_cost = configuration.convertCost

    cells = tree_map(np.ravel, state.cells)
    action = tree_map(np.ravel, action)

    ship_action = action.ship
    ship_action = np.where(cells.ship & (cells.owner == player), ship_action, 0)
    ship_action = np.where((ship_action == ShipAction.CONVERT.value) & cells.shipyard, 0., ship_action)
    ship_action_cost = np.where(ship_action == ShipAction.CONVERT.value, np.clip(convert_cost - cells.cargo, a_min=0), 0.)

    shipyard_action = action.shipyard
    shipyard_action = np.where(cells.shipyard & (cells.owner == player), shipyard_action, 0)
    shipyard_action_cost = np.where(shipyard_action == ShipyardAction.SPAWN.value, spawn_cost, 0.)
    
    action_costs = np.concatenate([ship_action_cost, shipyard_action_cost])
    rng, r = random.split(rng)
    action_order = random.permutation(r, np.arange(cell_count * 2))
    action_totals = np.cumsum(action_costs[action_order]) 
    action_mask = action_totals <= player_halite
    action_mask = action_mask[np.argsort(action_order)]
    ship_action_mask = action_mask[:cell_count] | (ship_action_cost == 0.)
    shipyard_action_mask = action_mask[cell_count:] | (shipyard_action_cost == 0.)
    ship_action = np.where(ship_action_mask, ship_action, 0)
    shipyard_action = np.where(shipyard_action_mask, shipyard_action, 0)

    action = Action(ship=ship_action, shipyard=shipyard_action)
    action = tree_map(lambda a: np.reshape(a, board_shape), action)
    return action

def generate_episode(configuration, agents, initial_state, rng):
    episode_steps = configuration.episodeSteps
    def step(carry, _):
        rng, state = carry
        actions = []
        for i, agent in enumerate(agents):
            rng, r = random.split(rng)
            action = agent(state, r, i)
            rng, r = random.split(rng)            
            action = ensure_valid_action(r, configuration, i, state, action)
            actions.append(action)
        actions = tree_stack(actions)
        action = tree_map(lambda a: np.sum(a, 0), actions)
        next_state = get_next_state(configuration, state, action)
        return (rng, next_state), (next_state, action)
    init = rng, initial_state
    _, (states, actions) = lax.scan(step, init=init, xs=None, length=episode_steps)
    states = tree_prepend(initial_state, states)
    
    return Episode(states, actions)
