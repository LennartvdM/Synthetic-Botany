# Log

Findings, retractions and open questions, oldest first. Entries are not
rewritten; a finding that turns out wrong is marked retracted, with the reason.

## Before the brief

The work in `reference/` began as generators that build forms directly:
branching graphs, swept tubes, ruffled sheets, spirals, foams, lattices, and
later a particle solver that packs and relaxes petal-like sheets. They taught
two things worth keeping:

- Fused voxel clay rounds every edge and section, and cannot make anything
  thinner than about 1% of the body. Exact meshes for thin parts were needed.
- Every attempt to get variety by adding a new hand-built generator, or by
  placing copies of a form at prescribed points, read as made rather than
  grown. That is what the brief's first rule now forbids.

## Open sheet growing at its edge (`cells` in reference/)

The process: a sheet of linked cells. Each row, every edge cell divides away
from the body, and `gain` further edge cells divide along the edge. After each
row the young part settles: links return to one length, the sheet resists
bending, and unlinked cells give way.

**Rule varied: where along the edge the extra cells go.** `bias` 0 spreads
them evenly; 1 gives them to the cells that stand highest. Renders:
`reference/shots/g1.png` (with noise), `h4.png` (without).

- *Retracted.* With a random nudge on each new cell, high bias appeared to
  replace free folds with straight base-to-rim creases and level the rim.
  Without the nudge, straight creases appear at every bias. The contrast was
  the noise.
- *Retracted.* Bias appeared to level the rim at low gain. Not visible
  without the noise.
- Without noise, bias makes little visible difference across the range.

**Bending rule.** Holding opposite cells a fixed distance apart assumes a
regular lattice and raised a bump wherever a cell had been added. Replaced
by: a cell moves toward the middle of its linked cells, along the sheet's
normal only. Small pits remain at each added cell; they come from holding all
links to one length.

**Starting state.** The body started as an upright ring of six cells, which
told it which way to go. With that start, gain at the flat-sheet value still
gave a folded cone, never a plate. *Cause found:* the start, not the rule.
Now the start is one cell lying flat with its six linked neighbours, and the
first row leans slightly off the ground (`lift`). With this start, edge gain
gives (`reference/shots/t1.png`, slices in `t2.png`):

| gain per row | body |
| --- | --- |
| 0 | narrow tube standing up; slice shows two parallel walls, one cell thick |
| 3.5 | cone opening upward, steady wall angle; slice shows a second strip of wall hanging inside on one side |
| 7 | low plate, slightly dished, gently undulating edge |
| 10.5, 14 | shallow dish, edge thrown into folds running back toward the centre |

**Time.** Proportions and fold positions are set by about row 18 of 60.
Later rows enlarge without rearranging. At high gain, no new folds form
between old ones; existing folds deepen.

## Still mine, not growth

These are choices in the current implementation, not rules of the brief:

- Division is by whole rows. No cell is fed and divides on its own.
- Rows older than 14 are frozen. This may be what pins fold positions.
- The sheet has no thickness, so nothing has volume yet.

## Open

- Per-cell division: a cell fed enough becomes two. Needed before any
  feeding rule can be tried.
- Which way a dividing edge cell sends its daughter, instead of straight on.
- Does unfreezing old rows let new folds form between old ones?
- Can cone angle be predicted from gain alone, from link counts before
  settling, and then measured? Same for where folds first appear.
- Why the tube at gain 0 leans near its top.

## Per-cell division (`grow.js`), run 001: edge turning

The kernel at the top of the repo replaces whole rows. Every cell has its own
credit. An edge cell reads how much the edge turns around it, measured in the
sheet from the corner angles of its triangles, and adds `c * turn * H` to its
credit. Every edge cell divides away from the body each generation; one whose
credit has reached 1 also divides along the edge. `c` is the only number.
There is no per-row gain any more: a cell cannot know a total for the body.

**Prediction.** Held before the run, written down after it, so weigh it
accordingly. In a smooth sheet the edge's total turning equals how fast its
length grows, so `c = 1` should hold whatever opening the body has, a flat
start should stay a plate, `c < 1` should decay to a tube and `c > 1` should
run away into folds.

**Result** (`runs/001-edge-turning/`, 30 generations, c = 0, 0.5, 0.8, 1, 1.1):

