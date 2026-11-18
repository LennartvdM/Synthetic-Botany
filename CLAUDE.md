# Synthetic organism sandbox

A sandbox of synthetic organisms, for robots to explore unconventional geometries.

The organisms are not models of anything. Each one is the result of a growth
process run forward, and the interest is in what such processes can produce
that nobody would think to draw. The work is exploration. Nothing here is
being made for delivery, and there is no deadline.

## What an organism is

A body is made of cells linked to their neighbours. Each step, a cell holds
its links to a set length, resists bending, and gives way to any cell it is
not linked to. A cell that has been fed enough becomes two. Form is decided
by where cells are fed and which way the two come apart.

Two rules hold throughout:

- **No shape is put in.** Every form has to come out of a rule. If a result
  could only be reached by placing or templating it, it does not count.
- **Bodies navigate each other's substance.** Where two grow into each other,
  both are moved. A body may share up to about 27% of its volume with
  another, but it may never ignore it.

The same recipe and seed always grow the same organism.

## How to work

- Take one growth rule at a time. Change it, then show the range of what it
  produces, side by side.
- Do not label results or steer toward a reference. Describe them by their
  geometry: proportions, thickness, curvature, how surfaces face, how parts
  meet. Naming a thing turns exploring into imitating.
- Say what surprised you, and what broke.
- Be wary of any single number used as a judge. Growth finds ways to score
  well that are not what was meant. Look at the thing, in cross-section if
  need be, before trusting a measure of it.
- Keep organisms single until asked to put them together.
- Do not add tests, build steps, packaging or performance work unless asked.
  They pull the work toward finishing, and this work is not trying to finish.

## What is already known

- A closed skin of cells makes lumps, fingers and folded masses. It cannot
  make a thin wall: a wall in it is a fold of a lump, and the skin between a
  rim's sides stays across as a lid.
- An open sheet that grows at its edge can. Its form follows from one number,
  how many cells the edge gains for each row it grows: none gives a tube,
  fewer than a flat sheet needs gives a cone or cup, as many a plate, more a
  frill. Changing that number once part way through gives further forms.
- Feeding what stands proud grows tips, and breaks a rim into fingers.
  Feeding where a surface is bent one way and straight the other keeps a rim.
- An edge that goes without when other bodies are ahead of it grows on its
  open side only.

If a `reference/` folder is present, it holds an earlier implementation of
these ideas. Read it for the ideas. You do not have to build on its code.

## This repository

- `LOG.md` records what has been found, what was retracted and why, and what
  is open. Add to it as work goes on; do not rewrite earlier entries, mark
  them retracted instead.
- `reference/` is the earlier implementation. Only the `cells` generator in
  `reference/src/skeletons.js` follows this brief. Every other generator in
  that file puts shape in, by profile, template or prescribed placement, and
  is there as a record of what did not work, not as a starting point.
- Experiments are welcome: a prediction stated first, then run across seeds
  and a varied rule, shown as pictures and slices with any measures beside
  them. They are not tests and nothing gates on them.
