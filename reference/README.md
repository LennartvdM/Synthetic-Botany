# Morphoclay

A sandbox for fictional organisms and the halls they grow in. Plain clay, no textures or effects:
everything interesting is supposed to be in the structure.

## The idea

A noise field cut by an envelope always comes out as a lump, however it is tuned. It has one
scale, no parts, no direction of growth and no way to host anything else. So nothing here is
generated that way. Every form starts from a **skeleton**: a rule that decides what kind of
thing it is before it has a surface.

| skeleton | what it is | publishes sites |
| --- | --- | --- |
| `arbor` | a graph grown by competition for space, thickness inherited down the limbs | tips, forks |
| `fascicle` | a bundle of continuous strands; limbs are sub-bundles | tips |
| `lamella` | a sheet with more margin than it can hold flat, so it ruffles | margin, face, center |
| `whorl` | one aperture swept along a growing spiral | aperture, keel |
| `foam` | a partition of space, read as walls, struts or cells | cells |
| `wave` | a level set of interfering waves, gyroid to spinodal | crown |
| `phyllo` | a divergence-angle lattice on a surface of revolution | sites, apex |
| `plexus` | a loop network with no root and no tips | nodes |
| `axis` | a jointed axis with a rule for where each node's organ faces | nodes, clasp, tip |
| `sheath` | a sheet that clasps its parent axis and narrows into a channelled stalk | tip, rim |
| `frond` | paired division repeated in a plane, down to threads or blades | tips, apex |
| `umbel` | rays from one point that all end on one shared surface | rays, hub |
| `rosette` | sheets packed round a point, graded from splayed outside to furled inside | leaves, heart |
| `calyx` | a cup divided by radial blades in three cycles | septa, center |
| `thallus` | a ribbon that creeps over the ground and forks | face, lobes |
| `weave` | two families of threads interlaced on a surface | rim, knots |
| `bell` | sheets fused into a tube that splits into free lobes, with a top and a bottom | mouth, lobes |

`arbor`, `fascicle`, `axis`, `frond` and `umbel` are stem-based: something long carries the other
parts. The rest are stemless, and the breeder can be limited to those ("breed stemless only").

Each skeleton takes a **frame** (origin, axes, scale), emits primitives, and publishes **sites**,
which are frames for something else to grow in. That closure is what makes composition work:
a genome is a tree such as `arbor ▸ lamella` or `phyllo ▸ plexus ▸ arbor`, and any skeleton can
sit on any other. Surface modifiers (`sulci`, `pits`, `ribs`, `hollow`, `grain`) act on the
finished distance field of a node, so they also apply to anything.

There are two kinds of geometry, and a skeleton chooses per part:

- **Clay**: round cones, thick triangles and analytic fields rasterised into a signed distance
  field and meshed with surface nets (`src/clay.js`). Parts fuse, but every edge is rounded at
  voxel size and nothing is thinner than about 1% of the organism.
- **Drawn**: `B.tube` sweeps any cross-section (fluted, flattened, channelled) along a path and
  `B.sheet` builds a two-faced shell with a real rim. These are exact meshes that never touch the
  voxels, so threads, paper-thin margins and crisp flutes survive. `skin: crisp | clay` switches
  `arbor`, `fascicle`, `lamella` and `whorl` between the two.

Ambient occlusion for both is read from one distance field and baked into vertex colour.

A child attachment can also be restricted to part of its parent (`from`, `to`) and re-tuned by
position (`grad: { param: [at base, at tip] }`), which is how one axis carries swollen coats low
down and fine fronds higher up.

## Compose, pack, relax

`pack` places nothing by rule. Petals are separate sheets of particles.

1. **Compose.** Every petal is laid out at full size and allowed to pass through the others. That is
   wrong as a shape but useful as a measurement: within a bell it shows which petal lies outside which
   where they overlap; between bells it shows which way each one is being crowded.
2. **Scaffold.** Crowded bells are leaned away from what crowds them and composed again (`compose`
   rounds, `lean` strength). The layering of the last round is kept.
3. **Grow.** Petals restart small on the shared base and grow to full width while a position-based
   solver keeps each one a sheet. Contact is resolved toward the side the composition assigned.

The status line reports two percentages of particles, before and after growing: inside another bell,
and on the wrong side of a neighbour in their own bell. `relax` is the solver's iteration count; at 0
you see the composition itself. "Breed by pack and relax" samples only this generator.

## One rule instead of a kit

The skeletons above are a kit of hand-built parts. `corolla` is the opposite: a single closed-form
bell surface `S(u, f)` (tube opening into a flared, lobed, recurved limb) that bears smaller copies
of itself on its own surface, each with notch, flare and throat advanced one step. No stems, leaves
or sheaths exist in it. "Breed from the one rule" samples only this formula's parameters.
`unfold` is an earlier one-rule generator built from ribbons; it makes axes and blades.

## Run it

    npm install
    node build.mjs            # writes dist/morphoclay.html, a single self-contained page

Open `dist/morphoclay.html` in a browser (it loads three.js r128 from cdnjs).

- **Specimen**: edit a genome as a tree; every node has sliders, an attachment, and modifiers.
  Breed makes a random composition, Mutate nudges the current one.
- **Sweep**: 25 rebuilds at once: two parameters across their range, mutants, new breeds, or the recipe shelf.
- **Cavern**: a void (halls, sponge or geode) colonised by five species. The orange capsule is 1 unit tall.

## Export meshes for a simulator

    node cli.mjs recipe "fascicle foam" out.obj --res 160
    node cli.mjs specimen genome.json out.obj        # genome.json is what "Copy genome" gives you
    node cli.mjs cavern halls hall.obj --seed 3 --count 34
    node cli.mjs breed out.obj --seed 12

OBJ, y up, one unit is one robot height. Builds are deterministic for a given genome and seed.

## Adding a skeleton

Add an entry to `KINDS` in `src/skeletons.js` with a `schema` (ranges and defaults), a list of
`sites`, and `grow(B, p, R)`. Work in a unit space rooted at the origin growing along +y, and use
`B.cap`, `B.tri`, `B.ball`, `B.field` and `B.site`. It then appears in the editor, the breeder and
the caverns with no other changes.

## Tests

    node test/smoke.mjs       # every recipe and 40 bred genomes build
    node test/interact.mjs    # drives the real page headlessly, with and without Web Workers