| c | body | slice |
| --- | --- | --- |
| 0 | narrow straight tube | two parallel walls |
| 0.5 | tube that widens slowly toward the top | walls diverging slightly |
| 0.8 | narrow tube for a few cells, then a wall that leans further out the higher it goes, ending in a near-level rim | a V whose arms curve outward |
| 1 | the same narrow base and opening wall, then a wide edge thrown into a few large folds | arms curving out to near horizontal |
| 1.1 | flat on the ground, edge in many small folds, a small raised bump at the centre | a straight horizontal line |

**The prediction was wrong about where flat is.** The plate is at about 1.1,
not 1. Reason, worked out after seeing the run: in a lattice of equal links a
row of outward divisions leaves a straight edge, and each along-edge division
adds one sixth of a turn to it. So next turning = (pi/3) * H * c * turning =
0.911 * c * turning, which is neutral at c = 1.098. The smooth-sheet argument
ignored that the lattice counts turning in sixths.

**Not predicted, not explained.** For c between 0.5 and 1 the body is not a
tube that stays a tube or a cone that stays a cone: its wall angle changes
with height. That is new; a fixed gain per row could only give a straight
cone. The recurrence above says turning should decay for c < 1.098. It does
for the first five or so generations and then grows again.

**What is suspect.**

- Links end about 6% off their set length in every body. The bending rule
  pulls cells toward the middle of their neighbours, which shrinks any curved
  surface, and the links never fully win.
- The plain tube shows 0.98 rad of edge turning where a tube of equal links
  has none. That residue feeds credit even at small c, and may be what
  re-opens the bodies between 0.5 and 1. Until it is removed the changing
  wall angle cannot be called a property of the rule.
- Feeding is equal for all edge cells, so division is still in step around
  the edge even though each cell decides for itself.

**Next.** Remove the strain so a tube reads zero turning, then rerun 001.
If the changing wall angle survives, it belongs to the rule.

## Run 002: run 001 again with the strain removed

**Change.** The bending rule no longer pulls a cell toward the middle of its
linked cells. A cell now moves only by how much its own bend differs from its
neighbours' bend, and links are brought to length last in each pass.

**Prediction, written before the run.** If the lattice recurrence from run
001 is right (next turning = 0.911 * c * turning) and the re-opening was the
strain residue, then:

- the plain tube reads zero edge turning and links end within 1% of length;
- for c below about 1.1 the turning dies away within a few generations, so a
  body opens only near its base and then its wall runs parallel: the reverse
  of run 001, where the wall opened more the higher it went;
- c = 1.1 is still flat;
- the opening wall of run 001 does not survive.

**Result** (`runs/002-strain-removed/`, 30 generations).

Same values as run 001 (c = 0, 0.5, 0.8, 1, 1.1), numbers only:

| c | cells | edge cells at end | edge turning | links off by |
| --- | --- | --- | --- | --- |
| 0, 0.5, 0.8, 1 | 187 | 6 | 0.00 | 0.2% |
| 1.1 | 766 | 43 | 1.02 | 2.0% |

Pictured, c = 0.8, 1.1, 1.3, 1.6, 2:

| c | body | slice |
| --- | --- | --- |
| 0.8 | plain narrow tube, identical to c = 0 | two parallel walls |
| 1.1 | a wider upright column, irregular, crumpled at the top | a tall narrow loop of wall |
| 1.3 | a wide V at the base, then a mass of folds | two arms rising from a point, each ending in folded wall |
| 1.6, 2 | a dome-shaped mass of tightly folded sheet | wall folded back on itself many times; little open space |

**Against the prediction.**

- Right: the tube reads zero turning and links are within 1%.
- Right: the opening wall of run 001 does not survive. *Run 001's main
  finding is retracted.* The wall that leaned further out with height was the
  strain residue feeding credit, not the rule.
- Wrong: bodies below the threshold do not open at the base and then run
  parallel. They never open at all. Every c below about 1.1 gives the same
  tube.
- Wrong: c = 1.1 is not flat.

**What the rule actually is.** A cliff. The start gives each edge cell one
sixth of a turn, worth 0.911 * c of credit. Below c = 1.098 that never
reaches 1, no cell divides along the edge, the new edge is straight, and
nothing ever changes. Above it every along-edge division adds turning, which
earns more credit, which adds more divisions: the edge grows without limit
and the sheet folds until it fills its own space. There is no value of c
that gives a cone, a cup or a plate. Dividing in proportion to turning feeds
on itself, so it can only die or run away.

