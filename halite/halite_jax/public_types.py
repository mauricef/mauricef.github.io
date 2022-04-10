from typing import NamedTuple

class Cell(NamedTuple):
    owner: int
    halite: float
    cargo: float
    ship: bool
    shipyard: bool

class State(NamedTuple):
    step: int
    halite: float
    cells: Cell

class Action(NamedTuple):
    ship: int
    shipyard: int

class Episode(NamedTuple):
    state: State
    action: Action
        
class Trajectory(NamedTuple):
    episode: Episode
    reward: float
    value: float
        
    @property
    def state(self):
        return self.episode.state

    @property
    def action(self):
        return self.episode.action
    