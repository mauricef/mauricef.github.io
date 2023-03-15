
# Development Log
I'm going to keep a log of my work sessions here, mostly for me. I may break this out of the README.md before sharing a post, this is more of an experiment for myself to see if I can set little micro goals and reflect on them after each coding session.

## 2023-02-27 1 hr
- [x] Setup boilerplate html and canvas along with twgl.js and a simple fragment and vertex shader
- [x] Review Jon's post in full
- [-] Download Jon's code and do a first pass review
- [ ] Create a list of milestones for development

I'm wrapping up this work session. I started reviewing Jon's implementation, initial impressions are the C# is definitely more verbose than JS, no surprise there and that the Unity based implementation is imperitive, you loop through cells, set properties on them etc which is pretty different than I think I'll end up doing this in WebGL, not necissarily a critisism of Unity in any way, but I do tend to think more functionally in WebGL. I do find the Unity implementation pretty readable, I'm curious how the performance compares between the Unity implementation vs a shader based implementation.

## 2023-02-28 2 hrs
- [x] Download Jon's code and do a first pass review
- [x] Create a list of milestones for development
- [x] Render fluid pixels as shades of pure blue
- [x] Render pixels zoomed in without anti-aliasing
- [-] Add mouse click handling that just increments amount of fluid in current pixel
    - [x] Render initial random amount values to buffer
    - [x] Pass amount buffer into renderer
    - [ ] Edit buffer values on mouse click in javascript
- [ ] Add simple downward flow
- [ ] Add right click to create / remove solid blocks
- [ ] Stop downward flow on solid blocks
- [ ] Add flow to left and right

A couple thoughts after reviewing the code. First, I think I'll take an approach of just rendering individual fluid pixels, versus rendering squares that have a height proportional to the amount of fluid. Instead, the individual pixel will have a blue value proportional to the amount of fluid it contains.

Second thought is that at least for now I'm going to leave out the concept of pressure, it's not clear to me what value it is providing. Maybe after I get the simulation working without pressure it will become clearer what value pressure provides.

---
I managed to pull out the buffer to store fluid amounts, next step will be to wire up the mouse to edit it. I'll also need a separate buffer to store a flag that indicates if a cell is 'blank' or 'solid'. 

## 2023-03-01 2 Hrs

I'm feeling good about this, 3 hours in. I just have basic boilerplate setup, no simulation dynamics but this is about how long I think it should take to review the code and get the basic WebGL setup. I was thinking last night that maybe for a very first attempt I will set it up so that each pixel is an atomic piece of water, either zero or one and see how that looks visually. I'll use a random field to determine if a particle flows left or right when it has both directions available to it.

- [-] Add mouse click handling that just increments amount of fluid in current pixel
    - [x] Render initial random amount values to buffer
    - [x] Pass amount buffer into renderer
    - [x] Edit buffer values on mouse click in javascript
- [ ] Add simple downward flow
- [x] Add right click to create / remove solid blocks
- [ ] Stop downward flow on solid blocks
- [ ] Add flow to left and right

I'm wrapping up now, this was good, I got the solid and liquid textures setup and some basic mouse interaction. The code is getting a little messy, I think next session I'll refactor a little bit and then work on adding some basic dynamics

## 2023-03-02 2 Hrs

For todays session, I'd like to get very basic flow dynamics, starting with just simple downward flow, without pressure. 

- [+] Add simple downward flow
- [+] Stop downward flow on solid blocks

I'm happy with todays work, I got a very simple flow algorithm, just vertical flow and no concept of pressure yet. The code is getting a little verbose and error prone / copy pasta. I think it would be nice to do a little bit of refactoring next session, I definitely wasted about 20 minutes debugging due to various errors passing in textures vs framebuffers, not passing in the right unifrom name, I think it would be easy to prevent these issues by a little refactoring and some error checking.

- [ ] Factor out logic to call program
- [ ] Detect when missing uniforms for program
- [ ] Add horizontal flow


### 2023-03-03 2 hrs

I'll start off today adding in the horizontal flow then I'll refactor a little, also want to jot down a couple other ideas I might implement before I wrap this up, but we will see, coming up on the 10hr mark and I wanted to try and wrap it up at around 10 hours.

- [x] Treat canvas border as solid
- [x] Factor out logic to call program 
- [ ] Add horizontal flow
- - [ ] Split vertical flow into computing flow and then updating fluid amount in/out
- - [ ] Implement horizontal flow, apply left / right direction in each pass, flipping the order randomly each time.
- [ ] Detect when missing uniforms for program
- [ ] Add ui to adjust parameters
- [ ] Decouple simulation loop from rendering loop
- [ ] Generate more liquid on mouse click
- [ ] Implement pressure
- [ ] Draw lines in mouseSolid instead of individual pixels

Wrapping this session up. I got less done than I expected, its helpful to reflect on this after these little work sessions, it helps me calibrate my expectations. I did manage to refactor so I think it will be easier to break this simulation up into more granular steps. I also thought through how I want to do the horizontal flow so hopefully with that plan in mind and the refactoring, it should be fairly easy to implement, let's see :)

## 2023-03-07 2 hrs

I'm a little stuck on the horizontal flow, I'm going to look at some of the original source algorithms to see if that can help me figure this out. 

After some work, I decided to step back and implement this in pure javascript without any shader first, just to get a running version that I can experiment with which is a more direct translation of some of the code I have seen. My plan is to get that working and then translate that into the shader version when I feel comfortable with my understanding of the algorithm.

- [ ] Implement JS version

I'm finishing up for today, working on applying the code from [tom forsyth](https://tomforsyth1000.github.io/papers/cellular_automata_for_physical_modelling.html) which seems to be what this is based on. 

## 2023-03-08 2 Hrs

It's early morning so I'm feeling a little fresher than I did last night when I got to work. I'll continue with implementing the simulation in Javasscript based off of Tom Forsyth's code. I hope to get the JS implementation complete today so that I can move on to the shader implementation.

---
I got the basics working, I kind of understand the algorithm better, the calculation to compute the vertical mass is still confusing. I'm thinking about taking a shot at implementing this a little differently, maybe with more of a stochastic approach where the water flows with a certain probability that is based on the difference in mass or maybe even trying it with discrete units where the water moves fully in a single direction. I think pressure or upward flow could come out of that naturally as the particles would find themselves surounded by full cells and would naturally jump upward.