**Consequence.** The cones and plates of the row-based work were stable only
because the gain was fixed from outside the body. A per-cell rule needs
something that does not feed on its own result.

**Still suspect.** Above the threshold links end 2% to 5% off length, so
those bodies have not finished settling, and the largest stop at the cell
cap rather than at 30 generations.

**Next, candidate.** Inherited marks. A few edge cells carry a mark; a
marked cell divides along the edge every p generations and only one of its
two daughters keeps the mark. Gain per generation is then (marked cells)/p,
constant, and decided by each cell alone. Prediction to test: this gives
back the tube, cone, plate and fold range, with wall angle set by the number
of marked cells and by p, and with the extra cells arriving at fixed places
on the edge rather than spread round it.

## Run 003: noise from the implementation

Not a growth rule. A check on the kernel itself.

**The test.** The start has six-fold symmetry, every cell follows the same
rule, and the kernel uses no randomness. So a body must keep six-fold
symmetry. Any departure is put there by the implementation.

**Suspected causes.** Settling moves cells one at a time, in storage order,
so each move sees its neighbours half-updated; and it stops after a fixed 30
passes whether or not the body is at rest.

**Prediction, written before the change.** With cells moved all at once
from the same state, and settling continued until nothing moves:

- every body is six-fold symmetric seen from above, folds included;
- links end within 1% of length up to c = 1.3;
- the irregular column at c = 1.1 becomes regular.

**Before** (`runs/003-implementation-noise/above-before.png`, c = 1.1, 1.2,
1.3, 24 generations, seen from above): no symmetry of any kind in any body.

**Change.** All cells now move together from the same state, in full
precision, and settling runs until no cell moves more than `rest` in a whole
pass, up to 400 passes.

**After** (`above-after.png`, same c, 16 generations). The prediction failed
on all three counts.

- The plain tube is exactly symmetric and at rest (links 0.25% off).
- At c = 1.1 the body is symmetric to eight decimal places for three
  generations, then loses it entirely in the fourth. From above the bodies
  are still irregular crumpled masses.
- Links end about 4% off at c = 1.1 to 1.3. Settling hits its 400-pass limit
  in almost every generation, so these bodies are never at rest.

**What the generation-by-generation trace shows** (c = 1.1):

| generation | edge cells | links off | distance from own copy turned a sixth |
| --- | --- | --- | --- |
| 1 | 12 | 0.05% | 7e-9 |
| 2 | 18 | 1.3% | 3e-8 |
| 3 | 18 | 6.5% | 4e-8 |
| 4 | 24 | 4.2% | 0.49 |
| 5 | 25 | 5.0% | 0.47 |

In generation 3 the body comes to rest with links 6.5% off: it has more edge
than it can hold, but while it is perfectly symmetric nothing pushes it out
of that state. In generation 4 it gives way. The number of along-edge
divisions in generation 4 is still six, so the rule is not what broke the
symmetry; the settling is.

**Reading.** Moving cells one at a time was a source of lopsidedness and is
gone. It was not the main one. The main one is that a sheet with too much
edge sits in a symmetric state that cannot last, and what decides how it
folds is rounding error. After that the folded body differs from cell to
cell, so the rule's own decisions differ too (generation 5 makes one
along-edge division, not six), and the irregularity compounds.

**So the noise has two parts.**

1. Fold pattern chosen by rounding. Nothing in the recipe decides it.
2. Bodies that are not at rest when the next generation reads them. The
   rule then responds to the solver's unfinished state.

**Not done.** Neither is fixed. Both are worst exactly where this rule
lives, in runaway folding.

## Run 004: holding a body to its own symmetry

A seeded lean to decide the fold was proposed after run 003 and rejected:
it would be noise added to the surface, and it would make every folded body
look alike. Nothing is to be added.

**Change.** The start and the rule are the same every sixth of a turn, so
the body they imply is too. After each settling pass, each set of six
matching cells is replaced by its average turned into place, and matching
edge cells hold the same credit. This removes rounding error. `symmetry: 0`
turns it off.

**Prediction, written before the run.**

- Every body is exactly six-fold symmetric from above, and stays so.
- Bodies above the threshold are no longer alike: fold count and fold depth
  differ visibly with c.
