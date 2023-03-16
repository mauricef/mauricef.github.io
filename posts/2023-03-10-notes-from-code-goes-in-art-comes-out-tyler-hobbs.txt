---
layout: post
title: Notes from 'Code Goes In, Art Comes Out' by Tyler Hobbs
date: 2023-03-10
tags: generative-art
---

Some thoughts after watching [Code Goes In, Art Comes Out](https://tylerxhobbs.com/essays/2019/code-goes-in-art-comes-out) by Tyler Hobbs. These are my notes from his talk, so generally the ideas presented here are Tyler's, not mine!

## Tyler's Approach

Tyle uses Clojure with Quill to generate his art. He is generally focused on 2D non animated art where the output is a digital image but he has also created art using a [plotter](https://axidraw.com/) (a simple robot that can hold a pen or paint brush).

Tyler likes to think of generative art as a data processing problem, a set of data transformation pipelines applied to simple data structures. I remember seeing in another interview that Tyler worked on [Cassandra](https://cassandra.apache.org/) so maybe it's not surprising he takes a data-centric view, that view appeals to me as well. 

He finds that a functional, interactive, flexible, easy to write language like Clojure puts him in the right mindset for the exploratory, experimental nature of creating generative art. That makes a lot of sense to me, I think my preference would be Javascript and p5 / WebGL or Python / JAX in a notebook.

The rest of the talk was structured around answering three questions - "How do you make interesting art with code?", "Can we turn our aesthetics in to code?" and "Why do this at all?"

## How do you make interesting art with code?

Tyler poses the challenge of making interesting art as balancing randomness and structure - creating art which is in some sense surprising and unpredictable while also conveying some meaning and structure, even if only at an intuitive level. I really like this formulation, it reminds me of a beautiful paper [What Lies Between Order and Chaos](https://csc.ucdavis.edu/~cmg/compmech/tutorials/wlboac.pdf) by James Crutchfield. 


He gives a few examples of how different generative artists approach this. His style involves creating a program which serves as a guide, it defines some aesthetic space to explore while incorporating randomness in color selection, recursive depth, curvature and other primitives. 

Another style is that of emergence, creating simulated systems incorporate chaotic behavior (e.g. triple pendulum) such that small differences in initial conditions lead to wildly different - but still related - final states.

Cellular automata and agents were also demonstrated, the main difference being that the cellular automata generally operate on a discrete space-time while agent based systems tend to by interacting components in a continuous simulation.

The final example he gave was using machine learning or "neurography" specifically showing some examples of GAN based images, this space has advanced rapidly since his talk.

## Can we turn our aesthetic into code?
I have heard the word "aesthetic" many times and generally understood the meaning but I never actually looked it up - "concerned with beauty or the appreciation of beauty". 

His question is could we, for example, write a program that generated a pallet of pleasing colors. His argument was that no, we could not fully automate that without strong AI. He feels that we can create tools to handle a lot of the "how" of art but they can't fully automate the "why" that is, the aesthetic component. That requires some collaboration with an artist.

I don't know how I feel about that - it certainly seems like the software is getting much better at generating pleasing and surprising images, audio and video with very minimal input from humans. On the other hand, these ML driven systems are trained on vast amounts of human-produced art and images. It's an interesting philosophical question, at least today it seems that humans still play a role :)

## Why do this at all?
I found this part of the talk particularly encouraging, there is a part of me that feels like there is no point to art in general. That is, there isn't really a "reason" for it other than the pleasure of creating it and the pleasure of viewing it. But on the other hand, isn't that enough?

Tyler specifically address why create art with software. From an engineers perspective, he offered that creating art is fun, it's fun to code without a concrete goal, to explore, to enjoy the immediate visual feedback. We should get to enjoy the skills we have developed, to apply them to playful creation, loosen up!

In addition to being fun and healthy, it is contributing to society. I enjoyed the way he approached this argument. Creating and enjoying art is a part of all healthy cultures. Creating art is a way to help society understand the capabilities of computers which may otherwise remain a black box to most people.

The act of generating pleasing art starts to demonstrate the gap between programs and humans, it becomes this back and forth, almost a way to program intuitively versus logically.

Generating art by balancing structure and randomness also helps shine some light on the natural world which also tends to generate complexity through simple, recursive rules combined with randomness.


