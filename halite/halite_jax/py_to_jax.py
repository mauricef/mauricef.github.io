from kaggle_environments.envs.halite.helpers import Board
from kaggle_environments.utils import structify

import jax.numpy as np
import jax.random as random
from jax.tree_util import tree_map

from halite_jax.public_types import State, Cell, Action
from halite_jax.utils import tree_stack

def _parse_cell_state(cell):
    return Cell(
        halite = float(cell.halite),
        cargo = float(cell.ship.halite) if cell.ship is not None else 0.,
        ship = cell.ship is not None,
        shipyard = cell.shipyard is not None,
        owner = max([
            cell.ship.player.id if cell.ship is not None else -1,
            cell.shipyard.player.id if cell.shipyard is not None else -1,
        ])
    )

def _parse_action_value(entity):
    return (entity.next_action.value 
            if entity is not None and 
            entity.next_action is not None 
            else 0)

def _parse_cell_action(cell):
    return Action(
        ship = _parse_action_value(cell.ship),
        shipyard = _parse_action_value(cell.shipyard)
    )

def _parse_cell(cell):
    return _parse_cell_state(cell), _parse_cell_action(cell)

def _parse_cells(cells):
    positions = cells.keys()
    width, height = (
        max([p.x for p in positions]) + 1, 
        max([p.y for p in positions]) + 1)

    def reshape_to_board(a):
        return np.reshape(a, (height, width))

    cells = [cells[j, height - i - 1] for i in range(height) for j in range(width)]
    cells = [_parse_cell(cell) for cell in cells]
    cells = tree_stack(cells)
    cells = tree_map(reshape_to_board, cells)
    return cells

def _parse_players(players):
    return np.array([float(players[i].halite) for i in range(len(players))])

def _parse_step(step, action, configuration):
    board = Board(step[0].observation, configuration, action)
    halite = _parse_players(board.players)
    cell, action = _parse_cells(board.cells)
    state = State(
        step = board.step,
        halite = halite,
        cells = cell)
    action = action
    return state, action

def environment_to_episode(environment):
    steps = structify(environment.steps)
    actions = [[player.action for player in step] for step in steps]
    actions = actions[1:] + actions[0:1]
    configuration = environment.configuration
    steps = [_parse_step(step, action, configuration) 
             for step, action in zip(steps, actions)]
    episode = tree_stack(steps)
    return episode

def environment_to_initial_state(environment):
    states, actions = environment_to_episode(environment)
    initial_state = tree_map(lambda a: a[0], states)
    return initial_state