- Some bodies come to rest with links several percent off, because a
  symmetric sheet with too much edge may have no symmetric way to fold. If
  so, that is a property of the rule, not noise.

**Result** (`runs/004-held-symmetry/`, 16 generations, c = 1.1, 1.2, 1.3, 1.5).

| c | from above | from the side |
| --- | --- | --- |
| 1.1 | a rounded hexagon; the rim is turned inward, with six small notches | a cup: rounded base, wall rising to near vertical |
| 1.2 | six broad lobes round a small tight centre, each creased along its middle | lobes rise and curl over; open space between them |
| 1.3 | six lobes all swept the same way round, like vanes | lower, wider; lobes lean and overlap their neighbours |
| 1.5 | many small folds in six repeating sectors, crowded at the centre | a low mass of layered folds |

Along-edge divisions per generation differ clearly with c and are always
multiples of six: at 1.1 they come in sixes with gaps; at 1.5 they reach 96.

**Against the prediction.**

- Right: every body is six-fold symmetric (matching cells agree to seven
  decimal places) and stays so.
- Right: the bodies are no longer alike. Lobe count is fixed at six by the
  start, but lobe width, sweep and fold density change with c.
- Not shown: bodies do not come to rest. Links end 3.5% to 4.7% off and
  settling stops at its 400-pass limit in almost every generation. Whether
  the symmetric body has a resting state at all is still unknown.

**What surprised me.**

- The sweep at c = 1.3. The lobes all lean the same way round. Nothing in
  the rule has a handedness; my division does. A daughter is placed over the
  gap to the *next* edge cell, never the previous one. That is a twist I put
  in, and it should be removed or made a declared choice.
- c = 1.1 is a cup. It is the first body from this rule that has an inside
  and a rim and is not a tube or a folded mass.

**What broke.**

- The same recipe at c = 1.1 gives 649 cells in Node and 493 in the browser.
  At 1.2 and above the two agree exactly. At 1.1 each starting cell's credit
  is 1.002, a hair over the line, so the last digit of a rounding decides
  whether it divides. A recipe that close to a threshold is not reproducible
  across machines, which breaks "same recipe, same organism".
- Not at rest, as above.

## Sculpted references (`cheats/`): the first rule suspended, on request

Twelve shapes made by hand, to be studied later for which of their features
a growth rule can reach. None is grown. Each is built from a profile and a
petal outline chosen by eye, and they are named for the flowers they are
modelled on. The growth kernel does not use them and must not.

`cheats/shapes.js` builds them, `cheats/index.html` shows them whole, cut or
sliced, and `cheats/sheet.png` is all twelve.

They were chosen to differ in how the cup or bell is put together:

| built as | shapes |
| --- | --- |
| separate overlapping sheets in two rings of three | tulip, lily, fritillary, snowdrop (outer ring long, inner ring short and notched) |
| flat separate sheets round a fused ruffled tube | daffodil |
| one fused sheet with a lobed rim | foxglove (one side longer, one side bellied), bellflower (pointed lobes), bluebell (lobes rolled back), lily of the valley (mouth narrower than the body), angel's trumpet (pleated, lobes drawn to points) |
| one sheet rolled so its edges overlap | calla |
| one fused sheet closed at both ends, creased | lantern |

Features in them that no rule here has produced yet: a wall that opens,
runs parallel and opens again; a mouth narrower than the body; a rim that
rolls back without folding; one side of a mouth longer than the other;
sheets that overlap without crossing; a closed form.

## Sculpted references, second set (`cheats/fantastic.*`)

The flower set was judged a likely dead end: too botanical, too thin. A
second set was sculpted from picture samples of invented, bulbous forms. The
brief for it: more fantastic, more volume, not noisy, with substance and
deftness. Still sculpted, not grown, and still off limits to the kernel.

Eight solid shapes, each a hand-built distance function of a few bold parts,
meshed at one resolution (`cheats/fantastic.js`, viewer `fantastic.html`,
sheet `fantastic.png`):

