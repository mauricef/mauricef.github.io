import jax
import jax.numpy as np
import jax.lax as lax
from jax.ops import index_update
import jax.random as random
from jax.tree_util import tree_map

from kaggle_environments import evaluate, make
from kaggle_environments.utils import structify
from kaggle_environments.envs.halite.helpers import ShipAction, ShipyardAction, board_agent

from halite_jax.public_types import Cell
from halite_jax.public_types import State
from halite_jax.public_types import Action
    
def _get_player_observation(configuration, state, player):
    def get_player_piece_observation(prefix, flag, include_cargo=False):
        mask = (state.cells.owner == player) & (flag == 1)
        indexes = np.argwhere(mask)
        keys = list(map(lambda idx: f'{prefix}_{idx}', map(tuple, indexes)))
        positions = [float(i * configuration.size + j) for i, j in indexes]
        cargo = map(float, state.cells.cargo[mask].tolist())
        if include_cargo:
            values = list(map(list, zip(positions, cargo)))
        else:
            values = positions
        return dict(zip(keys, values))
        
    player_halite = state.halite[player]
    ship_dict = get_player_piece_observation('s', state.cells.ship, include_cargo=True)
    shipyard_dict = get_player_piece_observation('sy', state.cells.shipyard, include_cargo=False)
    return [float(player_halite), shipyard_dict, ship_dict]

def _get_observation(configuration, agent_count, state, player):
    is_player_zero = player == 0
    halite = list(map(float, state.cells.halite.flatten().tolist()))
    player_observations = [_get_player_observation(configuration, state, j) 
                           for j in range(agent_count)]
    return dict(
        player=player,
        halite= halite if is_player_zero else [],
        players=player_observations if is_player_zero else [],
        step=0,
        remainingOverageTime=60.0)

def _get_player_step(configuration, agent_count, state, player):
    return dict(
        action={}, 
        info={},
        observation=_get_observation(configuration, agent_count, state, player), 
        reward=0, 
        status='ACTIVE'
    )

def _initialize_environment(configuration, agent_count, state):
    step = [_get_player_step(configuration, agent_count, state, i) 
            for i in range(agent_count)]
    step = structify(step)
    env = make("halite", configuration=configuration, debug=True)
    _ = env.reset(agent_count)
    env.steps = [step]
    env.state = step
    return env

def make_config(**kwargs):
    env = make('halite', configuration=kwargs)
    return env.configuration

def episode_to_environment(configuration, episode):
    states, actions = episode
    
    @board_agent
    def replay_agent(board):
        for ship in board.current_player.ships:
            x, y = ship.position
            i, j = int(configuration.size - y - 1), int(x)
            ship_action = actions.ship[int(board.step), i, j]
            ship_action = ShipAction(ship_action) if ship_action else None
            ship.next_action = ship_action

        for shipyard in board.current_player.shipyards:
            x, y = shipyard.position
            i, j = int(configuration.size - y - 1), int(x)
            shipyard_action = actions.shipyard[int(board.step), i, j]
            shipyard_action = ShipyardAction(shipyard_action) if shipyard_action else None
            shipyard.next_action = shipyard_action
            
        
    initial_state = tree_map(lambda a: a[0], states)
    agent_count = initial_state.halite.shape[0]
    env = _initialize_environment(configuration, agent_count, initial_state)
    env.reset = lambda *args, **kwargs: env.state
    _ = env.run([replay_agent] * agent_count)
    return env    


def initial_state_to_environment(configuration, initial_state):
    agent_count = initial_state.halite.shape[0]
    env = _initialize_environment(configuration, agent_count, initial_state)
    env.reset = lambda *args, **kwargs: env.state
    return env

def render_state(configuration, state, width=800, height=700):
    env = initial_state_to_environment(configuration, state)
    env.render(mode="ipython", width=width, height=height)
    
def render_episode(configuration, episode, width=800, height=700):
    env = episode_to_environment(configuration, episode)
    env.render(mode="ipython", width=width, height=height)