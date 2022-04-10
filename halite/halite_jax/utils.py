from jax import random, lax, partial, vmap, jit

import jax.numpy as np
from jax.tree_util import tree_map, tree_multimap, tree_structure, tree_leaves, tree_unflatten

def prepend(value, a):
    return np.concatenate([np.expand_dims(value, axis=0), a])

def tree_prepend(value, values):
    return tree_multimap(lambda value, values: prepend(value, values), value, values)

def tree_stack(l):
    treedef = tree_structure(l[0])
    l = list(map(tree_leaves, l))
    l = list(map(np.array, zip(*l)))
    return tree_unflatten(treedef, l)

def tree_index(l, index):
    return tree_map(lambda a: a[index], l)

@partial(jit, static_argnames=('num_batches'))
def tree_batch(tree, num_batches):
    return tree_map(lambda a: np.stack(np.array_split(a, num_batches)), tree)

def random_mask(rng, shape, count, filter_mask=None):
    filter_mask = filter_mask if filter_mask is not None else np.array(np.zeros(shape), bool)
    filter_mask = np.ravel(filter_mask)
    mask = random.uniform(rng, shape=filter_mask.shape)
    mask = np.where(filter_mask, np.inf, mask)
    mask = mask < np.sort(mask)[count]
    mask = np.reshape(mask, shape)
    return mask

def net_present_value(rate, values):
    def step(total, value):
        total = value + rate * total
        return total, total
    _, discounted_values = lax.scan(step, init=0, xs=values, reverse=True)
    return discounted_values


def vmap_random(f):
    @partial(jit, static_argnames=('batch_size'))
    def compiled(rng, batch_size):
        return vmap(f)(np.array(random.split(rng, batch_size)))
    return compiled