| shape | how it is put together |
| --- | --- |
| plated dome | a core under ten thick plates laid in a spiral from the top, each standing off the core |
| crowned globe | a globe split into ten gores by slits that close at the poles, held by eight knobbed prongs |
| capped globe | a softly ribbed globe under a cap of seven pointed tongues, rings of spheres round the base |
| finger tuft | twenty-four fat tapering fingers from one mound, each turning upward |
| split pod | an egg-shaped shell cut by four slanting crescent openings over a smooth inner body, on three fins |
| tiered caps | five hollow caps of falling size on one stalk, each overhanging the next |
| scaled cup | a ball seated in three rings of thick scales, each ring wider open |
| horned gourd | two swellings joined at a collar, the lower ribbed, six horns curling in over the top |

What these have that the flower set did not: thickness everywhere; parts
that stand off one another and leave gaps; a body inside a body; repetition
round an axis at more than one count in the same form.

Known flaw: a faint beaded line along some sharp edges (plate rims on the
dome, slit edges on the pod). A small blend at the joins did not visibly
remove it. It comes from meshing a sharp crease on a grid.

## Assets (`assets/`)

First assets built in the sculpted, exaggerated register, following the
five-role scheme in `LANGUAGE.md`. Sculpted, not grown.

- `assets/kinds.js` defines kinds. A kind is a build plus the ways its
  specimens differ; each specimen draws its own numbers, so it is
  repeatable. Three kinds so far: pout bell, knuckle bundle, plated dome,
  five specimens each.
- Every specimen comes as separate parts sharing one origin: body, base,
  rooting, flourish. No kind has a moving part yet.
- Flourishes are placed by a rule: low on the body and base, in sheltered
  spots, never out in the open and never underneath.
- `assets.html` shows one kind at a time and can colour parts by role.
- `node assets/make.js` writes dense masters as OBJ, one file per role, to
  `assets/out/` (not kept in git). One specimen is about 190k triangles and
  12 MB. A low-poly pass is expected later.

Open: flourishes are still ragged at the viewer's density; specimens of a
kind may differ too little; nothing sags or gives way to its neighbour.

**Plated dome withdrawn, replaced by tongue dome.** The plated dome (a ball
under flat round discs) was called a regression: it lost the grit. The
concept was kept and rebuilt as fleshy tongues with rolled edges and cords
on a heavier, veined body, topped with capped fingers of the same family as
the knuckle bundle. The rule it broke is written in `LANGUAGE.md` under
"Held rigid: the grit". `assets/kinds.png` still shows the withdrawn
version; `assets/tongue-dome.png` shows the replacement.

**Clenched bulb, then burst bulb.** A fourth kind went through three
passes: lobes pulled apart (read as a ribbed onion), one skin with creases
(seams too discrete), then a thick sheet with drawn tears and a swelling
body behind them, after the source of the grit was named (`LANGUAGE.md`,
"Where the grit comes from"). The burst bulb still falls short: its tears
read as collars, sheet and bulge are not different in thickness, and the
bulges are tidy. `assets/burst-bulb.png`.

## A material, not a form (`tear.js`, `tear.html`, `runs/005-tear/`)

Asked: can a tear be found instead of drawn? Then the aim was restated:
this is fictional material design. A material does not have to be real. It
has to do what the style needs, past what a real stuff would do, and then be
boiled down to something that can be applied to any form.

Prediction, written before the first run: a stiff sheet round a soft
membrane, inflated, with links that snap past a strain limit, would tear at
its weak places and the membrane would come out through the tears.

**First two builds: wrong.** Two skins, the inside pushed outward the same
amount everywhere, then the same with a held volume. Both gave a shell
cracking into plates that float on a swelling ball
(`first-shell-cracks.png`). Nothing came out, because nothing held the
sheet back: once cracked, the plates rode outward with what was under them.

**Third build: one skin, two states.** Covered skin is thick, clenches back
toward the shape it started with, and its links rip when stretched past a
limit. Bare skin is what is left where a link ripped: it grows wherever it
is stretched, its cells dividing to keep up, it pulls itself round, it
hangs, and it rides over covered skin it meets. The inside holds a growing
volume and presses on every cell alike. The only thing put in is where the
cover is weak: a few faint streaks.

What it does (`stages.png`): the cover stays whole and keeps its shape, a
slit opens along each weak streak, and bare skin comes out through the slit
as a stack of lobes.

One trait varied at a time, same body, same view, step 90:

- `strength.png` Low: long slits, many lobes. High: nothing rips.
- `clench.png` Low: the cover gives, the slit stands open and nothing is
  forced out. Middle: a pad filling the slit. Higher: a large round mass on
  a slit it hides. Higher still: nothing rips. The useful band is narrow.
- `expanse.png` (how fast bare skin grows) Low: the cover rips further and
  a low wide pad fills a wide hole. High: a small slit carrying a large
  lobed mass. This one trait sets who wins.
- `tension.png` None: a froth of small bubbles. A little: a few large
  smooth lobes. More: the bare skin stays down in the slit. Most: an open
  slit and no bulge.
- `thick.png` Thin: the bulge sits on a smooth surface. Thick: the torn
  edge stands up as ragged shards.
- `sag.png` Almost no difference across its whole range.

Surprised by: the lobes. Nothing asks for them. A long narrow slit lets
bare skin out at several places along it and the swellings crowd each other
into a stack.

Broke, or not there yet:

- The torn edge follows the cells in zigzags, and when the cover is drawn
  thick it shows as shards. There is no rolled lip.
- The bulges are taut bubbles. They do not lie on the cover with any
  weight; hanging barely registers against the push from inside.
- The cover is not changed by what comes out of it. The slit does not gape
  into a lens and the cover does not fold or double under the bulge.
- Bare skin runs away. Past about step 130 it has divided to several times
  the starting cell count and reaches the ceiling set for it.
- At strength 0.1 a stray strip of cover hangs below one slit.
- Slow: about 6 seconds to step 90 at 10,242 cells.
- Only ever run on a ball.

Open: what the traits are that the style needs (a first list is in
`LANGUAGE.md`), and what form the boiled-down version takes.

**Corrected: the cover was a billiard ball.** Said of the third build: it is
an elastic body in a thick elastic sheet, both elastic, the inner more so,
and the sheet deforms when it tears. The third build's cover was pulled
back to the positions it started at, so it could rip but never give. That
rule (clench) is removed. Four further builds of `tear.js`, same day:

1. Stretch and bend only (`elastic-1-cracks-no-spill.png`). The cover
   swells, then cracks in long straight branching lines that follow the
   cells. Nothing comes out. Measured why: the inside's push came to 0.0001
   a pass. In this kind of solver a stretched sheet pulls along its surface
   and hardly at all inward, so wrapping something tightly does not
   pressurise it. The clench had been hiding that.
2. Push made a trait, squeeze: the tighter the sheet, the harder the body
   comes out where bare. Contacts made mutual: what lies on the cover
   presses it in, what squeezes past a torn edge drags it
   (`elastic-2-balloons.png`). The cover now deforms: it shrinks as the body
   leaves, and slits are forced into round mouths with a frilled edge. But
   the body comes out as taut balloons larger than what is left, and the
   same picture comes back across drag, squeeze, sag and sheet stiffness.
3. Bulk: the body drawn back in proportion to how far out it has come, as a
   solid would be (`elastic-3-mound-then-destroyed.png`). For a while the
   body sits as a low mound filling an oval mouth, the first frame that is
   not a bubble. Then the whole sheet tears off.
4. The inside made to swell to a set size and settle. It still tears the
   whole sheet off, at every size tried. So the runaway is not over-filling.
   Not understood. `tear.js` is left in this state, with its viewer set to
   the frame before it goes.

Retracted from the entry above: "the cover stays whole and keeps its
shape" was the fault, not a finding.

What this run of builds shows about the tool, not the material: each fix
was a rule added by hand to stand in for something a real solver for
elastic solids does by itself (pressure from a tight wrap, a body with
bulk, contact that pushes both ways, tears that do not follow the cells).

## The same question in a material-point solver (`sim/`)

Asked whether there are libraries that solve this. There are. Tried here:
Taichi 1.7.4 and Warp 1.19 both install with pip under Python 3.13 on this
machine (4 cores, no graphics card needed).

`sim/burst.py` is the burst in Taichi's material-point method: about 137,000
particles in a ball, the outer layer stiffer (the sheet), the inner softer
(the body). Both are elastic solids. The body's size at ease grows. A sheet
particle stretched past its limit fails and from then on only resists being
squashed. Weak streaks as before. `sim/skin.py` turns particles into two
surfaces. It needs Python with taichi, numpy, scipy and scikit-image; this
is the first thing in the repository that is not plain JavaScript.

**First full run** (`runs/006-material-point/first-run.png`; body 120,
sheet 900, limit 0.3, swell 1.3, 6000 steps, about 6.5 minutes). Left to
right: step 3000, the end, the end from behind, the end from above.

What it does: nothing fails until the body has swollen about 20%, then
rips open along the weak streaks and run on past them, top to ground, and
join over the top. The sheet ends as thick separate slabs lying on the
body, with the body showing in the channels between. 8,215 of 56,012 sheet
particles failed.

What is there that the hand-made builds never had: the slabs have real
thickness and rounded edges; the edges follow no grid; the sheet is
visibly deformed, its slabs curved and lifting at the rims; at step 3000
one rip is still a slit, pinched at the middle with the sheet puckered
round it.

What is not there: nothing spills. The body sits lower than the slabs. Once
the sheet has split all the way round there is nothing left holding the
body in, so it has no reason to come out. Rips would have to stop for a
spill to happen.

Not from the material: the surfaces are made by blurring particle counts,
which rounds everything by about a cell and a half and would hide a sharp
edge if there were one.

**Second run: nothing ripped** (body 60, sheet 1500, limit 0.7, weak 0.88,
swell 1.35, 8000 steps, about 10 minutes). Meant to make rips stop short so
the body would have to squeeze out. The sheet was strong enough to hold the
body in entirely: no particle failed. No picture kept; it is a ball. So
between this and the first run there is a band where rips start and stop,
and it has not been found. Each try costs 6 to 10 minutes.

## Wood (`wood.js`, `wood.html`, `runs/007-wood/`)

A second material, given by pictures of old, winding, bundled trunks and a
sheet of their loose pieces. Leaves set aside. Sculpted, not grown.

What was read off the pictures, as geometry: a trunk is a bundle of strands
winding round a shared line; each strand is a flattened ribbon with a crest
on its outer face and grooves along its length; strands part and rejoin,
leaving almond-shaped hollows; every limb ends in a point; at the ground
the same strands splay and lie flat.

The rule built from that: **every tip is the far end of a strand that
began as a root.** A piece of wood is a fixed number of strands. Where they
share a path they lie round it and wind round it. A fork is the bundle
parting in two, each part taking some of the strands. A strand left alone
runs out to a point. Girth is never set: it is how many strands are
passing. Strands give way to each other where they would overlap.

Traits: strands, girth, uneven (strands differ in girth), twist (winding of
strands round the path), curl and sway (bending of the path itself, one way
or one way then the other), spread (how far a fork opens), gap (how far
strands stand apart mid-stretch), flat, ridge, grain (the ribbon's
section), taper, roots, lift.

- `first-try-seeds.png` The rule worked first time as structure, and read
  as twisted rope: equal strands, even winding, straight trunks.
- `seeds-and-gap.png`, `strands-and-curl.png`, `close.png` After: strands
  of uneven girth, paths that bend, a bolder ribbon section.
- Gap is the trait that changes most. Low, a solid fluted trunk. High, an
  open cage of ribbons that can be seen through.
- Strand count sets the whole character without any other change: two
  strands make a forked whip, fourteen a heavy trunk with many limbs.

Surprised by: how much comes from the one rule. Forks, taper, the heavier
base and the thin top were none of them written; they follow from strands
leaving.

Broke, or not there yet:

- Tips are long thin whips. The pictures' limbs stay heavy much further
  out and end in short hooks.
- A crease shows where a root meets the trunk, and forks pinch.
- Strands pass through each other in tight places; giving way is only
  eight light passes.
- The ribbon section is the same along a strand's whole length. Nothing
  splits, flakes or breaks off, and there are no separate loose pieces.
- Surfaces are smooth between crest and grooves. No bark.
- Lone strands bend one way then the other like the rest, so nothing
  loops.

**Marks, first way: stamped** (`marks-stamped.png`,
`marks-stamped-close.png`, `snapped-end-close.png`). After being told the
surface was too clean, with a drawing of three things: a strand that does
not follow a bend and runs straight on, the same ending in splinters, and a
branch that failed leaving a stub and a notch. And in words: springy and
brittle at once; splinters and notches; parts resist a bend and growth may
overshoot; branches that fail; twigs eaten into hollows; bark fresh, old,
yielding, bladdering.

Built: a stretch can fail and be left as a stub; a strand on the outside of
a turn can run straight on and snap into slivers; and, on the finished
surface, bark plates, hollows with swollen rims, and notches.

The stub and the snap are made during the build and change what follows.
The bark, hollows and notches are not: they were placed at random on a
finished form, and nothing in the tree has an age. Called an anachronism,
rightly. It shows: the marks sit on the wood like damage to a carving.
This commit keeps that version as a record.

**Marks, second way: from age** (`age-and-seeds.png`,
`age-45-and-120-close.png`). The stamped marks are withdrawn. Nothing is put
on the finished thing now; it is shown at a number of years and everything
on its surface follows from that.

- A strand's tip moves outward year by year. What it has not reached is not
  there.
- A point on a strand is as thick as it is old. The taper formula is gone:
  the base is heavy because it is old, a tip fine because it is new.
- Bark is laid young, thin and whole, and cannot keep up with the wood
  thickening under it. It splits along the grain, and the furrows are
  widest where the wood is oldest. The grooves of the first version and the
  bark of the second are now one thing. Old bark is thicker, cracks across
  the grain at places fixed from the start, each opening in its own year,
  and lifts toward a crack.
- A strand can die: its stretch fails young, it refuses a turn and snaps,
  or it dies late. It then stops thickening while its neighbours go on, so
  it is left as a thin sunken strip the whole way down. It sheds its bark
  and its furrows wear deeper. Its dead end is a crown of slivers that
  wears back year by year and in the end is gone, leaving an open hollow.

What the age row shows: at 6 years a tuft of fine whole ribbons; at 18 a
winding sapling; at 40 a tree, bark split, some ends broken; at 80 and 150
heavy, plated, furrowed, darker where bark has gone.

Fixed on the way: thickening had no limit, so old trees bloated into slabs
(it now slows with age); living tips and root ends were as thick as their
years, so they ended like cut pipe (a living end is always new wood); more
than half the strands died (lowered).

Broke, or not there yet:

- Close up, old bark is coarse. A lifting plate is a few large facets and a
  crack is a step one ring wide, because marks along a strand can be no
  finer than its rings.
- Dead strips are hard to pick out. They are sunken and bare but the same
  colour as everything else.
- Hollows have not been seen. They should appear where a dead end has worn
  away completely; none has been found in a picture yet.
- A dead thing changes nothing after it. Living strands do not roll over a
  dead strip's edges, nothing regrows from behind a break, and a tree that
  loses a limb grows on exactly as it would have.
- Paths are still laid out whole and then revealed by age. A strand's path
  at year 30 does not depend on what happened at year 10.

**Wood as a tree: withdrawn.** "Yeah this isn't it." Then: "the tree itself
is less important, it could grow in any direction any shape, it just needs
something that tests the twists, the turns and the winding."

What went wrong, as read here: a tree was built where a material was asked
for. Years, bark and dying strands are botany, which this project ruled out
at the start. The results were thin and fiddly, against the rule held rigid
in `LANGUAGE.md`. And a section swept along a line can only make
extrusions. `wood.js` and `wood.html` stay as a record of that.

Picked up on sketchbook page 4 (`sketch/page4.js`, `sketchbook4.html`,
`sketch/page4.png`), back in the heavy clay of the earlier pages: wood as
two to four fat crested planks laid round a line, on four plain test
pieces, one each for a twist, a turn, a winding, and all three. On the turn
the plank on the outside does not take it, runs straight on and snaps, as
in the drawing given earlier. Not yet judged by anyone but me.

**Page 4 called a McFlurry**: "the stuff you squeeze through the mould so
to speak, is buttery smooth." True of it and of the tree before it: both
are a section pushed along a line, with the joins smoothed.

Page 5 (`sketch/page5.js`, `sketchbook5.html`) drops sweeping and blending.
A piece is a heap of shards laid along the grain. Each shard has two flat
faces meeting at a ridge, starts somewhere and ends somewhere in a point,
and is too stiff for the line it follows, so its far end stands off on the
outside of a bend or a twist. Wide shards give the bulk, narrow ones lie on
them. Joined hard, no blending.

- `page5-first-too-stiff.png` Long shards as stiff as short ones: over a
  whole bend they fly off, and with sawn-off ends the tops look like a
  dropped stack of offcuts.
- `page5.png` Standing off capped at about half a girth, every end a point.
  The gesture holds and the surface is long flat faces, steps and splits.

Not there: shard edges are jagged at the grid's size; the faces all run
long and parallel, like stacked boards; no hollows or knots.
