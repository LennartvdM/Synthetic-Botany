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

Page 5 called much better. Asked for next, with a drawing of straight
jointed bands beside the same bands bowing between their joints: let bands
sag and contract, "but only very subtly to imply elasticity and wear and
tear."

Added: between its ends each shard draws in or spreads (up to about 14% of
its width), drifts to one side (up to about 16% of its width) and sinks a
little, once along a short shard and more than once along a long one, never
the same twice. Its ends stay where they were. `sketch/page5.png`,
`sketch/page5-close.png`.

Also meshed finer (0.0085 from 0.012), which takes the saw teeth off most
shard edges; faint flats remain across wide faces where a shard's line is
made of straight steps.

The give called barely visible, with a correction: wood has no
cross-segments that can be seen at all. Bands sag and contract, "but
that's the only sign of their existence."

Two kinds of visible cross-segment were in the page and are removed:

- Faint flats, then fine ribbing, across every face. Cause: a point's
  place along a shard was found in straight steps while the shard's facing
  turned smoothly, and the mismatch repeated at every step. Making the
  steps three times finer only made the ribs finer. Fixed by settling on
  the place where the way to the point is square to the shard's own
  direction there, with a fallback for the insides of tight bends, where
  that search can wander and leave crumbs in the air.
- Square starts. Each narrow shard ended in a point but began with a face
  cut across the grain. Both ends are points now.

The give itself now works over long stretches (once along a short shard,
twice along one that runs the whole piece) and is about twice as strong:
width by up to 30%, drift by up to 32% of width, thickness by up to 28%.
`sketch/page5.png`, `sketch/page5-close.png`.

Not there: thin tips are still jagged at the mesh's size; no hollows or
knots.

Called better. Asked for next, before knots, with a traced picture: the
spines and ridges of the strands should wiggle. Red was the smooth trace,
green the intent: a line that mostly follows, with small jogs to one side
at uneven intervals.

Added: along each shard two lines wander. One moves the whole shard side
to side (up to 16% of its width), so both edges go with it; the other
moves its ridge across it (up to 30% of its width). Each holds for a
stretch, leans a little, then jogs over a short length and holds again.
Stretches are of uneven length. Not a wave and not grain-fine: a few jogs
along a shard.

- `sketch/page5-jogs-too-abrupt.png` First try, stretches the same length
  on every shard. On the widest bands a jog was then steeper than it was
  long and showed as a ledge across the grain, the thing ruled out in the
  entry above.
- `sketch/page5.png`, `sketch/page5-close.png` Stretch length tied to the
  shard's width (0.8 to 2.7 widths), so a jog is always a slant along the
  grain. Tried longer first (1.3 to 4.5 widths): wide bands went nearly
  smooth again.

Not there: thin tips still jagged at the mesh's size; no hollows or knots.

Knots and hollows put off: "one step ahead of what needs to be done."
Asked for first: "a secondary layer of bands around the branch. It's not
necessarily bark, still core wood, but the outer layer."

Added, as read here: four broad thin bands of the same shards lying over
everything else. They do not close round the piece. The inner wood shows
in the gaps between them, at the foot where every second band starts above
the ground, and past where each one ends. They go round 0.3 of a turn more
than the inner wood over the length of a piece, so the two grains cross at
a slight angle. They have the same give and the same wandering edges.
`sketch/page5.png`, `sketch/page5-close.png`; the state before is kept as
`sketch/page5-before-outer-layer.png`.

Broke on the way: stray bits in the air beside the winding piece. An outer
band on the inside of a tight bend has a line that folds back on itself,
and a shard's shape was unbounded past such a fold. Now bounded, and lines
are kept fair.

What it looks like: there are plainly two layers now, with depth between
them. But in places, most on the twist and at the foot of the turn, the
outer bands read as cloth wound round the piece, not wood: they are broad,
thin, nearly featureless on their faces, and lie too obediently. One band
on the twist ends in a blunt corner.

Slower: each piece now takes 20 to 35 seconds to mesh.

**Outer layer withdrawn.** "It's an exact layer. That's not what I meant, I
meant partial, patches, strands running across." Given with a picture, and:
"cables that are immersed in the core wood but also crudely applied. It's
not a perfect fit, it's nature." Kept as
`sketch/page5-exact-layer-withdrawn.png`.

Replaced by cables: five thick round strands thrown across the shards. Each
runs 35 to 75% of a piece and goes round at its own rate, with or against
the grain (half a turn to a turn and a half more or less than the wood over
a whole piece), so it crosses what is under it. Its section is the shape
two overlapping circles share, which leaves a spine along the top. None is
fitted: its depth wanders between half buried and barely touching, and it
dives into the wood at both ends. Cables are the one thing allowed to blend
into what they lie on; shards are still joined hard.
`sketch/page5.png`, `sketch/page5-close.png`.

First try was timid: thin and nearly all buried, they read as veins under a
skin. Second: thicker (about a quarter to a third of the girth) and centred
at the surface instead of under it.

Not there: the cables are smooth all over, and next to the shards that
reads as a softer stuff laid on, close to what was called squeezed before;
the spine hardly shows; no place yet where one cable visibly crosses
another; a ragged pit at the foot of the twist where a cable dives in.

**Cables withdrawn.** Better, but smooth, as feared. "The layer needs to be
its own thing, immersing it in the core wood doesn't mean it has to be
smooth along with it, it also doesn't mean it has to be sunk into the wood
at all times." And: treat it as a bark, but not a bark texture: "a more
rigid but sporadic outer shell of the same material." Kept as
`sketch/page5-cables-withdrawn.png`.

Replaced by a shell: thin plates of the same flat-faced shards, in five
patches a piece and nowhere else. A patch is two or three plates side by
side, like one sheet split along the grain. The one new rule is rigidity:
a plate is fixed at its middle and hardly bends or twists from there. So
it fits only at that place. Where the piece curves away its ends lift
clear and leave a gap beneath; where the piece curves toward it they bite
in. Nothing says which. Plates are joined hard like everything else, and
the blending the cables had is gone.

- `sketch/page5-shell-too-rigid.png` Allowed to stand a whole girth off,
  the plates are blades stuck on at angles.
- `sketch/page5.png`, `sketch/page5-close.png` Held to a third of a girth
  and made shorter. They sit as a broken shell, lifting at the ends.

Not there: every plate has the same outline, long and pointed at both
ends, so a patch reads as scales or stacked blades; plates are bare on
their faces; on the outside of the turn they pile up; the foot of the
winding piece has a clump of them.

**The shell approved**: "Gorgeous. I'm happy with this." That state is kept
as `sketch/page5-shell-approved.png`. Asked for next: "cracks across its
lengths following the curves, but sporadic, even more sporadic than the
casing."

Added: a crack is a narrow split down from a band's face, running with the
grain along half to four fifths of the band. It keeps to the band's curve
but has its own wandering line, is widest and deepest at its middle and
closes at both ends. On a thin plate it goes right through. Three a piece:
one on a band of the inner wood, two on plates of the shell.
`sketch/page5.png`, `sketch/page5-cracks-from-behind.png`.

Tries: by chance per band, the count ran from one to seven a piece, and the
cracks were short and wide, like slots. Fixed at three and made longer and
narrower, they fell below what the mesh holds and came out as dotted
lines. Widened again to about three cells at the mouth.

Not there: with three a piece most land out of sight from any one side;
from the front of the page as it opens, hardly one shows. Crack ends are
still dotted where they close. No crack crosses from one band to the next.

**Cracks withdrawn**: "more like a laser etching into plastic." The word
wanted is splits, coarse splits. Kept as `sketch/page5-cracks-withdrawn.png`.

And on the shell: its atom, an elongated diamond, is sufficient, but can be
recognised once it is repeated, "and the art magic becomes undone." Three
tricks given for hiding it, all taken:

- The back of a plate dips into the core wood deep enough that its end
  cannot be seen.
- The front has more than one ending: a point, a blunt end, or a step (an
  L, one side ending short of the other).
- Direction. Which end is sunk (the back) and which lies on top (the
  front) is what gives a plate direction, and the first shell had none:
  each plate was fixed at its middle, so both ends did the same thing.
  About nine in ten now point forward, back toward the foot of the piece
  and front toward its tip; the rest are reversed.

Also changed in the shell: a patch is one to three plates of unlike length
and width, set off from each other along the piece. Plates thin toward the
front, and a blunt front is always cut on the slant.

Splits: a band parts along the grain, with a ragged gap between the two
sides and one side lifted. On a plate the split opens from the front end
and closes inward, so the front forks. On a band of the inner wood it gapes
in the middle. Three a piece as before.
`sketch/page5.png`, `sketch/page5-close.png`.

On the way: with blunt and stepped fronts at full thickness the plates
read as sawn planks. Thinner, tapering, and slant-cut is better.

Not there: the foot of the twist is a jumble of plates; a blunt or stepped
front still has a little of the plank about it where it is seen square on;
the inner band's split is deep and dark, more a trench than a split.

The last state called great, with one thing disliked: two plates passing
through each other. A pet peeve, argued: stacking assets through each
other is how most games are built now, but where the join shows, both
assets show, "and the tapestry unwinds." Since this is built by rule, a
rule can prevent it.

It is also this project's own rule, unkept until now: bodies give way to
each other. Each plate was laid without knowing of any other.

Now: a plate is laid only where it is clear of every plate laid before it,
with a little room to spare. Where it would run into one, it is cut back
to its longest clear stretch and made again over that, back sunk and front
raised as before. If too little is left it is not laid. One plate may
still lie over another's sunk back, with room between.

Measured, as the share of plate volume that lies inside two plates at
once: before 6.1, 5.5, 5.0 and 4.9% on the four pieces; now 0.0 on all
four. Of about a dozen plates tried on a piece, three to seven go down
whole, three to five are cut back, two to four are not laid. Looked at as
well as measured: no crossing found in the views taken.

Not covered: plates and the inner wood. A plate's back goes into the inner
wood on purpose, and an inner shard that stands off can still come up
through a plate. Only plate against plate is prevented.

Cost: a plate cut back is short, and its rise from sunk to raised happens
over that short length, so some stand up steeply like flakes, most at the
foot of the twist.

**Knots and notches: attempt stopped, not kept.** Begun (eyes where the
grain parts round a snapped stub or a hollow; rare notches in an edge) and
stopped before it was shown, because the attempt lies elsewhere. Page 5 is
back to the state above. One part is reused below: bands going round an
opening. Put aside for later: the twist piece is ugly.

## Intrusions (`sketch/page6.js`, `sketchbook6.html`)

Given: the wood now has to answer other things. Intrusions are what hollows
really are, and there are two kinds. Benevolent: an orb of life the tree
feeds or protects; the tree is generous and makes ample space for it.
Malevolent: tumours, boils, fruiting bodies, packed tightly in the wood and
bursting out; the tree yields no more than it must, fights, and is losing.
The difference is told by room. Benevolent first. "The orb of life is a
simple orb, then it has a sphere of extra space around it, and then the
tree grows around it. But it does happen within the trunk itself, the trunk
does not curve around it (which is a different feature that comes later)."

Built into page 5's wood as an option, so the material is unchanged:

- The orb is a plain ball on the piece's own line. The line does not bend.
- Round it is a ball of room, kept clear of all wood.
- The wood swells: every band passing the orb is carried outward far
  enough to clear the room with some wood to spare, and back in beyond it.
- The wood opens: on one side the bands part and go round, leaving a
  window on the orb. Bands shift aside and narrow a little; none is cut.
- The rigid shell stays off the swelling.

Page 6 has it in three places (low in a turn, in a winding, at the foot of
a loop) with room 0.6 of the orb's radius, and the first again with room
0.15. `sketch/page6.png`; `sketch/page6-cut-and-behind.png` shows three cut
in half and one from behind. In the viewer the orb is lit from within and
lights the wood near it; that is the viewer's doing, not the asset's.

What it does: the piece swells into a bulb about twice its girth, the grain
parts into an almond-shaped window following the twist, and the orb sits
inside with clear space all round. Cut in half, the room is a clean ring
round the orb. With little room the bulb is smaller and the ring thin.

Broke, or not there yet:

- From behind the bulb is closed and smooth, like an onion. One window
  only, and it shows about half the orb.
- The bands over the bulb are the same few broad ones stretched round it,
  so the bulb is the barest part of the piece. No shell on it either.
- Under the orb the piece is hollow down to the ground: the bands were
  carried out and nothing fills the middle. Seen only when cut.
- The orb touches nothing. It floats in its room.

## Stepping back: strands with an inside (`strands.js`, `runs/008-strands-round-a-ball/`)

The orb exposed the build under page 5. Its bands do not know about each
other or about anything else, and the piece has no inside: the core "was
just a massive abstract thing", and a foreign body put into it showed that
by fitting awkwardly. Said in reply: with an inner world, the inner world
would make space by itself, "AND add the flair of cables and shards that
drift around the foreign body because not everything needs to give."

Kept from page 5: its surface rules, the test pieces, material apart from
form. Taken back from the withdrawn tree: strands that run unbroken from
end to end, girth being how many pass.

Tried small first, with no surface at all. A bundle of round strands fills
a straight post. Each strand is a line of points that is pulled taut,
resists bending (more if thick), and gives way to every other strand. A
ball sits on the post's line. Each strand either gives the ball its room or
does not; one that does not still may not pass through the ball itself.

Prediction, written before the first run:

1. The bundle swells round the ball by a budget, with no swelling rule:
   strands that filled the section must go round, so the bulb's radius is
   about sqrt(room radius^2 + bundle radius^2).
2. Windows open by themselves once the room is big enough that the
   strands, side by side, no longer reach round it: when the way round at
   the ball's widest exceeds the sum of the strands' widths. Little room:
   closed. Ample room: open.
3. Strands that do not give end up lying on the ball inside the room, and
   are seen crossing the windows.
4. No strand ends inside another or inside the ball.

Expected to disappoint: strands spread evenly, so windows will be many
thin slits of equal width, not a few generous openings.

Run, 24 strands, a straight post, ball of radius 0.17 a little below the
middle. Drawn as slices only (`runs/008-strands-round-a-ball/draw.js`): seen
from the front, cut lengthwise, cut across at the ball's widest. Pale
strands give the ball its room; brown ones do not.

- `room.png` No ball, then room 0.15, 0.6, 1.2 and 2 times the ball's
  radius, three strands in four giving.
- `giving.png` Room 1.2; all, three in four, half, one in four, none give.
- `seeds.png` Room 1.2, three in four giving, five seeds.

Against the predictions:

1. Swelling by budget: holds for little room, runs over for ample. Bulb
   0.45 against 0.44 at room 0.15; 0.51 against 0.48 at 0.6; 0.60 against
   0.55 at 1.2; 0.73 against 0.64 at 2. Across seeds at room 1.2, from 3%
   under to 15% over. The budget assumes strands packed solid round the
   room; with ample room they are one loose ring with gaps, some riding on
   others.
2. A size of room at which windows open: wrong. There is no threshold.
   Open share of the way round rises steadily: 2%, 11%, 16%, 26%. Strands
   do not line up side by side until they run out; they bunch, leaving gaps
   long before the sum of their widths is used up.
3. Strands that do not give lie on the ball inside the room: yes, plainly
   in every cut. At room 2 one is seen through a window, crossing behind
   it.
4. No strand inside another or the ball: holds (worst overlap under 5% of
   two radii, no point in the ball) in every run but one. At room 2 one
   pair overlaps by 37%. Not looked into.

Expected to disappoint and did not: the windows are not even slits. The
slow turn of the bundle bunches strands as they go round, and the openings
come out few and unequal.

Not predicted: the share of strands that give is by itself a dial from one
kind of intrusion to the other. All give: a wide loose cage standing off
the ball. None gives: the same strands packed tight on the ball, a small
hard swelling, nothing open. That is the difference described for
benevolent and malevolent, from one number. (A malevolent thing should
also push, and the wood should fail; none of that is here.)

Limits: a straight post only. No surface, so nothing here says how the
shards and shell of page 5 go on. Windows are rarely open toward any one
side; from the front the ball shows in two of five seeds. Strands neither
split nor snap. About 9 seconds a run.

**The ball off-centre.** The three lesser amounts of room were called
largely redundant from outside, since what differs is inside. Asked for
instead: the ball off the post's line, "a big variable in the appearance."

Prediction, before running: a strand goes round the ball on whichever side
it started. Off-centre, fewer strands start on the ball's outer side, so
that side is covered thinly and opens first, and the bulge is one-sided.
Once the ball's middle is at the edge of the bundle, almost no strand
starts outside it: the ball will sit bare in a notch in the bundle's side,
pressed against it and held by nothing. Nothing in these rules makes a
strand reach round to hold something.

Run: the ball moved off the post's line toward the right, in girths (0 is
the middle, 1 puts the ball's middle about at the bundle's edge). A second
view from outside was added to the drawing, from the right, facing the
ball. Three strands in four give.

- `off-centre-room-0.6.png`, `off-centre-room-1.2.png` Off 0, 0.35, 0.7, 1
  and 1.35, at two amounts of room.
- `off-centre-fine-steps.png` Off 0.3 to 0.7 in steps of 0.1, room 0.6.

The prediction held. Widest single opening on the ball, room 0.6: 10
degrees at the middle, 12 at 0.3, 22 at 0.4, 42 at 0.5, 79 at 0.6, 104 at
0.7, 199 at 1, 240 at 1.35. From 0.4 on it faces straight outward, within
20 degrees.

By eye there are four states, not a smooth change:

- Middle: a cage. Swollen all round, small openings wherever they fall.
- 0.3 to 0.5: a cage with a face. One-sided bulge, a single opening toward
  the outside, two or three strands still crossing the ball's outer side.
- 0.6 to 0.7: a niche. No strand passes outside the ball. It sits bare in
  a hollow of the bundle's side, strands parting above it and closing
  below.
- 1 and beyond: pressed against the side. The bundle dents to let it in
  and carries on; the ball hangs outside with nothing round it.

More room makes the dent and the bulge larger but does not change which
state a position gives.

So position does what room did not: it sets how much of the ball shows and
which way it faces. And it shows the rule that is missing. Past about 0.6
the wood yields to the ball but does not hold it. For the wood to keep an
off-centre thing, some strands would have to go round its outer side on
purpose.

Also seen: at off 1.35, room 0.6, one pair of strands overlaps by 31%, the
second such case. Both are at an extreme setting.

## Trees (`trees.js`, `sketch/page7.js`, `sketchbook7.html`)

"Let's build some trees." Built on the strand model, not on page 5's
guide-line build.

Structure (`trees.js`): a tree is 12 to 14 fat strands and nothing else.
Each begins as a root on the ground, goes up the trunk with the rest,
leaves with some of them along a limb or carries on to the top, and ends
in a point. The trunk's and limbs' lines are given; where each strand lies
is settled: taut, stiff, kept to its bundle's line, giving way to every
other strand, to the ground, and to an orb with its room. A limb takes its
strands from the side of the bundle it leaves on. Each strand's outward
facing is away from the middle of the wood round it.

Surface (`sketch/page7.js`): page 5's shard, one to a strand, with its
flat faces, wandering ridge and give in width. Page 5's shard was changed
in one way to allow it: its depth below its line may vary along it.

Four trees: one limb; a loop with a limb; one holding an orb 0.45 girths
off-centre, with a limb; one forked low twice. `sketch/page7.png`,
`sketch/page7-close.png` (the last panel is the orb tree cut in half).

What it does: roots splay and taper, trunks read as bundles, limbs leave
as part of the bundle and not as something stuck on, the loop passes
itself without touching, and the orb sits in a cradle with strands going
round its outer side and a window on it. About 2 seconds to settle and 9
to mesh a tree.

Broke, or not there yet:

- Too smooth. One long unbroken band to a strand, tapering evenly to a
  point, reads as tentacles. Of page 5's surface only the first layer is
  here: no narrow shards lying on the bands, no shell, no splits, no
  stiffness standing a piece off its line.
- Roots are an even star: all much the same length, all flat, all pointed.
- Every limb and top ends in the same long spike.
- Strands still overlap in places: worst 25 to 30% of two radii on three
  trees, 51% on the orb tree, where 102 of 1973 touching pairs overlap by
  more than 15%. The surface hides it, since shards are joined hard.
- Ragged crumbs under the orb, where thin strand ends meet inside the
  room.
- Cut in half, the inside is strands with gaps between them, not solid.

**The casing does not fix the body.** The first trees were called
questionable. Slivers, snapped ends, the rigid shell and splits were then
laid on the strands (`sketch/page7-with-casing.png`), and judged: "I don't
believe the outer casing solves the issues with the initial build."
Agreed on looking: the same thin spikes, starfish roots and ring of tubes
are under it. The casing code stays in page 7 but is switched off (`bare`).

Second body, shown bare (`sketch/page7.png`, `sketch/page7-behind.png`).
Read against page 5's approved pieces, the first body was wrong in
proportion: 12 to 14 thin strands where page 5 had 6 broad bands; every
strand tapered twice, along the trunk and again to a long point; roots laid
flat on the ground as thin arms. Changed in `trees.js`: 8 to 10 strands;
bands broader and flatter; limbs keep most of their girth; six ends in ten
snap short at full girth and the rest fine down quickly; roots are heavy,
come down from a foot raised off the ground, and three in four go into it.

What it does: the trees have mass now. Broad faces, heavy limbs with
broken or hooked ends, and the orb sits in a deep cradle.

What is wrong: they stand on legs. Raising the foot and sending fat roots
down from it left open air between the roots, so the trunk reads as a body
on stilts, and with the heavy forked limbs above, as animals. Blunt ends
are cut too cleanly. Third guess in a row at the body; not yet judged.

**A sock filled with sand.** What bothers, said straight out about the orb
tree: the branch abruptly makes a spherical container and abruptly ends it
"without consequences, which means there's no tension in the roots, it's
just a sock filled with sand." The legged body above is kept as
`sketch/page7-sock.png`.

The cause was in the settling. Every point of every strand was pulled back
to its own place on the trunk's line, and that pull was far stronger than
the strand's tautness: a push died out within about 0.07, under three
steps of a strand. And root points were pinned along their whole length, so
nothing reached them. The wood conformed and had no tension in it.

Changed in `trees.js`:

- A strand is anchored at the far end of its root and nowhere else.
- The bundle as a whole is kept on the trunk's line: at each step all its
  strands are moved together. No strand is pulled back to where it began.
- Each strand is bound to its bundle's middle only very lightly (its free
  end more, or it wanders off: one did, to a whole tree's width away).

Measured on the orb tree, girth of the trunk at heights 0.3, 0.45, 0.6,
0.75, 0.9, 1.05 (the orb's middle is at about 0.55, its room 0.24 in
radius): without the orb 0.38, 0.37, 0.34, 0.33, 0.29, 0.27; with it 0.50,
0.51, 0.51, 0.50, 0.46, 0.31. The swelling now runs from the ground to
about 0.4 above the orb, where before it began and ended at the room.
Overlaps also fell: no touching pair overlaps by more than 15% now, where
102 did.

`sketch/page7.png` (all four, bare), `sketch/page7-orb-tree-round.png`
(the orb tree from three sides and cut in half).

What it looks like: strands run in long lines from the ground past the orb
to the top, and part round it like two curtains; the orb is no longer in a
ball of wood. The roots under it are spread and the foot is wide.

What is wrong now: it is a tent. The swelling is so long that the orb tree
is one cone from ground to shoulder, and the roots have merged into a
skirt; the other three trees have gone the same way at the foot. One
strand on the orb tree is squeezed thin and kinked where it leaves for the
limb. The loop's top has a ragged tear.

Also found: a stiffness setting above about 0.055 makes the settling blow
up. Left at 0.05.

Told: no further check-ins until it looks right. Worked on by eye from
there. The tent is kept as `sketch/page7-tent.png`.

- Tent: each strand bound four times more firmly to its bundle. The
  swelling now reaches a little above the orb and gathers: girth with the
  orb 0.39, 0.43, 0.53, 0.48, 0.43, 0.30 at the six heights, against 0.38,
  0.34, 0.33, 0.33, 0.26, 0.23 without.
- Paddles: a strand standing alone was drawn as flat as one in a bundle.
  A lone strand is now as deep as it is wide, and a limb's strands wind
  round each other as they go out.
- Casing back on, with slimmer plates and more of them pointed.

**Forks tacked on**, said while that was going on, of the limbs: "the same
problem." (`sketch/page7-forks-tacked-on.png`.) Same cause in a second
place: a limb was held to its drawn line from its first step past the
fork, and the trunk was held to its own line straight through. So a limb
turned off abruptly and the trunk did not answer.

Changed: a limb is held to its line only along its far part (from about a
third of the way out), and the trunk is let go where a limb leaves. The
limb's strands, anchored at their roots, find their own way there.

What it does (`sketch/page7.png`, `sketch/page7-other-side.png`): a limb's
strands peel away from low on the trunk and sweep up into it, and the
trunk is drawn over toward the limb below the fork and stands off above
it. On the tree forked low, the two limbs and the top read as one body
parting three ways. On the orb tree, strands run from the roots past the
orb and on into the top.

Still wrong: the orb tree's side limb is thin and ragged where it leaves;
a thin strand hangs loose down the back of the one-limb tree; the top of
the loop is a jumble of ends; shell plates are few on the forked trees,
since most of their length is now forks, which plates keep off.

**Back to the orb tree**: "a lot in there that I don't trust." Given, with
the references again and one redrawn with its roots exaggerated: over the
orb the roots "cross each other and also fork. And they're mostly thin but
also varied in girth."

First answer (`sketch/page7-orb-roots-tacked-on.png`): a second kind of
strand, nine thin roots laid over the orb's opening at random girths.
Corrected while it was being made: "imagine why those roots are thin. It
seems like there's a gradient of roots each with their own role and place
and distance from the center."

Second answer, as read here: one family, graded by distance from the orb.

- For the tree's own strands, how far off the orb each passes now follows
  from its girth: the heaviest furthest, the lightest nearest.
- Inside them, in the orb's room, are finer roots (11, plus forks), and
  their girth follows from their place too: the nearest are the finest.
  Most are near. The nearer one lies the more it wanders across the orb
  and the likelier it forks; further out they run straighter.
- They leave the wood below the orb and go back in above, and give way to
  each other, to the heavy strands and to the orb. Worst overlap between
  two of them: 1% of their girths.

Measured on the tree, nearest approach to the orb's surface against girth
there, all 28 strands in order: 0.01 to 0.05 off, girth 0.008 to 0.024 (10
fine roots and forks); 0.07 to 0.13 off, girth 0.028 to 0.060 (fine and
heavy mixed); 0.16 to 0.20 off, girth 0.072 to 0.093 (heavy only).

`sketch/page7-orb-graded.png`. What it does: the orb is seen through a
lattice of fine roots that cross over and under each other, behind a cage
of middling bands, inside the heavy ones. What is wrong: the cage is now
many bands of similar width side by side, striped like a gourd; the orb
shows only as glow in the gaps; the fine roots are all inside the cage and
none comes out over the heavy wood; the side limb is still ragged.

**Fudging.** Said of both answers above: "You're solving this on a 'I need
to apply extra cables around an orb' problem." And: no rush, no shortcuts;
if it takes weeks to find the reason why there is a variation of girths
round an encompassed body, then it takes weeks. Both answers are withdrawn
as explanations. In both, girth was put in: first at random, then assigned
by distance, with a table that only measured what had been assigned. The
code stays in `trees.js` and page 7 as a record of the fudge.

## Why girths differ round an enclosed body (`runs/009-why-girths-differ/`)

No building. One question, taken in cross-section.

Starting point, from the first rule this project had for wood: girth is
how many pass. If that holds all the way down, a thin root is not another
kind of thing; it is a few fibres going alone, and a heavy one is many
going together. The question is then why a body inside the wood would
leave some fibres in large groups and others nearly alone.

Candidate reason. Wood is laid in sheets, one round another. A body
swelling inside pushes all of them outward. A sheet that began at distance
p from the middle and is pushed out past a body of radius R is stretched
round its circumference by about sqrt(p^2 + R^2) / p: without limit near
the middle, hardly at all far out. A sheet cannot stretch much, so it
tears and draws together into a ribbon. An inner sheet has few fibres, so
its ribbon is thin, and it lies nearest the body. An outer sheet has many,
tears less, and stays a broad band further off.

Experiment: a cross-section. Equal fibres (discs) in concentric rings fill
a round trunk. Each fibre is linked to its two neighbours in its own ring;
a link snaps when stretched past a limit; link strengths differ a little
(the one thing put in). Fibres cannot overlap each other or the body.
Nothing else. A round body grows from nothing at the middle.

Predictions, before running:

1. Every ring tears. The inner rings first, the outer last or not at all
   for a small body.
2. The pieces are graded: mean number of fibres in a piece rises with the
   ring's original distance from the middle.
3. After the body has grown, the pieces lie in order: those from inner
   rings nearest the body.
4. Unsure, and the result decides it: whether a ring tears once (one
   ribbon to a ring, girth simply proportional to the ring's size) or many
   times. With nothing to hold a fibre in place round the circumference, a
   torn ring has lost its tension, which argues for once. But discs of
   neighbouring rings sit in each other's hollows like gear teeth, which
   may hold arcs in place and tear them again.

What would count against the candidate: pieces of the same size from every
ring; or no order by distance; or rings that do not tear but slide aside
whole.

Run: 9 rings, 278 fibres, links snapping at 25% stretch give or take a
fifth. `body-size.png` (no body, then a body of 0.3, 0.6 and 0.9 of the
trunk's radius), `seeds.png` (body 0.6, four more seeds), `limit.png`
(links snapping at 10, 25, 50 and 100% stretch). Rings are shaded from
pale (innermost) to dark (outermost) so that where each ends up can be
read. `rings.js` is the whole experiment.

Against the predictions:

1. Every ring tears, inner first: holds. Seed 1, body growing to 0.6:
   first tears at body size 0.07, 0.15, 0.18, 0.22, 0.30, 0.33, 0.35,
   0.43, 0.45, ring by ring outward. With a body of 0.3 the three outer
   rings are still whole.
2. Pieces graded by the ring's distance: holds. Mean fibres to a piece
   over five seeds, rings 1 to 9: 5.0, 7.5, 10.0, 13.9, 11.9, 18.5, 23.9,
   41.7, 56.0. Smallest piece 2, largest 56.
3. Pieces lie in order: holds. Mean distance off the body, rings 1 to 9:
   0.06, 0.07, 0.14, 0.18, 0.23, 0.27, 0.33, 0.39, 0.48.
4. Once or many times: mostly once or twice, at most four. The outermost
   ring always once. Weaker links tear more often (three or four tears in
   most rings at 10%); stronger links once each (50%). At 100% the middle
   rings tore more than at 50%, which is not understood; one seed.

Nothing counted against the candidate: sizes differ by ring, they lie in
order, and no ring slid aside whole.

Not predicted, and the largest thing in the pictures: the tears line up.
Once an inner ring has opened, the next tears beside it, and the body
breaks out through all the layers on one side. In seed 2 it is bare on
that side. The wood is left as a crescent, many layers deep on one side
and one or none on the other, with the body off-centre in it. The fine
inner pieces do not spread round the body: they are swept together on the
far side from the opening.

So, in this toy, a difference of girths and an order by distance both
follow from three premises: wood is in sheets, a sheet cannot stretch
far, and an inner sheet is stretched more. Girth was not put in.

What this does not show, and must not be claimed from it:

- It is a cross-section. Nothing here has length, so nothing here is a
  root. Whether a torn sheet draws together into a cord running over the
  body, anchored above and below, is the next question and is not answered.
- Crossing. In the pictures given, fine roots cross each other over the
  body's face. Here the fine pieces sit together away from the opening,
  and nothing crosses anything. Unexplained.
- Forking. A tear that stops part-way along a sheet would leave a fork,
  but there is no "along" here. Unexplained.
- "Mostly thin." By count of fibres most of the wood here is in a few
  large pieces. Only next to the body is it fine.
- Sheets were taken as whole rings linked only round the ring. Wood also
  holds from sheet to sheet. Not tried.

**Two objections to run 009, both accepted.** "Your test doesn't vary the
cables. But I also don't think you'll be able to test the meaning of girth
in just a cross section." Its fibres were identical, so it could say where
pieces of unlike size come from, never what a girth does; and stiffness is
a property along a length.

A different account, given: girths are given, and what differs is how each
answers the body.

- "Girthy cables are less flexible, which means that they either stop the
  object from expanding, or give way to the object by sliding around it."
- "The thinner a cable gets, the more flexible it becomes and the longer
  it can hold on, yielding to the expanding object rather than falling
  around it."

On that account, fine roots over the body's face and heavy ones round its
sides is a matter of who is left there.

## Girth and give (`runs/010-girth-and-give/`)

A lengthwise test. A post is a bundle of about 67 cables of unlike girth
(radius 0.014 to 0.064, most of them thin), packed in its section. A ball
grows from nothing on the post's line, or off it.

Premise, the only place girth enters: a cable will not bend over a stretch
shorter than its own stiff length, and that length rises with girth (as
girth squared in the main runs; a beam under tension has such a length,
and it goes as radius squared). Longer than that, every cable is a taut
string. Cables cannot pass through each other or the ball, and in a
collision the thinner gives more. Cable ends are held in height only: the
ends of the bundle stay packed but may rearrange.

Nothing tells any cable to stay on the ball or to leave it.

Control: the same run with one stiff length for every cable.

Predictions, before running:

1. Bow. A thin cable in the ball's way bends over it where it is; a thick
   one stays nearly straight. Greatest departure from its own straight
   line: large for thin, small for thick.
2. Shift. A thick cable in the ball's way is moved aside whole, its ends
   too; a thin one's ends stay where they were.
3. Contact. A thin cable lies on the ball along a length; a thick one
   touches it at a place. So the ball's surface is covered by thin cables.
4. In the control none of the three depends on girth, or only weakly
   (the thinner still gives more in a collision).
5. Not sure: with the ball off the post's line, whether the thick cables
   end up on the near side, the far side, or both.

"Stop the object from expanding" cannot be tested here: the ball's growth
is set, not pushed. A stand-in is recorded: how hard each cable is pressed
into the ball at the end.

Runs. `stiffness-law.png`: ball as wide as the post, on its line; control,
then stiff length rising as girth, girth squared, girth cubed.
`smaller-ball-off-centre.png`: a smaller ball (0.18) on the line, half way
to the post's edge, at the edge; and the control half way.
`face-by-seed.png`: half way, four seeds. Thin cables pale, thick dark.
Each column: from the front, cut lengthwise, cut across at the ball, cut
across the end of the post. `cables.js` is the whole experiment.

Against the predictions:

1. Bow: holds. With stiff length as girth squared and the ball half way,
   thin cables in its way bow 0.15, 0.21, 0.24, 0.19 over four seeds; thick
   ones 0.10, 0.11, 0.11, 0.11. In the control the thin bowed less than the
   thick (0.08 against 0.12, one seed).
2. Shift: fails. Ends moved 0.01 to 0.05 whatever the girth. No cable was
   moved aside whole.
3. Contact: fails, and the other way round. Thick cables lie on the ball
   (0.18 to 0.20 of length, gap none); thin ones mostly do not touch it
   (0.00 to 0.09, standing 0.02 to 0.03 off). The thin are outside the
   thick, not under them.
4. Control: as expected for bow; contact and shift show no clear relation
   to girth there either.
5. Off the line: no sorting to a side. Counted over the ball's outer face,
   four seeds: 12 thin, 13 middling, 13 thick with stiffness by girth; 3
   thin, 14 middling, 11 thick in the control. So stiffness by girth puts
   more thin cables over the face than the control does, but the thick are
   there just as much.

Stand-in for "stop the object": thick cables are pressed into the ball 5
to 10 times harder than thin ones (0.15 against 0.02).

Against the account given: "less flexible" shows (half the bow); "stop the
object" cannot be tested but the stand-in agrees; "sliding around" was not
seen; thin cables yield but do not hold on. Neither confirmed nor refuted,
because the test is wrong in ways that bear on exactly those two points:

- Nothing can slide around. Cable ends are kept packed in the bundle, so
  no cable can move aside whole; and a ball as wide as the post leaves no
  side to go to.
- Nothing can hold on. There is no grip between a cable and the ball. A
  thin cable has no way to stay on a surface that is moving out from under
  it except by being pushed.
- A rule of mine works against it: in a collision the thinner gives more.
  That pushes thin cables off the ball and out behind the thick ones,
  whatever their stiffness. It may be right or wrong; it was not in the
  account given and it decided result 3.
- The cables start straight and the ball grows from nothing among them.
  "Hold on" suggests cables that were already lying on the body when it
  was small. Not modelled.

Each run takes about 20 seconds.

**A proxy is allowed.** "It doesn't need to be realistically derived, if
you've got an abstract proxy that achieves the same that's good." Read
here as: the reason may be put in as a behaviour by girth; the result may
not be. What was withdrawn above put in the result (thin roots on the
orb).

## Resist and grip (`runs/011-resist-and-grip/`)

Run 010 with the two behaviours it had no way to show, as proxies by
girth, and its faults mended.

- Resist (thick). Where a thick cable and the body overlap, the body gives
  way, not the cable. The body is pushed off by what resists it, and is
  held to where it began only weakly. Stands in for "stop the object from
  expanding".
- Grip (thin). A thin cable lying on the body holds its place there: in a
  collision it does not give way to another cable. Stands in for "hold
  on".
- Sliding round is given no proxy. Cable ends are no longer each kept in
  place; only the bundle as a whole is. So a stiff cable can be moved
  aside whole if that is what happens.

Stiff length by girth squared as before. Girths as before: given, most of
them thin, placed at random. The ball starts 0.3 of the way from the
post's line to its edge and grows to 0.2.

Predictions, before running:

1. The ball moves, and away from where the thick cables near it are.
2. Over the ball's outer face the cables are mostly thin: at least two in
   three, and at most one thick, in each run.
3. Thick cables in the ball's way bow least and are shifted most.
4. Without grip, thin cables are pushed off the face as in run 010.
   Without resist, the ball stays where it is and thick cables are on the
   face as often as thin. Without both, run 010 again.

Runs. `which-proxy.png`: both proxies, resist only, grip only, neither
(seed 1). `seeds.png`: both, seeds 2 to 5. Columns as in run 010.
`cables.js` is the whole experiment.

Against the predictions:

1. The ball moves away from the thick cables: holds in four runs of five.
   Moved 0.22, 0.29, 0.20, 0.28 (the ball's radius is 0.2), and 1.00, 0.99,
   0.94, 0.99 of that straight away from the thick cables near it. In
   seed 5 it moved 0.05 and not in any one direction: there the thick
   cables lay all round it.
2. Mostly thin over the outer face: holds in those four, on very few
   cables. One or two cables over the face each time (thin and middling;
   no thick). In seed 5: 6 thin, 6 middling, 4 thick, as in run 010.
3. Thick bow least: holds (0.07 to 0.10, against 0.13 to 0.21 for thin).
   Thick shifted most: fails again. Nothing is shifted (ends move 0.00 to
   0.02). No cable slides aside.
4. One at a time: grip alone does nothing (same as neither). Resist alone
   moves the ball only 0.05 and leaves 11 cables over the face, 4 of them
   thick. Not predicted: it takes both. A guess at why: without grip the
   thick cables are pushed round to the ball's outer side as well, and
   then resist from every side at once.

What it looks like, in the four: the ball is pushed to the post's edge or
just outside it. The thick cables stand straight beside it. One or two
thin ones are carried out over its face in a long shallow bow, from well
above to well below.

So the two proxies give the two halves of the account given: thick cables
stop the body, which goes where they are not; thin ones hold on and are
carried out on it. And two outcomes follow from where the thick cables
happen to lie: on one side, and the body comes out the other; all round,
and it is held in.

Wrong, or not there:

- Too much. The ball all but leaves the post, and takes only one or two
  cables with it. In the pictures given a body is still in the wood with
  many roots over it. How far it goes is the weak hold on the ball against
  the strength of resist; neither was varied.
- Sliding round is still not seen, with ends now free. In this model the
  thick cables never move; the ball does.
- The outcome is all or nothing across seeds (out in four, held in one).
- No crossing and no forking. Cables here are straight and parallel to
  begin with, so there is nothing to cross.
- Run with one girth distribution, one ball size, one starting place.

**Hold against resist.** Run 011 again, varying the two numbers that
decide how far the body goes: how firmly it is held to where it began
(hold, 0.02 in run 011) and how hard thick cables push it (resist, 1).
Wanted, from the pictures given: a body still in the wood, half out, with
a spread of thin roots over its face.

Prediction, before running: a trade-off with no good middle. Held
firmly, the ball cannot escape the thick cables, so they are pushed out
over its face as in run 010 (many cables over the face, thick among
them). Held loosely, it leaves as in run 011 (one or two thin). Whether
any setting gives many over the face and mostly thin is the question; I
expect not, because the thin are carried out only by a ball that moves.

Runs: `hold-resist-1.png`, `hold-resist-0.4.png` (hold 0.02, 0.05, 0.12,
0.3 at two strengths of resist), `hold-fine.png` (hold 0.025 to 0.04).
Seed 1, ball starting 0.3 of the post's radius off its line.

Found on the way: the strength of resist made no difference at all. In
the code it multiplied both the push and the weight the push was averaged
by, so it cancelled; it was only ever on or off. Fixed. After the fix only
the ratio of hold to resist matters (hold 0.02 with resist 0.5 gives the
same as hold 0.04 with resist 1), so there is one dial, not two.

Where the ball ends, in the post's radius from its line, and the cables
over its outer face (thin, middling, thick):

  hold 0.02   1.05   1, 1, 0
  hold 0.025  0.92   1, 1, 0
  hold 0.03   0.71   2, 3, 1
  hold 0.035  0.31   2, 5, 5
  hold 0.05+  0.30   2, 6, 5

The prediction held: there is no setting with many cables over the face
and mostly thin. The change from out to in is steep (between 0.025 and
0.035), and the one setting in the middle, hold 0.03, has the ball half
out under six cables of mixed girth.

The telling number is the thin column: two, at every setting. Holding the
ball in or letting it go changes which thick and middling cables are left
behind, not how many thin ones are carried out. The thin over the face
are the thin that began there, and the ball's outer side starts at the
rim of the post, where there are few cables of any girth.

So in this model girth decides who is left behind, and nothing decides
who comes over. The spread of fine roots over a body in the pictures has
to come from somewhere else: cables drawn over it from the sides, or
wood that grows over it after it is there. Neither is in any test so far.

## A manifold (`runs/012-manifold/`)

"Time to run a manifold, no need to test each hypothesis in sequence."
One experiment with every mechanism so far as a switch, all 32
combinations run at once and shown side by side.

The lengthwise test of runs 010 and 011, a ball growing 0.3 of the way
from the post's line to its edge, with five switches:

- S, stiffness by girth (stiff length as girth squared). Off: one for all.
- R, resist: thick cables push the ball, held to its start at 0.03 (the
  half-out setting of run 011).
- G, grip: a thin cable on the ball holds its place.
- T, twist: the cables start wound half a turn round the post over its
  height. New. Without it cables start parallel and nothing can cross.
- X, split: a cable pressed against the ball long enough divides
  lengthwise over the stretch where it is pressed, into two of half its
  area, which part over the ball and rejoin beyond it. Either may split
  again. New. A proxy for "girth is how many pass": a thin cable is what
  is left when a thick one has been divided.

Cable ends are anchored (roots), which runs 010 and 011 did not have.
Measured beside the pictures: cables over the ball's outer face by girth;
crossings over the face (pairs whose order round the ball differs above
and below it); forks; whether thin lie nearest the ball (rank correlation
of girth with distance from it, near the ball); where the ball ends.

Predictions, before running:

1. Crossings over the face only with T.
2. Forks only with X (by construction). Thin cables over the face many
   more with X than without; and a gradient, thin nearest, only with X.
3. R moves the ball half out in every combination with G, as in run 011,
   and does not change the thin count.
4. S and G alone change little.
5. The pictured target (half out, many thin over the face, crossing and
   forking, thin nearest) needs at least T and X. Unsure whether R is
   needed too, or works against it by carrying the ball away from the
   cables that would split.

Runs: `seed-1.png`, `seed-2.png`, all 32 combinations twice, with the
tables beside them (`seed-1.txt`, `seed-2.txt`). Each cell: the ball's
outer face seen from outside, the post cut across at the ball, measures.
Rows: neither, twist, split, both. Columns: stiffness, resist, grip.

Against the predictions, over both seeds:

1. Crossings only with twist: wrong. Without split, crossings are 0 or 1
   in every cell of both seeds, twist or not. With split, 6 to 547, twist
   or not. Crossing comes from splitting: the two halves part sideways
   over the ball and pass over and under their neighbours. What twist does
   add is the slant: with it the thin strands run diagonally across the
   face, without it straight up in a tight mat.
2. Thin over the face and a gradient only with split: holds. Thin over
   the face without split 0 to 7, with it 18 to 121. Rank correlation of
   girth with distance from the ball (positive = thin nearest) without
   split -0.49 to 0.09, with it 0.13 to 0.65. Mean effect of split on it
   +0.46 and +0.65; no other switch moves it by more than 0.15.
3. Resist puts the ball half out with grip: wrong, now that the ends are
   anchored. Without twist, resist barely moves it (0.25 to 0.48 of the
   post's radius). With twist and no split it is thrown clear (1.0 to
   1.25), face bare. With twist and split: half out (0.66 to 0.75) without
   stiffness, face bare; held in (0.30 to 0.37) with stiffness.
4. Stiffness and grip alone change little: holds without split. With split
   each halves it or more (forks fall by 39 to 56 on average). Why is not
   understood.
5. The target needs twist and split: half right. The cells nearest the
   pictures given, by eye, are stiffness, twist and split, with or without
   resist and grip: the ball seen through thin strands crossing on the
   slant, thinnest nearest, thick ones standing off. But there the ball
   has hardly moved (0.30 to 0.37). In every one of the 64 runs where the
   ball comes half out or further, its face is bare.

So one rule, split, gives four of the things in the pictures at once:
thin strands over the body, forks, crossing, and thinnest nearest. It is
the proxy for "girth is how many pass", and the gradient was not put in:
the most pressed are divided most. Twist adds the slant; stiffness keeps
the thick standing off.

What none of the five gives: a body that comes partly out of the wood and
is still covered. Every mechanism tried so far either holds the body in
or lets it leave bare. Grip, meant to carry thin strands out with it,
does not.

Each manifold took about ten minutes on four cores.

## The tree, with what the manifold found (`trees.js`, page 7)

"Let's build the tree." The orb tree rebuilt on the manifold's result. The
withdrawn roots-over-the-orb code and the girth-by-distance rule are
removed from `trees.js`.

Into the tree kernel:

- Split. A strand pressed against the orb long enough divides lengthwise
  over the pressed stretch into two of half the area, which part sideways
  and rejoin beyond. Either may divide again, down to a least girth.
- The orb grows, so that strands are pressed in turn.
- A mixed population (option): about 40 strands, most thin, a few heavy,
  as in the manifold, in place of 12 near-equal ones.
- Stiffness by girth (option): a strand leaves the tree's line only
  gradually, over a stretch rising with its girth squared.
- A last clearing phase: strands only give way to each other and keep off
  the orb, with nothing pulling them together.

Three builds:

1. `page7-orb-split-first-gourd.png` Split only, on the old 12 thick
   strands round an orb nearly as wide as the trunk. A gourd: about 50
   parallel bands in one layer, one slit, nothing crossing, nothing thin
   over the face. The tree did not match the manifold's conditions.
2. `page7-orb-split-buried.png` Mixed population, stiffness, a smaller
   orb (0.13, room 0.18). The orb is gone from sight. Measured by rays from
   its middle over its outer half: 4% open under 1.7 strands, at the
   strands' own girth. Also found here: many thin strands among thick ones
   overlapped (up to 434 of 2661 touching pairs by more than 15%), all at
   the orb. More give-way steps a pass helped slowly; the clearing phase
   removed them (0 of 1162).
3. `page7-orb-split.png` The same with the orb placed further out.

Why 2 was buried, worked out after seeing it: split conserves area, so
two halves are together wider than the strand they came from (by root 2).
Splitting makes cover, not openness. Openness comes from where the orb is,
which the manifold never varied. Measured, the orb's outer face against
its place (in girths from the trunk's line):

  0.45  4% open, 1.7 strands deep
  0.7   27% open, 1.0 deep, 23 strands over it, girths 0.012 to 0.031
  0.8   48% open, 0.6 deep, 14 strands, 0.012 to 0.031
  0.9   77% open, 8 strands
  1.1   bare

Control at 0.7 without split: 83% open, 5 strands over the face, girths
up to 0.040. So split turns 5 strands over the face into 23 thin ones, and
place sets how much shows. No heavy strand lies over the face at any
setting: the heavy ones in its way have been divided.

What 3 looks like: the orb glows through gaps between thin strands that
part over it and rejoin above and below; heavier strands stand behind and
beside; girths are mixed all the way up the trunk.

Wrong, or not there:

- Little crossing. The strands over the face fan side by side; few go
  over one another. The manifold's crossings came with many more strands
  pressed in layers.
- The trunk above is a shaggy cone to one spike, and the roots are many
  thin toes. The body approved earlier had 8 to 10 broad strands; this
  one has 40, mostly thin, and it shows.
- The other three trees are untouched and still on the old population.
- One seed, one orb size. About 40 seconds to settle, a minute to mesh.

**"A bit ribbony."** Said of the orb tree, with no fix offered. Read here
as the fault of page 4 come back: each strand was drawn as one flat
section pushed along one smooth line, which is an extrusion. Page 5 had
answered that by never drawing a long thing as one piece, and the strand
trees dropped it.

Changed in page 7's surface, for every tree: a strand is drawn as a chain
of stiff pieces. Each runs 7 to 17 girths of its strand, is nearly as
deep as it is wide (was about a third), and is drawn toward its own
straight line, though never more than a third of a girth off the
strand's, so the chain bends in knees. Its back is sunk under the piece
before; its front lies a little proud and ends in a point, a slant or a
step. All face the tip. The strands themselves are unchanged.

`sketch/page7-orb-chained.png` (orb tree whole and close, and the
one-limb tree). The orb tree is now 217 pieces on its heavy strands and 44
on its fine ones.

What it does: the trunk reads as overlapping splints with ends, steps and
slanted cuts, and is chunkier. Heavy strands are plainly better.

What is still ribbon: the fine strands over the orb. A third of a girth
is nothing on a strand 0.012 thick, so they are still smooth cords in
smooth arcs, side by side at even spacing. And strands that run together
are still separate, with air between them: nothing fuses.

**Fusing, and string cheese.** On my proposing to fuse strands that run
together: "Fusing I'm most worried about actually, it should be part of
it but the plasticity is also in that the bark should be able to stretch
and split like cheese string."

Read here as: no fusing step. If the tree is a few heavy strands and
everything fine comes from pulling them apart, then what is fused is
simply what has not been pulled apart. And the split should behave like
string cheese, which it did not: it made two clean cords.

Changed:

- The orb tree is back to 12 heavy strands of unlike girth (the mixed
  population of 40 is dropped for it; that was the shaggy cone).
- Torn faces. Each part of a split knows which way its other part lies
  and is drawn with a steep flat wall on that side and its ridge beside
  it, so two parts read as one body cut down the grain.
- Necking. The further a part has been drawn from what it split from,
  the thinner it is there (down to a least girth).
- Threads. Near where a split closes, up to two fine threads at each end
  still cross the gap on a slant, where nothing else is in the way.

Numbers, orb 0.7 girths out: 12 strands become 40 by 28 splits; split-off
girths from 0.010 to 0.053, spread evenly across that range; 42 threads;
no touching pair overlaps.

`sketch/page7-orb-string-cheese.png`. What it does: heavy again. The orb
shows through two or three large openings between parted halves with flat
inner faces, and a thread crosses its face. The girths round it vary far
more than before. It no longer reads as ribbon.

Wrong, or not there:

- Necking does not show. Parts look the same girth along their length.
- Threads are few where they can be seen, and read as wire: straight,
  one girth, round. String cheese threads taper from both ends and are
  thinnest in the middle.
- A long thin part stands off the trunk above the orb like a loose cable.
- Some parted halves end in square plank corners.
- Nothing peels: every split rejoins at both ends. A strip attached at
  one end and lifting at the other is not there.

**Elbows.** Shown, on the string-cheese tree, one strand turning a corner
at one width like a mitred plank, with wedges drawn fanning round the
corner: "the bend is a good idea, but its width can't remain even around
the bend, the inner curve needs to ease so more surface in the elbow."

Rule added to page 7's surface: where a strand bends it fills in on the
inside of the bend, in proportion to how sharp the bend is, eased in
before the corner and out after it. It fills only as far as there is free
room on that side, so nothing is made to pass through anything.

First try changed nothing visible. Measured why: the sharpest turns in
the tree (90 to 139 degrees over four steps) are all two points from the
end of a split-off part, where it rejoins what it split from. The elbow
shown is a split's join. And at a join the thing in the way of the fill is
the other half, so it filled nothing.

Second try, two changes:

- The fill is allowed toward a strand's own kin (the same strand before
  it split). Between two halves of one body it is the crotch, wood not yet
  parted, not an intersection. It still stops short of anything else.
- In `trees.js`, split halves were meant to part gradually: full giving
  way to each other only from ten points beyond the join, not three.

`sketch/page7-orb-elbows.png`. The corner shown now turns as a broad arc,
widest at the elbow, inner edge on an easier curve; openings round the orb
have rounded corners.

What did not work: the second change. The sharpest turns in the strands'
own lines are no gentler (158, 128, 122 degrees now). The halves still
hook back to their joins; the fill covers it. So the look is mended at
the surface and the cause is still there underneath.

Also seen: where two threads and a strand meet near the orb they make a
small ladder, which reads as built.

**Tearing.** "Same logic for the splitting, it really needs to feel like
tissue tearing." The split's "torn face" was a steep flat wall toward the
other half, which is what a knife leaves. Withdrawn. Tissue stretches
thin and then parts.

Changed:

- A torn edge is a lip. A part that has torn from another is thickest on
  its far side and thins toward the tear, above and below, to about a
  fifth of its thickness. (Page 5's shard gained one thing for this: it
  can feather toward one edge.)
- The lip reaches. Toward what it tore from, a part extends a little
  under half way across the gap (at most 1.3 girths, and only into free
  room). Where the gap is narrow the two lips all but meet; where it is
  wide they stand apart. So a tear closes as a web with a slit.
- Necking is stronger (a part drawn a girth away from its other half is
  about 30% thinner; was about 20%).
- A thread is drawn out: 1.7 times its girth where rooted, 0.7 in its
  middle. One to a tear's end, not two; that also ends the ladders.

`sketch/page7-orb-torn.png`. Openings round the orb now have curved thin
lips and read as tears in one body, almond-shaped, where before they were
gaps between cords with flat sides. 23 threads. Nothing overlaps.

Wrong, or not there:

- Lips are ragged in places: at a fifth of a part's thickness they are
  near what the mesh can hold.
- The webs at a tear's tips are hard to find in the pictures; I cannot
  say from them that the lips meet there as intended.
- Threads are still hard to see at this size.
- Still nothing peels free at one end.

**"Maybe some strands are too short."** With arrows at the shoulder above
the orb, where the cage stops in a shelf.

Measured: all 26 split-off parts rejoined between heights 0.82 and 0.92,
with the top of the orb's room at 0.86. Their lengths were 11 to 15
steps. Cause: a strand was split only over the stretch where it was
pressed, plus a fixed six steps each way. Every tear was the same short
length and they all ended in a ring.

Changed in `trees.js`: a tear runs on along the grain past where the
strand was pressed, each end by its own amount (4 steps and up to 34
more, most of them short, a few long).

Now: parts rejoin anywhere from 0.88 to 1.46, lengths 12 to 39 steps.
`sketch/page7-orb-long-tears.png`. The shelf is gone. Parts run from near
the foot past the orb and on up the trunk, ending at unlike heights.

Cost: the bulb is less marked. With long parts all round it the trunk is
closer to one tall cone again, and the orb sits in a deep opening in it
rather than in a swelling of its own. Also still true: the sharpest turns
at the joins are no gentler (161, 127, 115 degrees); longer parts did not
ease them, as hoped.

**"Perpendicular splits look ugly, they turn into crossbeams and nature
doesn't do perpendicular."** Three things ran across the grain: threads
(a slight slant across a narrow gap is nearly square); joins (a split-off
part hooking back to its strand); and cut ends (a third of the chain's
pieces ended in a square step).

One rule for all three: nothing meets the grain at more than about 30
degrees.

- Cut ends are all long slants now (17 to 29 degrees to the grain).
- A thread runs along the grain at least 2.2 times as far as it goes
  across, or is not made.
- Joins. Two wrong tries first. Zipping a part's last few points onto its
  strand did nothing. Looking closer: parts that bow round the orb are
  stretched, their points up to three times as far apart as they should
  be, so the last points cover the whole sideways distance in two or
  three steps. That short steep leg is the crossbeam. The rule that
  works is about angle: a part may never stand further from the strand it
  split from than half the way it has run from the join (a wedge of about
  27 degrees at each end). And stretched strands are stepped again at the
  usual spacing and eased. (A smooth curve fitted through them looped, and
  made hairpins of 177 degrees; replaced by straight resampling.)

Measured as the sharpest turn of each strand over a length of 0.14:
split-off parts, median 83 degrees before, 40 now; worst 155 before, 121
now.

`sketch/page7-orb-no-crossbeams.png`. Everything runs along the grain;
no crossbeams, no ladders, no square shoulders.

What it cost, measured:

- The orb shows less. Its outer face, at the strands' own girth, was 33%
  open and is 19%. Held in their wedges the parts cannot stand as far
  apart, and long shallow threads cover more than short ones. I moved the
  orb out slightly (0.7 to 0.75) and halved how far a torn lip reaches;
  that did not win it back.
- Two touching pairs overlap by more than 15% (of 81). It was none. The
  wedge pulls a part toward its strand whatever lies between.
- Two of the twelve original strands now have hairpins of their own (141
  and 147 degrees) that they did not have. Not understood.
- With every part long and along the grain it is closer to a sheaf of
  strips again, which is the look called ribbony three steps ago.

**Strands may overlap; the fault is the bundle of strings.** "Strands can
overlap, right now the challenge is making it look less like a bundle of
strings." So the two overlapping pairs above are not a fault, and the
clearing phase is cut back (200 passes to 60).

Why it was strings, as read here: every strand was cleared fully from its
neighbours and drawn no wider than itself, so each was a separate cord
with air round it; and each was a shallow strip, with nothing behind it.

Changed in page 7's surface (mass): away from any tear, a strand is drawn
wide enough to run into its neighbours (1.55 to 1.95 girths, was about
1.2) and deep enough to reach the middle of the wood round it. Where it
has torn from another, passes an orb, or runs alone as a limb, it is drawn
at its own girth. So the only gaps left are tears.

Three things went wrong on the way, all showing as flat planks and fins
standing off the trees (`sketch/page7-mass-with-planks.png`):

1. Blamed the bark first. I had also made the plates broad enough to lie
   over several strands; narrowed them again and laid them closer. The
   fins did not change. The broad plates stay withdrawn anyway.
2. Blamed the widening where a strand runs alone. Limited it to bundles.
   The fins did not change.
3. The cause: the long slanted ends introduced for "nothing square" two
   entries up. A slant was centred on the strand's end, so one side of
   every cut ran out past the end as a straight blade, up to 0.26 long.
   A slant now only cuts back into its piece. (Page 5's shard has an
   option for this; page 5 itself is unchanged.)

`sketch/page7.png` (all four), `sketch/page7-orb-mass.png`. Trunks are
solid and ridged, limbs are heavy, and the orb's openings read as tears
in a body.

Wrong, or not there:

- Ragged crumbs where roots meet the ground on three trees, and a ragged
  patch on the one-limb tree's limb.
- On the orb tree the lower half is still strandy: those are torn parts,
  drawn at their own girth, and there are many of them.
- The orb shows through one opening from the front, not several.
- Bark is back to a few narrow plates. Nothing ties the surface across
  strands except their running into each other.

**A third layer: bark.** Proposed: core, then the secondary layer of
"ribbons" which is not true bark, and now patches of actual bark on top,
procedural, to break up the wiry look.

Built in page 7's surface. A patch of bark is a stiff sheet over several
strands at once. Under it the height of the wood is taken, the highest
near by is kept (so the sheet spans the grooves between strands), and it
is evened out, more along the grain. On that sheet:

- An outline pointed at both ends with wandering sides, 0.4 to 0.8 long
  and 0.2 to 0.4 wide.
- Furrows along the grain, each on its own wandering line, splitting the
  patch into two to six long plates. Each plate has its own thickness
  (0.65 to 1.35 of the patch's) and is a little cupped, higher at its
  edges.
- One or two breaks on the slant (about 20 to 30 degrees to the grain),
  across one or two plates only.
- A direction: the back thins to nothing in the wood, the front lifts
  clear by up to twice the bark's thickness with a gap under it. Nine in
  ten face the tip.
- Up to six patches a tree, apart from each other, none within about two
  of an orb's room. The orb tree got three.

Two builds. `sketch/page7-bark-first-slashes.png`: furrows cut through to
the wood and read as claw slashes or gills, and patch edges were
perforated where the sheet stopped in mid air. `sketch/page7.png`,
`sketch/page7-bark-close.png`: furrows are grooves, deepest in the middle
and going about two thirds through; at its edges the sheet turns down
into the wood.

What it does: a patch hides the strands under it and puts a different,
broader rhythm there. Trunks with a patch or two no longer read as wire.

Wrong, or not there:

- Every patch is the same almond. Seen twice on one tree the shape is
  recognised, the fault named earlier for the shell's diamond.
- Edges are still perforated in places, and patches that land on a thin
  limb break up into noise (worst on the one-limb tree's limb).
- Furrows within a patch are near parallel and evenly spaced.
- The orb tree is the least changed: three patches, and none near the
  orb, which is where it is most wiry.

**Furrowed bark withdrawn.** "It's the wrong kind of bark. It's like a
see through mesh you've applied. I want sheets of tissue, that are patches
around the tree. Their texture shouldn't have any direction at all. Just
coarse grit." Kept as `sketch/page7-bark-furrowed-withdrawn.png`. It had
furrows, plates and breaks, all along the grain: more lines on a thing
with too many, and grooves that read as holes.

Bark is now sheets of tissue:

- One unbroken skin over a region. "How far outside the wood" is taken
  softly over all the strands near by, so the grooves between them are
  bridged, and the skin is a thin layer on that. Nothing shows through.
- In the round. A sheet covers everything within reach of its middle, on
  whatever side of the tree, so some go half way round a trunk or right
  round a limb.
- An irregular outline (its reach differs by direction), thinning to
  nothing at the edge. Kept off an orb's room.
- Coarse grit with no direction: the surface rises toward the nearest of
  a scatter of points, one to a cell of about 0.035, giving rounded lumps
  of one size. It is the first texture in this project put on a surface
  for its own sake; the early rule against noise on surfaces was about
  shapes being found, and this was asked for by name.

Two builds. `sketch/page7-bark-tissue-first-padded.png`: 0.024 to 0.034
thick over a loosely taken surface. Inflated pads, like cushions strapped
on, with grit only in their middles. `sketch/page7.png`,
`sketch/page7-bark-close.png`: 0.012 to 0.018 thick, taken closer to the
wood, grit to the edge. The sheets follow the forms under them.

Three to five sheets a tree. About 20 seconds more to build all four.

Wrong, or not there:

- The grit is rounded lumps, closer to pebbled or warty skin than to
  grit. Finer or sharper grain is under what the mesh holds.
- Where a sheet lands on a thin limb it still breaks into holes (the
  one-limb tree's limb).
- A sheet's edge is a soft fade into the wood. A sheet of tissue would
  have an edge: a lip, a tear.
- The orb tree has three sheets and none near the orb.

**Tortoise shells.** Said of the tissue sheets, with four photographs of
thin pale bark coming off trunks: "It feels as though you're slapping
tortoise shells on it. The bark patches need to feel shredded and torn at
the edges." Kept as `sketch/page7-bark-tissue-shells-withdrawn.png`.

Read off the photographs, as geometry: the bark is a thin flat sheet of
one thickness right up to where it stops, so its edge is a cliff; its
ends are torn along the grain into pointed tongues of unlike length while
its sides run straighter; it has split open in long tears pointed at both
ends, with the wood showing in them; at torn ends it stands off the wood;
its face is nearly smooth.

Rebuilt on that:

- One thickness (0.026 to 0.034) to the edge. No fade.
- Strips. Which strip a place belongs to depends only on where it lies
  across the grain, and each strip ends where it happens to, each end
  torn separately. So the two ends of a sheet are tongues.
- On about half the strips, toward the torn end, the whole thickness
  stands off the wood, with a gap under it.
- Seven sheets in ten have one long tear along the grain.
- The lumps are gone. A slight directionless unevenness is left (0.004).

`sketch/page7.png`, `sketch/page7-bark-close.png`. Two to five sheets a
tree.

What it does: the sheets read as skin coming away in shreds, not as
shells. Ends are fringed with tongues; some stand off.

Wrong, or not there:

- Over-shredded. The fringe is many thin spikes of similar size. The
  photographs have fewer, broader tongues and long clean runs of edge
  between them.
- The edge does not read as a cliff. The tongues are so thin that their
  thickness cannot be seen, and it looks like torn cloth or hide.
- The sheets are large and smooth, and where one wraps a limb it hides
  the strands entirely: the limb becomes a smooth sleeve.
- The long tears cannot be found in the pictures.
- The loop tree has a ragged hole where a sheet crosses the inside of
  the loop.

**Erratic outlines, and colour by layer.** Given, with a sketch of three
outlines (a few big angular points of unlike length, deep notches,
straight runs of edge, none alike): "The fringes of the pieces should be
simplified, and the patches should be highly erratic." And: elements may
be given separate colours to see what is being done, with grey clay to
judge whether the result is cohesive.

Bark sheets: the strip fringe, the long tear and the last of the grit are
gone. Each sheet has its own outline: a polygon of four to six points with
a notch between each pair, turned a little off the grain, with clean
straight edges of the sheet's full thickness (0.028 to 0.038). Sizes vary
widely (half-length 0.14 to 0.5). Peeling in places along the edge. Up to
seven a tree.

Viewer: a switch colours each layer: strands, torn parts, slivers and
shell, bark. Each vertex takes the layer of whichever piece is nearest.

`sketch/page7-layers.png`, `sketch/page7.png` (the same in clay).

Two things the colours showed at once:

- `sketch/page7-layers-first-stars.png`. The first outlines were thin-armed
  stars, all point and no body. Notches now come in only about half way,
  so a sheet is a broad body with points off it.
- The orb tree is nearly all "torn parts". At first that was a fault of
  the tagging (whole strands tagged, not stretches); mended, it is still
  nearly all torn parts, because almost every stretch of that trunk has
  been split. That is why it reads strandy where the others do not.

Also seen in colour: the orb tree's only bark is on its limb. Bark is
anchored on strands that have not split, and on that tree hardly any are
left. And slivers and shell (pink) are long narrow streaks along the
grain, the wiriest layer after the torn parts.

In clay: on the loop and the one-limb tree the large sheets read as flat
angular plates lying on the trunk, with an edge. Smaller ones are lost
among the strands.

**Bark as swathes of cells.** Said of the erratic patches: bark needs a
minimum surface, tiny patches are not worth adding. And proposed:
"encasing the tree in an invisible voronoi mesh and then creating swathes
of voronoi clusters. That way you control how much it percolates and how
much it stays cohesive."

Built so, replacing the separate patches and their drawn outlines:

- The mesh. Points are scattered evenly over the outside of the wood,
  across each strand as well as along it, none nearer another than 0.08,
  and each owns the space nearer to it than to any other. 180 to 320 cells
  a tree. Torn strands have cells too; only the orb's opening has none.
- Swathes. One starts at a cell and spreads to neighbours. `percolate` is
  the chance it goes on after each cell. `cohere` is how strongly it
  prefers a cell already touching several of its own. Swathes are laid
  until `cover` of the cells are on (0.3). One under `least` cells (10) is
  taken off again: the minimum surface.
- The sheet: 0.03 thick, flat-faced, one thickness to its edge, lying
  over the strands. Its edge is the boundary between a cell that is on and
  one that is off, so it is straight runs and angles without any outline
  being drawn. Peeled in places along that edge.

`sketch/page7.png`, `sketch/page7-layers.png` (the four trees).
`sketch/page8.png`, `sketch/page8-layers.png`: one tree, four spreads:
few and compact (percolate 0.985, cohere 4), few and reaching (0.985, 0),
many and small (0.93, 2), most of the tree (cover 0.65).

Broke first (`sketch/page8-first-bubbles.png`): bark as bubbles and rings.
Peeling was triggered by distance from a cell's own middle as well as from
a real border, so every cell lifted except at its middle. Mended.

What it does: bark is now a few large connected sheets with angular
edges, one to four a tree, none tiny. The orb tree has bark on its trunk
for the first time (three swathes either side of the orb). "Many and
small" and "most of the tree" are plainly different from the first two.

Wrong, or not there:

- Compact and reaching look nearly alike. With one or two swathes of 30
  cells on a limb two or three cells round, there is no room for an arm
  to reach. `cohere` needs more cells, or larger trees, to show.
- Where a sheet covers a limb it makes a smooth sleeve. The sheet spans
  the grooves so well that the strands under it vanish, and with them the
  tree's character; "most of the tree" is a smooth blob.
- Edges are angular but at the size of one cell (0.08), which is fine
  teeth, not the large points of the sketch given earlier.
- Swathes favour limbs, because a limb is where a spreading swathe can
  wrap right round and find most neighbours.

## Bark as a creased sheet; three faults found under it

The smooth sleeve was the fault to mend. Chasing it turned up three others
that were not the bark's.

**Strands faced the wrong way on limbs.** The ragged patch that had sat on
the one-limb tree's limb for many rounds was still there with the chain,
the mass and every outer layer switched off, so it was in the structure.
A strand's outward side was taken as "away from the middle of all the wood
near it". On a limb the wood near it is mostly the same limb further
along, so a strand faced along its own length. Now each strand faces away
from the middle of its own bundle at that step, square to its own
direction. All limbs came out as clean bundles of blades.

**Pieces left holes where their fronts were cut.** A mesh of each tree,
split into separate bodies, showed two roots and a shell plate that
touched nothing (`holding an orb`: a root 0.25 long lying on the ground
beside the tree; `a loop`: the same). A slanted front, since it was made
to cut back into its piece and not out past it, runs back by twice its
skew times the width: up to 0.5 on a thick strand. The next piece started
only three steps (0.1) back. In the trunk the mass hid the hole. A root
has nothing beside it. Now the next piece starts as far back as the front
before it is cut away. No separate body larger than a chip remains on any
of the four. (The count is a check to look with, not a judge: the largest
bodies left are hollows shut inside the trunk, which it cannot tell from
loose pieces.)

**Crumbs under the orb.** Three causes, one after another.
- Tears all started at one height. Stopping them at the roots had made a
  ring at the feet; my mend for that pushed them into a band just under
  the orb instead. A tear now starts anywhere between the foot and where
  the strand is pressed.
- The fine threads across closing splits (16 to 25 a tree, 0.01 to 0.02
  thick) are thinner than the mesh can draw and came out as grit. They are
  off (`strings: 0`). The thread idea is not withdrawn, only not drawable
  at this size.
- A torn part's lip thinned to less than the mesh, and its two ends lay
  level with what it tore from, the two surfaces running through each
  other. The lip keeps a thickness of 0.018; the ends go in from
  underneath and bend back into the parent.
Less remains than before, not none: `sketch/page7-orb-under-close.png`
still has rough spots at two joins below the orb.

**The bark.** Two tries.

Withdrawn first (`sketch/page7-bark-skin-withdrawn.png`): the sheet
followed a smoothed surface over the strands. Thinner and tighter it was
still a melted skin, and it erased the flat faces of the wood under it.

Withdrawn second (`sketch/page7-bark-scales-withdrawn.png`): each cell one
flat plate resting on the highest wood under it. Flat faces, but every
plate separate with a crack round it. Scales again.

Kept: the plates, joined. Each cell that is on is a flat plate facing out
from the middle of the wood and resting on the highest wood under it (the
drawn wood, shell and slivers included, so nothing pokes through). Between
two plates the sheet passes from one to the other over a narrow band: a
crease where they meet at an angle, a ramp where one rests higher. A plate
on the border is hinged and lifts toward the open side, a little
everywhere; a share of them (`peel`, 0.18) lift far and are cut free along
their sides, as flakes. At the border the sheet is its own thickness
(0.02) and no more, so it is seen to lie on the wood.

Also:
- Every place bark could border on has a cell, and cells where bark may
  not lie are barred: the foot, strands buried in the middle, thin wood, a
  limb or tip under 0.4 of the tree's greatest breadth, and anything within
  reach of an orb's room. So every border is a boundary between two cells.
  Before, bark beside the orb was cut on a round, and a cell with nothing
  beyond it ended on a round; where there is still no cell beyond, a cell
  now ends eight-sided.
- Cells are larger (0.075, 1.6 times as long along the grain), 140 to 250
  a tree. `cover` 0.4 of the cells that are free.
- A swathe starts on broad wood and spreads over broad wood sooner than
  out along a limb.

What it does (`sketch/page7.png`, `sketch/page7-layers.png`,
`sketch/page7-other-side.png`; `sketch/page8.png`,
`sketch/page8-layers.png`): bark is one to three angular sheets a tree, on
the trunk and the thick of the limbs, creased in flat faces, with an edge
that has thickness and stands off the wood in places. The strands show
beside it and the limbs are left bare. On page 8 the four spreads now
differ plainly: compact is one solid patch, reaching has arms and holes in
it, many-and-small is three patches, most-of-the-tree wraps the trunk.

Surprised me: resting each plate on the wood, and not on a smoothed
surface, is what made the bark read as a separate thing. A plate over a
groove shows the groove at its edge.

Wrong, or not there:
- `a loop` is the busiest: where the trunk twists hard the plates differ
  most in tilt and the sheet looks like loose tiles.
- A sheet's inside can dip into the wood where the wood is hollow along
  its length (inside of a bend, a crotch): the plates are flat and the
  surface is not.
- The orb tree's worst overlap between two strands rose from 0.26 to 0.46
  of their joined girth at one place when the tears were spread. A longer
  clearing phase does not change it. Not looked into.
- Light caps at some limb tips with a hard line under them: the last piece
  of the chain is wide enough to wrap the limb, and its start shows as a
  step all the way round.
- Nothing peels free at one end and hangs. Knots, hollows and notches are
  still not begun.

## Run 013: branches, as a graph that is grown

Asked for: branches before knots and hollows, as a graph, so that some can
be snapped off afterwards. Until now a tree was a trunk with one or two
limbs, and both lines were given by hand.

Two changes.

**The kernel takes limbs on limbs.** `trees.js` knew only limbs off the
trunk. A limb can now carry `limbs` of its own, to any depth: each takes
its strands from the side of the bundle it leaves on, a bundle is let go
where a limb leaves it and held along its far part, as the trunk was.
Every strand still runs unbroken from its root to the end of one shoot.
The four trees of page 7 come out the same to the last digit (fingerprint
of every strand's points, girths and facing, before and after).

**The lines are grown** (`Trees.sprout`), by one rule. A shoot carries
some of the tree's strands. It runs on, wandering and turning upward, for
a length that goes with how many it carries. At intervals it forks: a
`share` of what it still carries leaves to one side, toward whichever side
is most open, and the rest is turned the other way by as much as it lost.
A heavy shoot runs further between forks than a light one. A shoot down to
one strand cannot fork. 18 strands a tree.

Predicted before drawing anything:
1. `share` decides the habit: small gives a leader with side shoots, a
   half gives even forks and no leader.
2. The trunk will lose its line where forks come close together, since it
   is let go round each one.
3. A shoot of one strand will not be told from a strand that simply ends.

`runs/013-branches/share.png` (share 0.15, 0.35, 0.5, two seeds each) and
`spread.png` (how wide a shoot leaves, 0.6 to 1.6; how strongly it turns
up): bare strands, coloured by the shoot each ends on, from the front, the
right and above.

1. Held. At 0.15 most strands stay on the trunk and end there (7 shoots);
   at 0.5 nearly every strand leaves (17 shoots, 4 or 5 deep) and nothing
   leads.
2. Did not happen. The trunk keeps its line with five forks on it.
3. Held, and it matters for what comes next: the crown is mostly single
   strands, and a bough that divides can be seen only in the first third
   of its length.

Broke first, twice:
- A bouquet. With forks 0.3 apart most trunk strands never left, and the
  shoots, turning up, lay against the trunk.
- Horns on a stump (`sketch/page9-first-horns.png`, with the wood on). The
  graph was right but nothing was long for its girth: foot 0.25 across,
  boughs 0.5 long. Now the foot is 0.2, the first fork is a quarter of the
  way up, and a shoot's length is 1.15 x (0.22 + the root of its share of
  the strands).

With page 7's wood (`sketch/page9.png`, `-layers`, `-other-side`; four of
the range): a short grooved trunk dividing into boughs that divide again
and taper to points. The boughs keep the trunk's strands in sight where
they leave it, so a fork is strands parting and not a limb set on.

Surprised me: the tree with shoots leaving widest (1.6) came out nearly
flat, wide from the front and narrow from the side, at every spread tried
on that seed. "Toward whichever side is most open" keeps choosing the two
sides it began with.

Wrong, or not there:
- Every shoot ends in a long smooth point. Nothing ends blunt or broken
  out in the crown, where it would show.
- 18 strands make 18 roots: a skirt round the foot.
- Bark has little room. Most of a branched tree is thinner than the 0.4 of
  its greatest breadth that bark is barred from, so it has one small sheet
  on the trunk.
- Worst overlap between two strands is 0.39 of their joined girth on one
  even-forked tree (29 pairs over 0.15), 0.34 on the widest. The crowded
  crown is where; not looked into.
- `up` does little: shoots are too short for turning to tell.

## Run 014: elbows

Said of page 9: the trees are disturbing, tense and stressed, because a
branch can only bend slightly toward where it is going. Real trees relax
by making stronger corners (`sketch/page9-tense-withdrawn.png`).

Why the old branches were tense, in this model's own terms: every strand
was pulled taut and stiff about a straight line, anchored at its root, and
a limb was held to its line only along its far part. So the near part of
every limb was a string drawn tight between two fixings, and any turn was
spread evenly along the whole length. That is how a cable or a tendon
hangs. And the lines themselves were grown by drifting a little at every
step.

Why wood corners, as far as I understand it, and what was taken from it:
- Wood sets. Only the tip grows longer; what is behind it has hardened in
  the shape it had. A change of direction is recorded where the tip was
  when it happened, and is never shared out along the branch afterwards.
- Growth is in bouts. A shoot runs straight for a season, and then often
  it is not the same tip that goes on: the tip is lost, or flowers, or is
  shaded, and a side bud takes over at an angle.
So a branch is straight runs joined by corners.

Two changes, both abstract:
- `sprout` grows a shoot in bouts: straight for a stretch, then a corner
  (`kink`: how sharp, 0.7 as set), choosing at each corner the way that is
  more open and more upward. A heavy shoot runs further between corners
  and turns less at each.
- `grow` has `set` (0.8 for grown trees, 0 for page 7's, which come out
  unchanged): a strand is taut and stiff about its line, corners and all,
  and not about a straight one. What is pulled smooth is how far it lies
  from its line. A limb is held to its line from near where it leaves.

Predicted: runs joined by corners where there were whips; inner strands
folding or overlapping at the trunk's corners; and limbs looking set on
again where they leave, since their strands now follow the line from the
fork.

`runs/014-elbows/kink.png`, bare strands, one seed: as before; corners in
the lines but strands still taut; corners 0.4, 0.7, 1.1 with the wood
set; and a second seed.
- Corners with taut strands is nearly as tense as before: tension rounds
  every corner off. It is `set` that keeps them. Both changes are needed.
- No folding at the trunk; worst overlap 0.11 to 0.18, no higher than
  without corners. A heavy shoot turning less at each corner is probably
  why.
- Forks still read as strands parting.
So the first prediction held and the other two did not.

With the wood (`sketch/page9.png`, `-layers`, `-other-side`): crooked
boughs with elbows. The fourth tree is now corners at 1.1 in place of
shoots leaving wide.

Not there:
- A corner has no cause yet. In a tree most corners are where a leader
  was lost and a side shoot took over, and the stub of the lost leader is
  the knot. So corners and knots are one event, and the place to put a
  snapped shoot is at a corner. Not built.
- Roots are set in the shape they were first laid in, and have knuckles
  where they dive.
- Shoot ends are still long smooth points.

Run 014, afterwards. Elbows accepted ("that solves it"). The tense wood
is not thrown away: it is wanted for an evil biome, where the player
should be disturbed. Noted in `LANGUAGE.md` with the dials that make it
(`kink: 0, set: 0`). So `sketch/page9-tense-withdrawn.png` is withdrawn as
the ordinary wood only.

## Run 015: snapped shoots (fresh break, knot, hollow)

Asked for: knots and hollows at last, as branches that snapped off.

A snapped shoot is a limb given as a `stub`. Its strands still run from
their roots up to where it left; what differs is how they end, and what
the wood that stayed does about it. Three ages of one event:
- fresh: the stub stands, longer than it is wide, its strands broken off a
  little apart.
- knot: the stub is nearly flush and ends in one face; the wood round it
  has thickened (the collar).
- hollow: the stub has rotted out. Its strands end below, fined to points.

Predicted: a hollow from a bough of four to six strands would read at the
scale of the trunk and one from two strands would close to a slit; the
collar would look like a goitre, not a ring; a knot's several blunt ends
would look like cut cables.

What happened, in order.

1. On grown trees (`sprout({ snap: 3 })`, shoots of two to four strands of
   eighteen): nothing to see
   (`sketch/page10-first-on-grown-trees-invisible.png`,
   `runs/015-snapped/ages.png` for the strands). Wounds 0.09 to 0.13
   across on a trunk 0.4 across, behind other limbs. The worry that these
   could not compete with the detail was right, and no amount of quiet
   round them helps at that size. (Snapping the heaviest shoots instead
   took the whole crown off; so only shoots carrying up to a quarter of
   the strands are snapped.)
2. So, a test piece: page 7's one-limb trunk with its limb, three strands
   of eight, snapped. Still nothing. Two plain faults: the stub's length
   was measured from the middle of the trunk and never came out of it; and
   with the limb's strands gone the rest closed over the place.
3. Every wound given a tunnel along the line the shoot had, which no other
   strand may lie in. The fresh break and the knot then stood out of the
   wood. The hollow came out as a window clean through the trunk
   (`sketch/page10-window-withdrawn.png`): a tunnel as wide as the limb was
   leaves the trunk no back.
4. Narrower, with a back: the dead strands' blunt ends stacked in the
   mouth like the slats of a vent (`sketch/page10-louvres-withdrawn.png`).
   Fined to points and ended lower, they went, and so did the hole: with
   three of eight strands ended there is no wood left on that side to make
   a mouth. The trunk is just thinner above.
5. What was said when intrusions began: "intrusions are basically the
   hollows." Taken literally. A hollow is an orb's room with no orb in it:
   room inside the trunk, toward the side the shoot left on, which the
   strands that stayed part round. That reads at once
   (`sketch/page10.png`, `-close`, `-oblique`): an almond opening with the
   strands flowing round it, visible in the small picture. It has to open
   gradually; opened all at once it throws strands across its own mouth.
   With `hollow: { at: 0.4 }` the strands also split over it as over an
   orb: a cage over a void, an older and more ravaged hollow.

Against the predictions: the hollow does read at trunk scale, but not for
the reason given; it reads because it is simple and empty where everything
else is busy. The collar is not seen at all, as ring or as goitre. The
knot does look like cut blocks, not a knot.

Wrong, or not there:
- The knot is a chopped stump. Nothing has grown over it and there is no
  ring round it. The thickening of the wood near a wound (`swell`) cannot
  be seen in any of the three.
- The fresh break is small: two of its three strands end inside the
  trunk's outline.
- One hollow a tree (the first, and only if the tree holds no orb). A
  second is only its tunnel.
- None of this is back on grown trees. A wound needs a shoot worth a third
  of the trunk to read, and a grown tree's side shoots are a sixth.
- Bark is switched off on these pieces. On this trunk, with the wood set,
  it comes out as loose tiles; not looked into.
- A corner still has no cause. Putting the snapped shoot at a corner, as
  the lost leader, is not built.

## Scar is its own stuff; the knot of strand ends is withdrawn

Said of the knot on page 10 (`sketch/page10-knot-of-straps-withdrawn.png`,
third column): "It's overworking it with inadequate tools. You're using
straps of ribon to build the scar tissue around the hole."

Retracted, from run 015: the knot as "the stub nearly flush and ending in
one face, the wood round it thickened". It was wood's pieces set to do
something wood's pieces do not do.

What a knot is now. In the strands it is exactly a hollow: the shoot
rotted out, its strands end below, the wood that stayed parts round the
room it left. What closes the room is a different material, laid by the
surface and not by the kernel: scar. Soft and swollen where the wood is
flat-faced; a few lips of unequal size rolling in from the rim of the
opening and pressing together in creases; lying in the room the strands
left and nowhere else, so the strands hold it as they hold an orb. One
dial, `heal`: 0 none (the open hollow), 0.45 lips round a hole, 0.9
closed. That is the pairing already written down for this work, something
thick that binds and something softer that swells, and it needed no new
idea, only the second stuff.

`sketch/page10.png`, `-close`, `-oblique`, six pieces: whole, fresh break,
hollow, hollow with lips, knot, hollow torn over. `-scar-first.png` is the
first try, by layer (scar is the fifth colour).

What it does: both the lipped hollow and the knot read in the small
picture, and read as a second material, not as more wood.

Wrong, or not there:
- It is still a fairly even ring, and a closed one is a bun. Narrowing it
  across the grain and making the lips less equal helped a little. It does
  not yet take its outline from the opening the strands actually leave,
  which is an almond.
- It stands a little proud of the wood. Nothing of the wood laps over it.
- The fresh break is as it was: small.
- Still one such place a tree, and still only on the test trunk.

## Run 016: making up for a snapped shoot

Said: every snapped branch is a branch missing from the tree, but a tree
makes up for what it loses by growing more. Failed shoots must not make
the tree smaller. No hormones or balances: for each snapped shoot add one
extra shoot, see that it does not snap either, one pass.

Built so, in `Trees.sprout` (`regrow`, on unless turned off). After all
the snapping is done, each snapped shoot gets one new shoot. It leaves the
same parent two steps further on (two steps before, at the parent's end),
toward whichever side is most open once the lost shoot is out of the way,
and grows by the same rule as any other, forks and corners included. It
carries as many strands as were lost, and they are new strands: the lost
ones are still in the wood below the break. So the tree has more strands
than it began with, and its foot is broader by the root of that, so that
no strand is thinner for it. Nothing grown in this pass is ever
considered for snapping, because snapping is over by then.

Predicted: the crown comes back to about what it was; the trunk is
heavier; and the new shoots, growing into a crown that is already there,
crowd it.

`runs/016-making-up/regrow.png` (bare strands, two seeds: nothing snapped,
three snapped and left, three snapped and made up) and
`sketch/page9-made-up.png` (with the wood: the same tree untouched, and
with three snapped and made up).
- Left as they were, three snapped shoots take a third of the crown: 16
  shoots still counted, but 18 strands of which 9 end at breaks.
- Made up: 18 strands become 27, 16 shoots become 25 on one seed and 12
  become 21 on the other. The crown is as full as the untouched tree's or
  fuller, and the trunk is visibly heavier.
- Crowding held too: the worst overlap between two strands goes from 0.19
  to 0.36 of their joined girth, and pairs over 0.15 from 3 to 30.

Wrong, or not there:
- That overlap. Half again as many strands in the same crown, and nothing
  yet gives the crown more room for them.
- 27 strands are 27 roots: the skirt at the foot is bigger still.
- The new shoot leaves at a fixed two steps from the break. It could as
  well leave from the wound's own collar; not tried.
- The wounds themselves still cannot be seen on a grown tree.

## Run 017: dividing (a root is not owed to every shoot)

Said: every branch, even the snapped ones, needs a root, and that is not
how trees work. But let go of "every root is a branch" and each root has
to end somewhere and each branch start somewhere; end the roots where the
branches start and there is a point they all converge on, a narrow waist,
which trees do not have either.

Answer tried: nothing ends and nothing starts. A strand divides. A tree
has few heavy strands at the foot (`feet`, 8 for grown trees; 0, the old
way, for page 7's, which come out unchanged). The strands are gathered at
the foot into that many families of neighbours. Below some height a
member is not a strand of its own but part of its family's first, which is
heavier by the member's section; above it, it comes out and goes its own
way. The height is different for every member, anywhere from just above
the foot to where the two part ways. It is the kernel's own older idea
turned the other way up: round an orb a heavy strand divides into fine
ones; here a fine one is what a heavy one divided into.

Why there should be no waist: sections add, so there is as much wood at
any level as there was with a root to every strand; and the divisions are
at all heights, so there is no one level where the count changes.

Predicted: fewer, heavier roots; the low trunk a few heavy strands, the
high trunk many fine ones; the same wood at every level; and seams or
bulges where a strand comes out of another.

`runs/017-dividing/feet.png` (bare strands: 18 roots, 8, 5; a made-up tree
with 27 and with 8; a second seed). With the wood: `sketch/page9.png`,
`-other-side`, `-foot` (all five trees now have 8 roots);
`sketch/page9-a-root-to-every-shoot-withdrawn.png` is how they were.

- Roots: 18 become 8, and the made-up tree's 28 become 8. The skirt is
  gone; the foot is a few heavy legs.
- Wood at four heights (root of the sum of girths squared, one seed), a
  root to every strand against 8 roots: 0.172, 0.157, 0.145, 0.127 against
  0.173, 0.174, 0.148, 0.128. No level has less. (The second is a little
  more, because the first carries a member's share to just past where it
  comes out.)
- No waist to be seen in any of the five.
- The crown is the same crown.
- Seams and bulges: not seen as such. Where a strand comes out it is drawn
  from under its parent, as a torn part is.

Broke first: on the evenly forked tree most members could not divide at
all, because their strands part ways within eight steps of the foot and a
division was not allowed in the first five. It kept a thin root for each.
Divisions are now allowed from two steps up.

Surprised me: the crowding from making up snapped shoots mostly went with
it. Pairs of strands overlapping by more than 0.15 fell from 25 or 30 to 1
or 2 on the same trees, since two strands that are one strand below their
division are not counted against each other there. That is the measure
being generous as much as the tree being better; the picture is the
judge, and in the picture the low trunk is calmer.

Wrong, or not there:
- Families are neighbours at the foot, taken by angle round the bundle.
  Nothing says that the strands of one bough share a root.
- A member joins its family's first directly. Nothing divides twice (a
  root into two, each into two again).
- Snapped shoots' dead strands divide off like any others. Whether dead
  wood should keep a root of its own, or none, is not looked at.
- With broader wood on the trunk the bark has more room, and it is the
  loose tiles again on the two heaviest trees.

## Bark sunk and thickened; run 018: strands that overlap

Two things said of the last pages. The bark is loose: it should sink
deeper, and be thicker for it so that no cable shows through. And the
rope of branches and roots could be tightened by letting the strands lie
somewhat in each other.

**Bark.** Loose because of three things I had built in: each plate was
held level on the highest wood under it, so it stood clear of everything
lower; at its border the sheet was its own thickness and no more, so the
gap under it showed; and every border plate lifted a little. Now:
- a plate is laid to the slope of the wood under it (the slope that best
  fits the nine places it is felt at), not level on the highest;
- it is as thick as it takes to cover whatever stands proud of that slope,
  plus a skin (0.008), so nothing shows through; never more than 0.05;
- it is solid down into the wood right to its border, which is then a
  step and not a sheet held clear;
- only a few border plates still lift (`peel` 0.08, was 0.18), and the
  rest not at all;
- the band over which one plate passes into the next is twice as wide.
`sketch/page7-bark-sunk.png` (two trees of page 7, two spreads of page 8):
the sheets lie in the wood with an angular stepped edge. No loose tiles.
What it cost: the sheet is smoother than it was, and "most of the tree" on
page 8 is nearer the smooth sleeve withdrawn earlier than I would like.
The outline still says sheet; the face says less.

**Run 018, overlap** (`lap`; 0.3 for grown trees, 0 for page 7's, which
are unchanged in their strands). Two strands give way to each other only
once they are closer than their girths less that share.

Predicted: trunk and boughs draw in, the crown's lines stay where they
are, and past about a third the strands stop reading as separate.

`runs/018-lap/lap.png` (bare strands at 0, 0.15, 0.3, 0.45, and a second
seed at 0 and 0.3); `sketch/page9-tight.png`, `-layers`, `-foot` with the
wood.
- The trunk draws in at every step; the crown does not move. Held.
- Measured against whole girths, the worst overlap between two strands is
  the share allowed plus about 0.08: 0.23, 0.38, 0.53. At 0.3 that is
  about a quarter of a strand's section shared with its neighbour, which
  is the limit this work was given; 0.45 is over it.
- With the wood, the trees are slimmer and read more as trees than as
  bundles.

Broke: on the heaviest tree (three snapped and made up, 28 strands on 8
roots) the trunk has gone smooth and mottled. The pieces are drawn wide
enough to run into their neighbours, and now the neighbours are already
in each other, so the grooves between strands close up and near-coincident
faces show as marbling. The strands are there; the relief that showed
them is not. Not mended: the drawn width needs to know about the overlap.

## Run 019: ground that is not level

Said: the heaviest tree's smooth trunk is something to avoid building, not
to mend. Next, trees on highly uneven ground: boulders, ravines, cliffs,
hills. The roots have to sell that the tree always belonged there and was
not dropped. "The asset clearly being built separate from the place that
asset will have to live in" is the thing to get away from.

What the ground is. Any function of a place that says how far outside the
ground it is. It is given: it is the place, not an organism. The test
ground here is tilted planes and a few faceted stones (`sketch/page11.js`),
throwaway.

What the tree does about it, each one rule:
- It stands at a `site` on the ground, and starts a little out of the
  slope.
- Its shoots keep off rock: "most open side" now counts rock as well as
  other shoots, and no shoot grows within reach of the ground.
- Every strand, trunk and limb as well as root, is pushed out of the
  ground while the tree settles.
- A root is not laid, it is walked. From the foot it goes the way its
  strand faces, a step at a time over the surface, taking at each step, of
  three ways, the one more downhill, more in a crease, and further from
  the roots already there. It is kept its own girth's height off the
  surface, so it goes over an edge and down a face and never through a
  corner or clear of the ground. Going down a face counts little toward
  its length, so a root that goes over an edge runs on until it comes to a
  ledge. Most then go into the ground where they are.
- A root faces away from the ground it lies on, whatever way that is.

Four sites: on a slope, at a cliff edge, on a boulder, in a cleft between
two stones.

Predicted: roots hug the stone and run down the cliff; on the edge the
roots inland stay short and those over the lip run long; roots wrapping a
boulder cross each other at its foot; a root crossing a sharp lip cuts
the corner; and the tree still looks placed if its foot does not answer.

First (`sketch/page11-straight-roots-withdrawn.png`): the first two held
at once. One root went over the lip and down the face to the ledge; roots
poured down the boulder to the ground. No corner was cut. (The cleft's two
stones had no gap between them and buried the tree; moved apart.)

Said then: "Roots are far more crawly snaking and winding because they
lend their strength varied directions in which a single root run."
So a root snakes: its heading swings from side to side as it goes, by a
different amount and over a different length for every root and every
swing. First try (`sketch/page11-snaking-too-tight.png`): swings 0.16 to
0.38 long on roots 0.1 thick. They ran into themselves and each other and
came out as lumps and crumbs. A swing is now seven to fourteen girths
long, roots keep further apart, and they are longer.

Now (`sketch/page11.png`, `-other-side`, `-from-above`): on the slope the
roots wind out over it; at the edge two go over the lip and one curls
onto the ledge at the bottom; on the boulder they come down its faces and
one runs on over the ground; in the cleft they come out of both ends
along the ground. Grown trees on level ground have walked roots too
(`sketch/page9.png`, `-foot`): the foot is winding roots where it was
short legs.

Wrong, or not there:
- The trunk does not answer the ground. It starts a little out of the
  slope and that is all: no sweep at the base, no lean away from a wall it
  stands against. In the cleft it simply stands between the stones.
- Roots do not fork. A root is one line from foot to end.
- Nothing crosses a gap. A root that meets a ravine goes down its wall.
- Every root is as likely to go uphill as down at the start: they leave
  the way their strands face. A tree on an edge does not put more root to
  the side that has to hold it.
- The ground does not answer the tree. Nothing is lifted, cracked or
  heaped against a root.
- Where the tree stands is chosen by hand.
- Roots still cross where two come down the same face; and one tree on
  level ground has a patch of crumbs where two roots run together.

## Roots: slender, winding, and able to let go

Said of page 11 (`sketch/page11-thick-roots-withdrawn.png`): some of the
roots are way too thick. "And they genuinely have to snake, unlike
branches roots can wind back on themselves, or take a detour through the
air as long as they reach back to something to grip."

Three changes to how a root is walked.

- Slender. A root is heavy only where it leaves the foot. Its girth falls
  off sooner along its length, and the share it carries for the strands
  that divided off it (run 017) dwindles along it too, where before the
  whole root was as heavy as the family. The buttress is at the foot.
- Winding. In place of a swing from side to side about one line, the
  heading has a curl that drifts at random and carries on. So a root
  winds, and can come right round on itself. It never turns tighter than
  about three of its own girths, and it keeps clear of its own earlier run
  as well as of other roots.
- Letting go. Where the ground falls away in front of it, and now and then
  anywhere (`air`, 0.05 a step), a root tries leaving the surface: out and
  a little up, sagging as it goes. If that comes down on ground again
  within reach (0.6) it goes that way, through the air, and takes hold
  where it lands. If it would not come down it stays on the surface. At
  most twice a root, and only in the middle of its run.

Predicted: thin crawling roots with loops; an arch off the boulder and off
the cliff's lip; and roots through the air looking like wires if they are
left straight.

`sketch/page11.png`, `-other-side`, `-from-above`; level ground,
`sketch/page9.png` and `-foot`.
- The roots are a third of the thickness they were past the foot.
- On the boulder one root leaves the stone and comes down to the ground
  through the air, and another goes round the stone's shoulder. In the
  cleft one coils right round. At the cliff one goes round the loose stone
  on the ledge.
- The arches sag, so they do not read as wires.
- On level ground the roots are long and slender but wind least: there is
  no slope, crease or stone to turn them, only the drifting curl.

Wrong, or not there:
- They are smooth and even, and with the taper they read as much like
  tentacles as like roots. Nothing of the wood's flat-faced pieces shows
  at this girth.
- Still one line each: no forking.
- Letting go is tried a little way ahead only. Nothing looks for the far
  side of a wide gap.
- The trunk still does not answer the ground.

## Run 020: roots in switchbacks

Given: a drawing of one root. Fat where it starts and fining down slowly;
short runs, two to four of its own widths long, set across the way it is
going; turns that double it back on itself, some rounded and some sharp;
neighbouring runs close enough to touch. The roots of the last entry
(`sketch/page11-tentacles-withdrawn.png`) had none of that: long even
curves.

Built so: a root has a way it is going on the whole, and it goes that way
by runs set across it, 55 to 85 degrees to one side and then the other, a
turn as tight as its girth allows between them. Now and then a run goes
straight on, or two turn the same way and it loops. A run is not begun
where it would lie on another root or an earlier run of its own. The way
it is going bends downhill. Letting go through the air is kept.

What went wrong, and it took four renders to see it:
- The first three (`sketch/page11-wiry-kinks-withdrawn.png` is the third)
  came out as long straight legs ending in thin kinked tails, with crumbs.
  I changed run lengths, turn angles and girth and it stayed the same. The
  cause was not in the walking at all. While the tree settles a root was
  still a fifth taut about a straight line, and only its far end is held:
  so every winding between the foot and the far end was drawn out flat,
  1500 times over. A walked root now keeps its shape wholly.
- With longer roots the settling ran away on one site (a root's points
  thrown out to 10^18). Taut, stiff and held together were more than one
  pass can undo; stiffness is capped for trees with walked roots.
- The wood's pieces were longer than a run and lay across the turns. A
  root is now drawn a run at a time: a piece ends at the turn.
What should have been done first was done last: draw the root paths alone,
from above, at their girth (`runs/020-roots/roots.png`), and compare that
with the drawing, before any wood.

Now. From above the paths are of the drawing's kind: fat at the foot,
doubling back, tails in small zigzags. With the wood on the four sites
(`sketch/page11.png`, `-other-side`, `-from-above`) the roots are jointed
and gnarled and go over the stone in turns.

Against the drawing, still:
- Runs are longer for their width than drawn, especially the first out of
  the foot, and less tightly packed. Nowhere do two runs lie against each
  other.
- Turns are sharper than drawn: there is no rounded arch among them.
- The roots are thick again near the foot, which was the complaint before
  this one.
- Crumbs where runs of two roots meet (the cleft, the slope).
- Roots still cross each other: room is looked for at the start of a run,
  not along it.

## Roots that divide (run 020, continued)

Said of the switchback roots: something is clearly very wrong; use your
own judgement and taste, and do not be put in a straitjacket by what I
point at.

Retracted: the switchbacks of the entry above
(`sketch/page11-switchbacks-withdrawn.png`). A rule for doubling back,
set off by nothing, gave a pile of jointed sticks. It was the drawing
taken as a template, which is the one thing this work is not to do.

What I judged wrong, looking at the trees and not at any one indication:
- The roots had no cause. They kinked where a rule said kink.
- They had no order of size. Every root was one tube of about the same
  girth from foot to tip, so the foot was spokes.
- The tree stood on them. They left a ring under the trunk in the air and
  came down over most of their length, like the legs of a table.

Built so:
- A root comes down to the ground at once, within a fifth of its length,
  and then lies in it, a little sunk, more in places and less in others.
- It flows. Its heading has a curl that drifts and carries on, so it
  winds and can come round on itself; and it goes out from the foot, and
  downhill, and into creases, and where there is room. It still may let
  go through the air where the ground falls away and it can land.
- It keeps its girth along its length. It gets finer by dividing: some
  way out a share of it leaves to one side as a root of its own, walked
  the same way from there, and what goes on is that much the less. A root
  that has parted off may part once more. So a foot of 5 to 8 heavy roots
  ends in 14 to 26 fine ones, each traceable back to a heavy one. It is
  run 017's dividing, upside down.

`runs/020-roots/roots.png` (the paths alone, from above; the last with no
dividing). With the wood: `sketch/page11.png`, `-other-side`,
`-from-above`; level ground `sketch/page9.png`, `-foot`.
- At the cliff the heavy roots go over the lip and down the face and fan
  out over the ledge in fine ones.
- On the boulder they stand over the stone and web the ground at its foot.
- On level ground the foot is a flare of heavy roots parting into fine
  ones. It is the first foot here that looks grown where it is.

Wrong, or not there:
- A root sometimes coils into a ring (one beside the stone on the slope).
- At the boulder's foot the fine roots tangle: several come down the same
  face and part in the same place.
- The trunk's own foot is still a little off the ground, and the trunk
  still does not lean or sweep for the ground it is on.
- Fine roots are smooth; the wood's flat-faced pieces do not show at that
  girth.

## Run 021: the wood has to add up

Said: the combined cross-section of the roots cannot exceed the
cross-section of the thickest part of the trunk.

The kernel already obeyed that and had since run 017: a root's girth is
its family's combined section, so the roots at the foot summed to 0.90 of
the trunk's. It was the drawing that did not. Measured against what is
counted (`runs/021-girth/draw.js`, and cuts through the mesh itself):

      up the clean trunk   drawn / counted  0.9 to 1.2   honest
      at the foot                           2.5 to 3.9   not

So the fault was at the foot, and in the picture, not in the arithmetic.
Three things were wrong, found by switching parts off one at a time and
by printing a plain map of a horizontal cut. (Switching off bark, shell,
slivers, elbows, mass and the chaining changed almost nothing: it was the
bands themselves, which is what sent me to the map.)

- **The roots held the trunk up on legs.** A root came down to the ground
  "within a fifth of its length", but its length counted progress, not
  distance, and progress is discounted on a descent. So a long root slid
  down a shallow ramp: it left the trunk's base and ran out nearly level
  for 0.1 to 0.25 before dropping. Eight of those at full girth, splayed,
  is the whole flare. A cut at that height sliced them lengthwise, which
  is why the map showed lobes of wood with no strand anywhere near them.
  Now the descent is paced by real distance (`dive`, 0.12).
- **The trunk did not reach the ground.** It began a fifth of its own
  width up, with only roots bridging the gap, so a cut through the foot
  showed air under the middle. Now it begins 0.6 of its foot radius up:
  the collar is short and the wood is continuous into the ground.
- **Every root carried the whole of what its family carries.** Conserved,
  but all of it above ground and spread wide, where the trunk's share of
  it is packed into one compact body. Area is conserved; extent is not,
  and extent is what the eye reads as girth. So: not all of what the
  trunk carries comes out where it can be seen. `grip` (0.62 of girth,
  0.38 of section) leaves as surface root; the rest goes straight down at
  the foot and is never drawn. A root narrows to that over the first
  short stretch, which is the collar.

Also changed, though it turned out to be small: a strand reaching toward
the middle of its bundle used to reach as far as the middle was, so at
the foot, where the bundle is widest, it reached furthest. It now reaches
only as far as there is a neighbour to meet. Where strands have parted,
as at the foot, there is nothing to meet and each keeps its own girth.

`runs/021-girth/girth.png`: the trunk's section and the roots' section
drawn to the same scale, and how much root crosses a ring at each
distance out. The four approved trees of page 7 come out unchanged to the
last digit.

      roots crossing a ring, at most    0.27 to 0.38 of the trunk
      with grip turned off (1.0)        0.55

Pictures: `sketch/page9.png`, `-foot`, `-cut` (level ground, and a cut
through the foot, which is now solid wood from trunk into root);
`sketch/page11.png`, `-other-side`, `-from-above` (the four sites).
Withdrawn: `sketch/page9-foot-on-legs-withdrawn.png`,
`sketch/page11-heavy-roots-withdrawn.png`.

Surprised me: switching off every layer of the surface changed the foot
by two per cent. I had assumed the extra wood was something laid on, and
spent three measurements looking for it there. The map of the cut found
it in one look. A picture of the thing beat four numbers about it, which
is what the brief says and what I did not do first.

Wrong, or not there:
- A few roots still arc through the air in smooth even loops. They read
  as wire, not wood.
- Fine roots are smooth: the flat-faced pieces do not show at that girth.
- Roots run to the edge of the ground they are given and stop there.
- `grip` is a number I chose by eye at 0.62. Nothing derives it.

Run 021, continued. Said of the result: better, but the roots are about
twice too long and still about 70% too thick where they start.

Both taken as given. The length is halved (`roots` 1.1 to 0.55). The
girth took three tries to get right, and the last two were instructive.

- Thinned the whole root by 1.7, collar and all. The roots came out as
  claws and the trunk ended in a cliff: it was thick, and then eight thin
  hooks, with nothing between. Also the divisions stopped, because a root
  that thin never reaches the girth a part needs to be worth having.
- So: thin the *run*, not the start. A root now leaves at the trunk's own
  girth and narrows to `grip` (0.36) of it within `flare` (0.06, under a
  trunk's width). The wood is continuous out of the trunk, as a buttress,
  and thin along the ground. Divisions take it down further: a root is a
  third of its leaving girth half way along, and most of that is the
  parting, not a taper.

So what was 70% too thick was the root as it runs, and the start wanting
to stay thick was the only thing holding the trunk and the ground
together. Thinning both at once broke the join and I could not see why
until I put them back one at a time.

      girth where a root leaves the trunk   0.059  (the strand's own, 0.063)
      girth half way along                  0.014
      length                                0.52   (was 1.0)
      roots crossing a ring, at most        0.07 to 0.30 of the trunk

`sketch/page9.png`, `-foot`, `-from-above`, `-cut`; `sketch/page11.png`,
`-other-side`, `-from-above`. Page 7's four trees unchanged to the last
digit — nearly not: on ground almost every root now goes into it at its
end rather than running out to a point, and the first way I wrote that
changed the one random draw that every flat root also makes, which moved
two of the four. The draw is now the same and only the threshold differs.

Wrong, or not there:
- A few roots still arc through the air in smooth even loops.
- The cleft tree has little to grip and comes out sparse.
- `grip`, `collar` and `flare` are three numbers set by eye against one
  judgement. Nothing derives them, and they are not independent.

## The thick roots were not roots: a torn join

Said: still way too thick, way; clearly a problem balancing the start and
the taper; colour the roots to see where I believe they start.

Colouring them answered it in one look. Roots are now tagged with a layer
of their own (6, and 7 for a root that parted off a root) and the
sketchbooks colour them. In `sketch/page9-roots-coloured-fault.png` the
root is the red: thin, short, and beginning well out from the trunk.
Everything thick between — the heavy slabs splaying from the foot that I
have been told about four times and have been thinning the wrong thing to
mend — is **trunk**.

What it was. A strand's root is walked, and its trunk part stands off the
bundle's centre line. Those are two frames: the root's goal is the places
it was walked to, the trunk's is the line. The settling holds a strand's
shape against tension by its distance from its goal, and read across the
join that step is a stretch. So the tension pulled the two halves apart
every pass. The join opened to 0.135, four times a step, and the piece
bridging it was drawn as a slab as thick as the trunk, lying out where
the root should have been. Measured:

      step across the root/trunk join   0.135   (a step is 0.035)
      after                             0.042

Mended by writing the held shape in one frame all along a strand: a
walked root's own line, moved to meet the trunk's without a step. The
root then runs evenly from the collar out to its tip, and the trunk is a
column that flares into roots instead of standing on splayed boards.

Three rounds of thinning roots were aimed at this and missed it:
`grip`, `collar`, `flare`, the halved length. They were not wrong — the
roots were also too thick and too long — but none of them could have
fixed it, because the thing complained about was not a root. I should
have coloured the layers at the first "too thick", not the fourth. The
tool was already there: the layer tint has been in the viewer since the
bark work.

Where it stands now (`sketch/page9.png`, `-foot`, `-roots`;
`sketch/page11.png`, `-other-side`, `-roots`; `runs/021-girth/girth.png`):

      roots crossing a ring, at most    0.11 to 0.13 of the trunk
      with grip and collar off          0.69

Page 7's four trees unchanged to the last digit (they have no ground, so
no walked root and no second frame).

Wrong, or not there:
- At 0.11 of the trunk the roots may now be too slight rather than too
  heavy: three rounds of thinning were aimed at a fault that was not
  theirs. `grip` raises them without touching anything else.
- The trunk's strands pull in tight at the foot now that nothing holds
  them out. The flare is the roots leaving, not the trunk spreading.
- A few roots still arc through the air in smooth even loops.

## Where a root starts: the colouring was lying

Said, over the coloured picture, with the heavy blocks at the foot ringed
in red: we clearly disagree on where the roots start; those are what I
consider roots; and if we don't control those we can't taper them.

We did not disagree. Those blocks are the kernel's roots — the first
three or four steps of the walk, at the strand's full girth, before the
collar has narrowed. The colouring said trunk because a drawn piece runs
over several steps and I tagged it by its far end, so the one piece that
spans the root/trunk line was tagged trunk — and that piece is the whole
flare. I had been handed the right evidence and labelled it wrong, then
reported to the person who was right that they were looking at trunk.

Two changes:
- A drawn piece never runs from root into trunk. They are different stuff
  and tapered differently, so a piece now ends at the line. The colouring
  is then true, and `sketch/page9-roots.png` shows the root beginning
  where it was ringed.
- The collar taper runs over `flare` 0.18 instead of 0.06. At 0.06 it was
  under two steps: the root was at the trunk's girth, then abruptly thin
  — a block with a wire out of it, which is what was being ringed. Over
  0.18 the girth falls 0.060, 0.055, 0.043, 0.032, 0.023, 0.016, 0.011
  along the first seven steps: a cone out of the trunk.

      roots crossing a ring, at most   0.26 to 0.29 of the trunk

Page 7's four trees unchanged to the last digit.

Wrong, or not there:
- The flare is still the only thing that widens the trunk's foot. The
  trunk's own strands pull in tight; nothing spreads them.
- Where a root ends is still its own length running out, not anything
  about the ground it is in.
- A few roots arc through the air in smooth even loops.

## How a root tapers, and an arc that corners

Said: the arcs through the air are wanted but must be angular; and the
taper is horrible — you know what a tree looks like.

**The taper.** What I had was a cone: the girth fell smoothly from the
trunk's to a thin running girth and then a long thin tube ran out. That
is a carrot. A root does not taper away along its length. It keeps its
weight between forks and steps down at each one, and nearly all of its
thinning happens at those steps. What it does at the trunk is not taper
but flare.

So, three things in place of one:
- flare: it leaves at the trunk's own girth and is down to its running
  girth within `flare` (0.07, under half a trunk's width).
- run: it holds that girth, losing only `waste` (a quarter) over its
  whole length.
- fork: `grip` raised from 0.36 to 0.62, so there is weight to divide,
  and roots now part to three levels instead of two. 8 roots at the foot
  become 22 to 24.

      girth from the trunk outward, one root
      0.060 0.057 0.040 0.031 | 0.029 0.027 0.023 0.019 0.017 | 0.017 0.016 0.016 0.016 0.015
      flare                     steps at forks                  run

      roots crossing a ring, at most   0.23 to 0.29 of the trunk

**The arc.** The span was the sagging curve that found the landing — a
parabola, because that is what I used to probe for ground. Wood does not
sag. The probe still finds where it lands, but the span is then laid as
two or three straight runs with a hard bend between them, kinked out past
the curve so the corners stand proud: up and out, across, and down onto
what it lands on. The drawn pieces already end at a root's turns, so each
leg is its own piece.

Broke on the way: leaps began firing on level ground. The test for "the
ground falls away" compared the root's height to the height it wanted,
which is true of every root while it is still coming down — so roots
arched into the air at the foot and the trees stood on spider legs. The
test now compares the ground ahead with the ground underfoot, and no leap
may begin until the root is down. On level ground nothing now rises more
than 0.035 above the trunk's base.

`sketch/page9.png`, `-foot`, `-from-above`; `sketch/page11.png`,
`-other-side`, `-foot`. Withdrawn:
`sketch/page9-foot-carrot-taper-withdrawn.png`. Page 7 unchanged.

Wrong, or not there:
- The roots radiate evenly: eight families spaced by angle round the
  foot, so from above it is a starburst. Nothing clusters them.
- Between forks a root is a smooth tube. The flat-faced pieces are there
  but at that girth they hardly show.
- A root ends where its length runs out, not for any reason in the ground.

## The foot stands high; roots come away in bunches

Given: a bonsai rooted over a rock, and a tree on a bank the rain has cut
away. Said: the clustering is wanted; and the floor of the tree has its
weight too low. In a bonsai, and in a tree on eroded soil, the start of
the tree is higher up, which makes it feel lighter and more alive — the
soil it sprouted in has sagged away and the roots have followed it down.

Taken as the rule: the foot is not where the ground is. The trunk begins
`perch` of its own foot radius above the ground (1.9, where it was 0.6),
and the roots run down to the ground from there. What holds the tree up
is the descent, not a flat plate.

Four things that took:
- `perch` 1.9. The trunk's base now stands 0.38 above the ground on a
  foot 0.4 across: about a trunk's width up, as in the bank photograph.
- The descent lengthens with the height: `dive` plus `slant` (0.75) for
  every bit the foot stands above the ground, so a perched tree comes
  down on a slope (54 degrees) and not a cliff.
- Roots leave in bunches, not evenly all round. `clumps` (3) ways out of
  the foot, and a root is pulled `cling` (0.88) of the way to the nearest.
- The families that own the roots are cut at uneven places round the
  bundle, so the foot has a few heavy legs and some slight ones: girths
  0.079 down to 0.039 on one tree, where they were all much of a size.

Broke twice on the way, both the same kind of error — a length counted in
the wrong units.
- The descent came out at 73 degrees instead of the 45 asked for: a step
  was counted as `ds` toward the distance walked when it also dropped, so
  the walk thought it had gone less far than it had and forced the height
  down harder. Counted as real distance now.
- With the foot raised, the roots forked while still in the air and the
  tree stood on a palisade of straws (32 of them). A root now does not
  divide until it is down, and its descent counts little toward its
  length, as going down a face already did. 8 legs, parting into 6 to 10
  once they are in the ground.

`sketch/page9.png`, `-foot`, `-from-above`; `sketch/page11.png`,
`-other-side`, `-foot`. Withdrawn:
`sketch/page9-foot-low-withdrawn.png`. Page 7 unchanged.

      roots crossing a ring, at most   0.32 to 0.39 of the trunk

What it does: on level ground the trunk stands on legs that arch down and
spread, heavy on two or three sides. On the boulder it straddles the
stone as the bonsai does.

Wrong, or not there:
- In the bank photograph the roots are flattened plates that are one mass
  at the trunk and divide only lower down. Mine part at the flare and
  stay parted: there is no skirt.
- Nothing has sagged. The tree is perched because it is told to be, not
  because anything was taken from under it.
- The legs still arch in much the same way as each other.

## A skirt, legs that differ, and a reason to be perched

Kept going on my own list rather than coming back: the foot had no skirt,
the legs all arched alike, and the tree was perched because it was told
to be.

**The skirt.** Where a root leaves the trunk it is not a cord but part of
a cone. Over its first ten steps a root is now drawn wide enough to meet
the legs either side of it (how far that is, found the same way the mass
rule finds its neighbour), and a step or two out it is its own girth
again. So the foot is one flaring body that divides lower down, as the
bank photograph's is.

First try, which did not work and is worth writing down: I let the trunk's
mass rule run down into the root's first steps, expecting it to fill
between the legs. It filled downward instead. The mass rule reaches along
the way a strand faces away from its own bundle, and a root on the ground
faces up, so "toward the middle" is into the soil. It had to be done
across the root, not under it.

**The legs.** Each comes down at its own steepness now (0.55 to 1.45 of
`slant`), so one drops and the next runs out shallow.

**The surface.** A root's drawn pieces are half as long as a trunk's. At a
root's girth the old length was eight times the width, which is a smooth
tube with no flat faces on it.

**The reason.** The perch had no cause: the tree stood high because a
number said so. Page 11 has a fifth site, `on a bank the rain has cut
away`: the ground is a slope with a hollow taken out of it under the
tree. The ground vocabulary gained `cut(ground, shape)` — what is left of
the ground once that shape has been taken out — which is the first thing
in this work that takes something away rather than adding it. The tree
stands on the lip with its roots reaching over the cut.

      roots crossing a ring, at most   0.24 to 0.42 of the trunk

`sketch/page9.png`, `-foot`, `-from-above`; `sketch/page11.png`,
`-other-side`, `-foot` (five sites). Withdrawn:
`sketch/page9-foot-no-skirt-withdrawn.png`. Page 7 unchanged.

A note on method. Putting a comment at the end of a line that still has
code after it has silently deleted that code five times in this work, and
cost a render each time (three minutes, and once a whole wrong reading of
a picture). There is now a check for it, `runs/021-girth/lint.js`, run
before each render.

Wrong, or not there:
- The hollow on the bank is a clean round bowl. It reads as a crater, not
  as something water did.
- The skirt webs between legs that are far apart on one of the four,
  where it should have given up and left them separate.
- A root still ends where its length runs out.

## A cliff is not an invitation

Said of the cliff tree: it looks weird, that is how potatoes grow — known
for their aggressive root journeys when no moisture is found.
(`sketch/page11-potato-roots-withdrawn.png`.) Five roots went over the
lip and ran straight down the rock in parallel strands to the bottom.

Two rules were wrong, and both said the same thing: nothing in the walk
knew the difference between ground a root can lie in and rock it can only
hang on.

- A root scored a step partly by how far downhill it went. On a vertical
  face every step is maximally downhill, so a cliff was irresistible: not
  a choice between ways, a sink that took every root on that side. It now
  also scores how flat the ground is where it would put its next step,
  and strongly: `hang` (0.12) is all that is left of a face's appeal.
- Going down a face cost a root almost nothing of its length — the rule
  that lets a root cross a step in the ground and carry on. Over a cliff
  it meant a root ran to the bottom however far that was. A face now
  costs what any other ground costs. Only coming down to the ground from
  the foot is still free.

And the site put the tree on the very lip, where its roots had nowhere
else to be. It stands back from it now, by two of its own foot widths.

`sketch/page11.png`, `-other-side`, `-foot` (five sites). The tree at the
cliff keeps its roots on the flat and sends two over the edge. The one on
the boulder still comes down the stone, which was the thing to be careful
of: the stone's sides are not sheer and the ground is close under them,
so a root there is never far from somewhere to lie. Page 9's trees and
page 7's are untouched — on level ground neither rule can fire.

Wrong, or not there:
- The two roots that do go over the lip still hang nearly straight. A
  root on a face ought to work across it, finding ledges.
- Nothing prefers the lip itself, where in a real cliff-edge tree the
  heaviest roots run along the edge like a hem.

## On a face a root braces

Said: roots should go over the cliff, or even through it, but then turn
angularly back into it or up against it — force and grip, an organism
fighting for its place in the wilderness. The entry above had made them
keep off the face altogether, which answers the potato but not this.

Three rules, which together are one: what a root does on a face is not
what it does in soil.

- **Which roots go.** Keeping every root off a cliff and letting every
  root down it are the same mistake, a rule that tells them all the same
  thing. Each root now has a disposition: most turn and run along the lip
  where the soil is, and a `bold` one (0.35 of them) commits to the face.
- **What it does there.** It braces. It works across the fall line in
  runs of `brace` (0.12), turning hard at the end of each so the turns
  are corners and not a curve, and the runs carry it down: across and
  down, across and down. On a face it can choose a turn of up to 75
  degrees, where in soil it may only lean 17.
- **It bites.** Its standoff from the surface goes negative on a face
  (`bite` 1.8 of its own girth), on a wavelength of its own, so it is
  pressed into the rock and comes out again further along. That is the
  "or through even".

And a root working a face spends half its length doing so, where it
spends all of it in soil — it is gripping, which is the point, not
travelling.

`sketch/page11.png`, `-other-side`, `-foot`. At the cliff one root goes
over the lip and works down the face to the ground in corners, half
buried as it goes, while the others hold the flat. On the boulder the
same rule puts roots down the stone's sides. Withdrawn:
`sketch/page11-no-grip-withdrawn.png`.

Page 7's four trees are unchanged. Page 9's are not, and this is worth
recording: nothing in the rule touches level ground, where a face cannot
occur — but asking each root whether it is bold draws a random number,
which moves every draw after it. The trees are the same in kind and the
pictures are remade (`sketch/page9.png`, `-foot`, `-from-above`). Page 7
escaped only because it has no ground at all, so the walk never runs.

Wrong, or not there:
- A root that bites into the rock does not do anything there. It is a
  wave in its depth, not a crack it has found and gone into.
- Nothing prefers the lip, where a cliff-edge tree runs its heaviest
  roots along the edge like a hem.
- Bold is drawn per root and nothing about the tree or the place changes
  how many are bold.

## The hook

Given a drawing: a tree on a block, roots running out over the top and
draping off both edges, and the one that goes down the face turning back
against the rock at its end. The end is where it shows.

A root that has gone over an edge no longer simply stops where its length
runs out. From `hookAt` of its length, different for every root (0.5 to
0.88, so they do not all turn at the same depth), its heading turns back
up the face, and the bite holds hard the whole way, so it ends clawed
into the rock rather than dangling off it. That is the whole of "revert
back into the cliff": a J, not a hair.

`sketch/page11.png`, `-other-side`, `-foot`. At the cliff several roots
go over the lip, at different depths, and each turns back against the
face. On the boulder one goes right under the stone and takes hold on its
underside. (`sketch/page9.png`, `-foot`, `-from-above` remade.)

And a thing about the work itself. Every new question asked of a root on
ground — is it bold, where does it hook, how steeply does it come down —
was drawn from the tree's own stream of numbers, so each one moved every
draw after it, and the level-ground trees changed although no rule of
theirs had. Twice I remade their pictures for nothing. A root's behaviour
on ground is now drawn from a stream of its own, one per root, seeded
from the tree's seed and the root's number. Page 7 had been safe only by
accident: it has no ground, so the walk never runs and never draws.

Wrong, or not there:
- A root that bites into the rock still does not do anything there. It is
  a wave in its depth, not a crack it found and went into.
- Nothing prefers the lip, where a cliff-edge tree runs its heaviest
  roots along the edge like a hem.
- How many roots are bold is a fixed share; nothing about the tree or the
  place changes it.

## Eyes

Said: it does not need to do anything, it has to look immersive, it has
to look good. For instance: roots that sprout outward and merge back into
the main root again. Nothing to do with the soil; it looks good.

Built, and it is the first thing here put in for no reason but that. A
root parts from itself and comes back: a stretch of it sprouts to one
side, arches up off the ground and merges into the same root further
along, leaving a closed eye of wood with daylight through it. It takes a
share of the root's section between the two joins, so the root is thinner
through the eye and whole again beyond it, and both of its ends are
pinned to the root each pass, so the two never come apart. Three to five
on a tree.

Took three goes, all of them about where and how big:
- Flat on the ground. The eye lay in the surface, so from any angle it
  was a sliver, not a hole. It arches up off it now, by two or three of
  its own girths.
- Too many and too near the foot, where the skirt widening already fills
  between the legs: the foot webbed shut into a tent. They sit further
  out along a root now, where the legs are separate and a hole can be
  seen against the ground.
- Then none at all, because I placed them by counting from the wrong end
  of the root (index 0 is the tip, not the foot) and every one fell off
  the end. Placed from the outer end now.

`sketch/page9.png`, `-foot`, `-from-above`; `sketch/page11.png`,
`-other-side`, `-foot`.

Wrong, or not there:
- An eye is a clean arch. A root that did this would be lumpy at the two
  joins, where the wood of the two has run together over years.
- Only roots get them. A limb could.

## Eyes, mended: lumpy at the joins, and limbs get them too

Both faults from the entry above, agreed and taken.

**Lumpy at the joins.** An eye was a clean even arch — a handle stuck on.
Where wood parts and merges, each piles against the other, so now: the
eye is heaviest where it leaves and lightest at its middle (it was the
other way round), and the wood it leaves swells by a third over four
steps at both joins. The joins read as grown rather than glued.

**Limbs get them.** The eye is built from any stretch of any strand now,
not only a walked root: on the ground it is laid on the surface, in the
air it arches off the limb's own side. Three to four of each a tree.

Where a limb's eye goes took two goes. Out on a twig it is lost among the
other twigs; near the trunk the wood is one mass and swallows it whole.
It sits on a bough: far enough out that the strands have parted and the
limb is its own body, thick enough to be worth looking at (girth 0.018 to
0.05), and half as big again as a root's, to be seen at all up there.
Even so it reads less clearly than a root's eye, because a crown is busy
and a root's eye has the ground behind it. That is the honest result, not
a fault to tune away.

Page 7's four trees now carry `eyes: 0` in their recipes. They are the
record of what was approved and are kept as they were; eyes came later
and belong to the grown trees. Fingerprint back to `e387ada36c`.

      roots crossing a ring, at most   0.24 to 0.47 of the trunk

`sketch/page9.png`, `-foot`, `-crown`; `sketch/page11.png`,
`-other-side`, `-foot`.

Wrong, or not there:
- A root that bites into rock still only makes a wave in its own depth.
  Nothing there is a crack it found.
- Nothing prefers a cliff's lip, where a tree runs its heaviest roots
  along the edge like a hem.
- How many roots are bold is a fixed share, and so is how many eyes a
  tree has. Neither answers to the tree or the place.

## Roots answer to the ground: a lip to run along, a seam to take, and boldness that answers to the place

The three faults left standing in the entry above, all agreed. Each one was
the same complaint in a different place: the root was deciding things that
the ground should decide.

**A lip to run along.** A root now feels around itself for ground that has
gone from under it: a ring of eight feelers at 0.11 and 0.24. Where the
ground falls away near by but not underfoot, that is a brink, and a root
that is not going over turns and runs along it. The heavier the root the
more it prefers to: `brink` carries the root's girth squared, so the slight
ones go over the edge and the heavy ones hem it. Two things were needed
beyond the preference itself, and without them the rule did nothing at all
(the first two attempts moved the paths by less than the eye could tell):
the brink has to damp the root's urge to get away from the tree, which
otherwise simply carries it over; and a root at a brink may turn hard, the
wide fan of directions it already had on a face, so that it corners onto
the lip instead of curving over it.

**A seam to take.** Where a root bit into rock it made a wave of its own
length and nothing more. Now its depth is set by how hollow the ground is
under it, which is the ground's business and not the root's: in a hollow it
sinks, over a rib it rides proud, and two roots crossing the same seam dip
in the same place because the seam is the rock's.

Seeking one took four tries and is the most instructive thing in this
round.

- Curvature, measured by sampling the surface around a place. It works
  under the root, for depth. For seeking it is worse than useless: read
  from the flat *beside* a crack, a crack reads as a ridge, so every root
  shied away from the cracks it should have taken. The sign was right and
  the meaning was backwards.
- A seam is better found the way the lip is found: ground gone from under a
  place out that way, which comes back. A drop that goes on and on is a
  lip; a dip with rock beyond it is a seam. Same eight feelers, no extra
  cost.
- What counts as a seam was a fixed size (a dip over 0.045). Only cracks of
  about that one width were ever taken. It is the root's own girth now, so
  a slight root takes a crack a heavy one cannot feel and could not have
  lain in anyway.
- And it steers by the ring, not by a reading 0.07 ahead that no two
  candidate directions could tell apart.

`runs/022-seams/` has the experiment: one crack across a slab, the rule off
and on, over twelve seeds.

      crack radius 0.036    root length on the crack   5.7% -> 9.5%
      crack radius 0.070                               8.6% -> 13.8%

About two thirds more, with the spread between seeds as big as the gain.
Over a wood you would see it; on any one tree you may not. That is the
honest size of it, and it is smaller than the pictures first suggested.

Two measures were wrong before that one, both of them quiet about it:

- How much root lay *inside* the groove read 1-4% whichever way the rule
  was set, while the pictures plainly differed. A root running along a
  crack rides on it; it is not in it.
- The first ground was a slab with three crossing cracks. Their own width
  covered a fifth of it, so a root was within 0.06 of a crack by chance,
  and the measure sat at 22% with the rule off. Nothing could have shown
  there. The test ground has one crack now, where the baseline is 5%.

I believed, from those pictures, that roots were plainly following the
cracks, and said so to myself twice before the baseline said otherwise. The
picture is the judge of whether a thing looks right. It is not the judge of
whether a rule did anything: for that it has to be the same picture with
the rule off, and a count.

**Boldness that answers to the place.** How many of a tree's roots will
risk a face was a flat 35%, the same on a lawn as on a boulder. A tree now
looks at what it has: a ring about the foot, how much of it is ground it
could lie in rather than hang off, and how much of that is not far below.
Where there is soil, few roots take a face; where there is not, most must.
On these sites it comes out at 81% good ground on the cut bank, 63% on the
slope, 56% at the cliff edge, 50% on the boulder, 44% in the cleft. And it
is the slight roots that go over, since a heavy one is held back by the
same weighting that puts it on the lip.

**An eye costs a root a fifth of its section**, so only a root that can
spare it gets one: the chance now rises with the root's girth against the
trunk's, and the slight ones have none. Page 9's trees have fewer eyes
than they had, on heavier wood. Their roots and limbs are unmoved -- the
lines fingerprint exactly as before -- and page 7's four are untouched.

A sixth site, `on cracked rock`: a tilted slab with three cracks cut into
it. The other five have almost nothing concave in them, being faceted rocks
and tilted planes, so there was nothing for a seam rule to find; the new
rules only have something to answer to where the ground has something to
say. That is not a fault of the rule but it is a limit on where it shows.

Two things I had to undo on the way:

- A perfect plane read as hollow by 1e-17 of float noise, which was enough
  to move every root a little and make a fingerprint useless. Below
  anything real, it is flat now.
- The measurement script read one step past the end of a strand and
  reported a not-a-number in the wood. There was none. Before believing a
  fault in the thing, check the instrument.

      roots crossing a ring, at most   0.15 to 0.45 of the trunk
      seam felt, by site               2% slope, 4% bank, 11% boulder, 19% cracked rock, 37% cleft

Wrong, or not there:
- A root takes a seam, but nothing about the rock's own grain: a crack is
  wherever the ground happens to be hollow, and the rock has no bedding, no
  direction, nothing a seam ought to run with.
- The hem is a preference for a brink, not for a particular brink. A tree
  on a spur hems both sides equally; it has no sense of the shape of what
  it is standing on.
- A bold root goes over a face. It still has no sense of what is at the
  bottom, and reaches it only because the ground happens to be there.

## Roots are stiff: a line held, a corner taken, a knuckle at the bend

The roots read as tentacles. Tepid stings, jellyfish: no rigidity of their
own, which is the one thing a root has to have.

The cause was in the walk, and it was not tautness. Every step turned a
little: a rolling curvature, damped and re-randomised, kept inside what the
girth allowed. However far such a thing wanders it can only make a curve,
and a curve is what something limp makes. (This is the same lesson as the
branches' elbows, from the other side. There the fault was too little
turning, here too much of it, and the answer is the same both times:
put the turning in one place and let the rest be straight.)

So a root now holds its line. It goes straight -- the heading it has, laid
on the ground, which bends only as the ground bends -- for a run as long as
it is thick: a heavy root holds its line a long way, a slight one turns
often. Only at the end of a run does it look around, from a fan of nine
ways out to 75 degrees either side, and take the best. Then it holds that.

Two things follow from the corner, and they are what makes it read as
strength rather than as a zigzag:

- **The knuckle.** At the bend the wood piles up and presses into the
  ground: wider by up to half again over three steps, and sunk by half a
  radius more. The harder the corner the bigger the knuckle. A corner is
  where a root is holding on, and this is what the corner is for.
- **The depth is held along a run.** It was a slow sine along the root's
  own length, which is more wandering of the same kind. It is flat along a
  run now and steps at the corner, so the knuckle is a step down and not a
  swell on a wave.

Lengths, by picture, on the cliff tree:

      run 0.10   many corners, which average back into a curve: the thing
                 the change was for, undone
      run 0.16   a thigh, a knee, a shin, a foot -- kept
      run 0.24   long bones, few joints: a stick insect

Two more changes in the same direction, both by eye and then checked:

- **Mass.** `grip` 0.62 -> 0.8. The roots were wiry for their length. At
  the most loaded ring the roots now come to 0.81 of the trunk's section,
  where they came to 0.45 -- nearer what the pipe model would say, and
  still inside the rule that they may not exceed it.
- **Blunter feet.** The taper ran over the last 22% of the length down to a
  tenth of the girth, which left a long wiry tail. It is the last 13% down
  to a quarter: the limb carries its weight out to the foot and then ends.

What this costs: every tree on ground is re-walked, so page 9's roots and
limbs are not the lines they were. Page 7's four are untouched (they have
no ground, so nothing walks) and fingerprint exactly as before.

Wrong, or not there:
- The corner is chosen in the plane of the ground. A root's bends are all
  in plan; nothing knees downward into the soil except where the ground
  itself falls, so from the side a root is still a fairly even descent.
- A knuckle is a swelling of the whole section. The wood ought to pile on
  the outside of a bend and be drawn thin on the inside, which needs the
  line moved and not only the girth.
- The eyes are still smooth arches, laid out by sine. Against roots made of
  straight runs they are now the limpest thing on the tree.

And the eyes with them: an eye of wood is two straight runs out and back
with corners, not a sine arch, and the wood piles at its two bends as it
does at a root's. The proportions of the trapezoid come from the share of
the section the eye took, so no two are alike.

      page 9's lines, from here   1f56c8eb6f 4cf2326b26 88b7a470c3 9c164ef91a 1a82562001
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## A root is a beam, not a strap

"The starting shape is a ribbon. That makes the root a ribbon. What happens
if you place a ribbon on a surface? It drapes over it." Which was right,
and was a fault in the wood and in the walk, not in the line. The last
round made the line stiff; the stuff on it was still a strap.

Two things made it a strap, and they were both deliberate once.

**The pieces were cut short.** A root's pieces were halved in length,
because at a root's girth a long flat-faced prism laid along a curve shows
no face: it cuts the curve and has to be sliced to follow it. But the line
is not a curve any more. A piece can now be a whole run of it: a long
prism, ended at the corner, so a root is a chain of beams meeting at
knuckles. This is the first thing that reads as material with any stiffness
in it, because a face is at last long enough to catch the light along.

**It was laid to the ground at every step.** That is what draping *is*.
A stiff thing is planted where it corners -- that is what a knuckle is for
-- and between knuckles it holds its line: it stands on the high places and
spans the low ones, as far off the ground as a couple of its own
thicknesses and no further. It holds on the way down as well, so a root
does not slide down to the ground but comes down in steps, on its knuckles,
with the spans between riding high.

Tried first and withdrawn: giving a root its own section, narrow and tall
instead of wide and flat, on the thought that a blade standing on edge
resists what a strap lying flat does not. At a root's girth, and with the
surface smoothed as it is, a near-square section reads as a *tube* -- it
lost the flat faces entirely and came out rounder and limper than the strap
it replaced. The section was not the thing. The length of the faces and
whether they touch the ground were.

Page 7's four are untouched: a tree given no ground has no walked root, so
what is below its foot keeps the short pieces it always had, and the
gate is on the ground, not on the strand. I checked this by picture after
finding that the kernel fingerprint would not have caught it -- it
fingerprints the lines, and this round changes only the wood on them.

Wrong, or not there:
- The beam spans a hollow and stands off the ground, but nothing is holding
  it there. It is stiff in the way a laid plank is stiff; there is no sense
  of it being sprung against anything.
- A knuckle is where the root touches, and a span is where it does not, but
  the wood is the same stuff in both. A real one is scuffed and flattened
  where it bears.

      page 9's lines, from here   d32867d9a7 802cb84e69 436e4cee59 53b34326a7 30ac9d0ac6
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## Withdrawn: the heavier roots of the entry above

"Now the excessive huge girths have returned." They had, and the entry
above put them there. Two mistakes, one of them worse than it looks.

**`grip` 0.62 -> 0.8 was too much.** It was chosen because the roots read
as wiry, and it was checked against the budget, which it passed: 0.81 of
the trunk's section at the most loaded ring, nearer the pipe model than the
0.45 it had been. The number was right and the tree was wrong. What the
budget cannot see is that the beams of the same round lifted the roots off
the ground, so more of each root shows than before at the same girth: the
same number now looks half again as thick. A measure taken before a change
does not carry across it.

**And it broke an invariant that was written down.** The comment on the
collar says `collar` x `grip` is about 1, the two set together: a root
leaves the trunk at its own share of the section and is down to its running
girth within `flare`. I changed one and not the other, so the product went
to 1.28 and every root left the trunk 28% over its share. That is exactly
the "they start about 70% too thick" fault from the roots entries, come
back by a different door. A number with a stated relation to another is
not free to move on its own, and I read the comment, wrote the change
underneath it, and did not apply it.

So: `grip` 0.5, `collar` 2, product 1.0 again, chosen by picture against
0.42, 0.5, 0.55, 0.62 and 0.8. Mass where a tree carries it -- the foot
spreads into broad buttresses -- and slim along the root, which is the
proportion the heavier setting had inverted.

      heaviest root, against the trunk's radius   0.24   (0.34 at grip 0.8)
      roots crossing a ring, at most              0.40 of the trunk's section

The knuckles are kept at full strength: tested at 0.3 and 0.55, and the
smaller one takes away the character without taking away any bulk worth
having. The girth was never in the knuckles.


      page 9's lines, from here   b1cb17889f 0736abf4f0 89ee38b16e 561483e938 b15cb8ba77
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## Roots articulate: a hand taken at each knuckle, kept or changed

"It really has to snake", and then: "it doesn't just have to be zigzag,
they can also curl, let the roots articulate freely."

The first attempt was a zigzag and only a zigzag: a root that alternates
hand at every knuckle, with shorter runs between them. Twice wrong.
Shorter runs are the old trap -- corners every other step average back
into the curve the corners were for -- and strict alternation is a
sawtooth, which is one shape, not freedom.

What is there now is a degree and a habit, both drawn for each root.

- **How freely it articulates** is a number, not a kind: a slight root
  articulates more than a heavy one, which holds its line. It changes what
  the root is willing to pay for a turn (the straight-ahead bonus goes, the
  penalty on a big angle nearly goes) and adds a push toward the hand it
  has taken.
- **Its habit** is whether it keeps that hand at the next knuckle or
  changes it. Kept, successive turns carry it round into a curl or a hook;
  changed, it zigzags. Most roots do some of both, and the habit is the
  root's own, so one tree has both kinds in it.
- And how far it swings is not the same twice: some knuckles are nearly
  straight, some are hairpins.

A root that articulates takes **longer** runs between its knuckles, not
shorter: fewer, harder turns. With shorter ones the curls came out smooth
and the thing was a tentacle again, which is what the whole of the last two
rounds was about. The rule that keeps it stiff is the same rule that lets
it wind: a held line and a hard corner.

It is also given a little more length (12%) for the same reach, since what
it spends going sideways it would otherwise spend going out. That was 50%
at first, which simply made more wood: the trees grew a third more root
and most of the gain was in the thin ends.

      roots crossing a ring, at most   0.32 of the trunk's section

Measured and discarded on the way: the share of root length thinner than a
wire. It came out at 45-60% and barely moved whatever I did, because what
it was counting was slight roots, which are meant to be slight. A rule to
end a root when it had "run out of substance" was written against that
number and then removed: it fired in the last 1% of a root and did nothing.
Two rounds running, a number has sent me after the wrong thing.

Wrong, or not there:
- A curl is a curl in plan. Nothing lifts off the ground and comes back
  down in the middle of a run, which is what a root does when it crosses
  another one.
- The habit is fixed for the whole length of a root. A real one wanders
  loosely where there is nothing in its way and turns hard where there is;
  the ground decides nothing about how much it articulates.

      page 9's lines, from here   2ecabc8f7b 9b5ddcdc69 b9c92f8e4f a540462735 46492b392d
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## The knee pushed out, and bark on the roots

Three changes, one small and two that had been hiding in plain sight.

**The knee.** A knuckle swelled evenly, which is a bead on a string. The
corner's vertex is now pushed out along the bisector of the exterior angle,
by a little over a third of a radius at a hard corner, so the wood piles on
the outside of a bend and the inside is drawn tight. It is a modest effect
-- half of what I hoped -- but it is the right half: a knee rather than a
bead.

**Bark was never on the roots at all.** The cells it is made of were seeded
from above the foot only. Every root on every tree was bare wood against a
plated trunk, which is half of why a root read as something peeled, and I
had been looking for the cause in the shape for two rounds. Roots carry
bark now, barred within six steps of the foot (the flare stays clean) and
off wood too thin to hold it.

**And the grown trees had almost no bark anywhere.** Counting the cells
found 108 on a tree of page 11, of which 10 to 14 were lit -- one swathe,
or on the cliff tree none at all. Two causes, both the same mistake:

- The cell size, the sheet's thickness and what counts as wood too thin to
  carry bark are absolute numbers, tuned against a trunk of radius 0.27.
  A grown tree's trunk is 0.16 to 0.25, so nearly every place on it was
  "too thin". They scale with the trunk's own radius now, and never up, so
  the trees the numbers were set on are untouched.
- What counts as broad wood was measured over *all* the cells, and the
  broadest cells are on the foot -- which is barred, being the flare. The
  foot set a mark that the rest of the tree could not reach, and barred
  itself out of the measurement it had set. It is measured over the wood
  that may actually carry bark now.

      bark cells on a page 11 tree, lit   10-14  ->  17-46
      page 7's four                       pixel for pixel as they were

Page 7 is held to the old reading of both rules, as it is held to the old
everything. That is three rules now that are gated on whether a tree was
given ground (the beam pieces, root bark, and this), which is a fair
description of what separates those four trees from the grown ones, but it
is a seam in the code and worth saying out loud.

Wrong, or not there:
- The bark on a root is the trunk's bark at a smaller size. A root's bark
  is a different stuff: thinner, stretched along, and it goes scaly where
  the root enters the ground.
- Bark still stops at a hard edge on open wood. Where a swathe ends on a
  root there is no reason for it to end there.

A root's bark is now its own stuff: it tears nearly twice as far along the
root as a trunk's does across it, so what lies on a root is long strips
running with it rather than the trunk's broad patches, and the sheet is
half as thick. The far thin roots stay bare, which is the contrast that
makes the barked wood read as covered.

And the seventh time: a replacement line of mine ended with a comment, and
the brace that closed the block was pushed out past it and swallowed. The
check in `runs/021-girth/lint.js` did not catch it, because the check was
written for a comment put after unfinished code, and this was code put
after a finished comment -- the same accident from the other side. It
checks both now.

## Roots divide near the foot, not out in the field

"I don't like it when the roots fork late, that feels like potato rhizome
again." Measured, that was fair: a division happened at a median 0.46 of
the way out along the roots' reach and sometimes at 0.77, and what parted
took two thirds of the section it left. A root running most of its length
and then splitting half of itself off is a rhizome. A tree shares its
section out near the foot and fines down from there.

Three things, and the third is the one that mattered.

- **Divisions are crowded into the first part of a run.** Where one may
  happen was 0.1 to 0.75 of the way out; it is 0.06 to `forkBy` (0.42) now,
  and the steps between are half what they were, so several fit in the near
  part instead of being spread the whole length.
- **What a division takes falls away with how far out it is.** It was a
  flat 34 to 58% of the section wherever it happened. At `forkBy` it is now
  40% of that, so what parts far out is a side root and not a second trunk.
- **And the rule that refused four of every seven.** A division was refused
  while the root was "still coming down", measured as being more than four
  of its own radii above the ground -- which is exactly where a root is in
  the near part of its run, the part I had just crowded the divisions into.
  The first two changes cut the branching from 87 divisions to 30, and the
  root system came out sparse and long: I had traded one wrong look for
  another. What that rule is for is not forbidding height but forbidding
  division while the root is plunging, which is what would stand a perched
  tree on a palisade of straws. It tests the run's own slope now, and
  refuses a division only on a plunge or out on an aerial leap.

      divisions                              87  ->  99
      how far out, as a share of the reach   median 0.46 -> 0.26, worst 0.77 -> 0.46
      what a division takes of its parent    median 0.68 -> 0.57
      roots crossing a ring, at most         0.39 of the trunk's section

The lesson is the one from the bark round again, a day later: a threshold
written as an absolute height (or girth, or length) encodes an assumption
about where the thing it guards will be, and when another rule moves that
thing the threshold quietly guts it. Both times the symptom was a count
collapsing, and both times I found it by counting the refusals rather than
by staring at the result.

Wrong, or not there:
- Where a root divides is decided along the root, not by the place. It does
  not divide at a rock, or round one.
- The two that leave a division are the same kind of thing at different
  sizes. In a tree one is usually the continuation and the other is clearly
  a branch of it, and that difference is not drawn here.

      page 9's lines, from here   3e496fc5e4 81c54a33c9 ce8a85f524 a13c6d4762 c5496686c3
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## Timber, and what was missing: a root is a strut, not a path

"Now it looks like timber, not alive at all." It did. Four things were
wrong, and the fourth is the one that was never in the model at all.

**It held one girth along a run.** Wood that does is sawn. A root has two
slow waves of its own now, at a few radii and at a span, so no stretch of
it is the thickness of the next and the silhouette is never
parallel-sided. The knuckles are the big swells; this is what happens
between them.

**It had no fibre.** The slivers that make the trunk read as a living
thing -- lengths of wood lying along it, pointed at both ends -- were laid
above the foot only. Every root on every tree was a bare smooth rod, a
peeled stick. Roots are fluted now, more plainly than the trunk because
there is no bundle to hide it. They first came out invisible twice: laid at
0.42 of the radius they were buried inside the wood, and then, put on the
skin, they stood a tenth of a radius proud where a mesh cell is a third of
that. At a root's size, detail has to be bigger than it would be on a
trunk or it is not there at all.

**They were held apart.** The score paid a root 2.4 for room, which spaced
them evenly round the foot -- a dozen similar rods at equal angles, which
is a thing a machine makes. At 1.0 they bunch, run alongside each other and
cross, and that alone did more for the look than anything else in the
round.

**And a root is not a path.** This was the user's, and it is the right
model:

> A root expands outward and down through the air until it hits something
> it can nest itself in, then it digs in or latches. But after it tethers
> that point into a solid mass. The root keeps growing from the base in
> length. The excess root is now caught between the tree and the ground and
> will bend outward; this extra tension is also used to bury the root
> further so some tension alleviates and you don't have to bend upward far.

So the walk finds where the root reaches and latches, and that end is
fixed; the foot never moves. Then the tree goes on putting length on at the
foot, and the run between the two ends is longer than the distance between
them. It buckles: it bows to one hand -- first mode or second, its own
choice -- and as it is laid back down it presses into the ground, which is
how it sheds some of the tension without having to rise. The bow is taken
at the knuckles and the runs between them stay straight, so it buckles as a
strut does and not as a rope sags.

      extra length between foot and latch   5 to 17%
      roots crossing a ring, at most        0.36 of the trunk's section

Found on the way and not chased: the worst pair of strands on these trees
overlaps by 35 to 49%, against the 27% the brief allows. It is not from
anything in this round -- it reads the same with every one of these changes
off -- but it has been true for a while and I had not measured it.

Wrong, or not there:
- The latch is assumed, not found. The walk still ends where its length
  runs out, and the buckle then treats that end as though the root had
  taken hold there. What the model asks for is that the root reaches until
  it finds something worth holding -- a seam, a lip, the far side of a
  stone -- and stops there because it has found it.
- The length is put on once, at the end. A root that had been adding length
  for years would have buckled, pressed, been held, and buckled again
  against its own earlier shape.
- Nothing is in tension afterwards. The buckle is a shape, not a load: the
  wood does not pull on the tree or on what it holds.

      page 9's lines, from here   15f37aece6 bcd8e7d262 782ba78d99 cd506d8d28 b05cb87fe5
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## Withdrawn: bark on the roots

"And doesn't seem to need bark." Put side by side it plainly does not. The
plates sit on a root as broad smooth shields, and what they cover is the
fluting -- the one thing that had just made a root read as living wood
rather than a peeled stick. A root with bark is blobbier than a root
without; the sheet adds mass where the shape wants tautness.

So the diagnosis two rounds ago was wrong. "A root is bare wood against a
plated trunk, and that is why it reads as peeled" sounded right and was
not. What a root needed was fibre along it and tension in it, not a coat
over it. The coat was the obvious answer and the obvious answer was in the
way of the real one.

The machinery stays, switched off: `bark: { onRoots: true }` puts it back
for anyone who wants to look again. What is kept from that round is the
rest of it -- bark sized to the tree it grows on, which is what gave the
grown trees any bark at all on their trunks and limbs, and the measurement
that found they had almost none.

The flutes, which were laid in the same round for the same wrong reason,
turned out to be the thing that worked.

## Hierarchy, and a ground that says where it is soft

Two things, one settled and one put up for a decision.

### The foot was a cable fraying

"There's not enough hierarchy amongst the roots. It's like wires coming out
of a braided cable." Measured: the heaviest root was 1.4 times the fourth,
and a foot of a dozen roots within a factor of two of each other.

I went at the share-out first -- the foot's families were cut at weights
between 0.35 and 1.65 -- and drew them steeply instead. It barely moved.
The reason is worth writing down: a family's girth is the root of the sum
of its members' sections, and the members are strands of the trunk, so with
fourteen strands in six families the heaviest family can hold eight and the
lightest two, and that is a ratio of two however the weights are drawn.
**The hierarchy was capped by the cable, not by how it was shared out.**

The strands themselves were near-identical: `uneven` 0.5 puts all fourteen
between 0.75 and 1.25 of each other. A grown tree's are drawn far more
unequal now (0.95), and the foot has one or two roots that carry the tree
and a scatter that do not. `mixed`, the power-law draw, was tried and is
too much: one giant root, nothing else, and a trunk that stops reading as a
bundle at all.

      heaviest root against the trunk   0.24  ->  0.42
      heaviest against the fourth       1.4   ->  2.4

And a second fault found on the way: **which roots were to be heavy was
settled after they had all been walked.** The families were cut and their
shares added to the lead's girth once every root had already found its way,
so a root that was going to carry a quarter of the tree walked as though it
were one strand of fourteen -- it held no longer line than the rest,
hemmed no lip, took the same slight way round everything, and only
afterwards was fattened into a buttress. The share is drawn before the walk
now, and a root that is to be heavy behaves heavy while it is finding its
way.

### Whether a root may go into the ground

The rest of the message is a question the user has not decided, so this is
a thing to look at rather than an answer:

> the roots have some resistance against the ground, yes, but then they're
> forced to crawl across impervious surfaces. But that's not the root's
> fault [...] Whether the root is allowed to burrow or not seems to be
> arbitrarily decided by the root itself and currently the answer is 'no'.

Right on both counts. Nothing in the model ever asked the ground what it
was made of. So: a ground may now carry a second reading beside how far
outside it you are -- how soft it is there. Where it is soft a root sinks
until it is under and is not seen; where it is rock it stays on the surface
and grips. No soil, nothing simulated: one more function of a place,
exactly like the ground itself, and the decision belongs to the place
rather than to the root. With no such reading nothing changes.

`in soil, round a stone` is the demonstration: soil everywhere but one
stone, and what shows of that tree's roots is only what crosses the stone.

**What it showed me is that the question is not the one being asked.**
Burrowing is cheap and it works. What reads as lazy clipping is not a root
going into the ground, it is a root going into the ground *without
consequence* -- it meets a flat surface and ends, and nothing about the
ground acknowledges it. A real one heaves the soil over itself, and the
heave is what sells the burrow. That is drawable from what is already here
(a low ridge of ground material over a shallow buried root, tagged as
ground) and it is the next thing to build if this direction is wanted.

So the choice is not between real soil mechanics and arbitrary burrowing.
It is: the ground says soft or hard, which costs one function, and the
burrow is paid for by a heave, which costs a ridge. Granite stays granite
because the ground says so, not because the root was polite.

And a near miss worth recording: the factor that makes a heavy root run
further came out as `0.72 + 0.3 * rank`, which is 1.02 at rank 1, not 1.
Page 7's four have no families at all, so nothing about this round should
have touched them -- and their fingerprint moved, because every root on
every tree in the repository got 2% longer. A multiplier that is meant to
leave something alone has to be exactly 1 where it leaves it alone, and
the only reason I caught it is that four trees are pinned and checked.

A cost that came with the uneven strands, and it bears on the user's worry
about build time in a procedural world: a page 9 tree now takes 30 to 68
seconds to settle where it took about ten. The strands are fatter and more
unequal, so far more pairs of them are close enough to push on each other,
and the settling is quadratic in that. Nothing is broken -- the renders
just stopped fitting in their five-minute budget and had to be given
fifteen. Worth knowing before any of this is asked to run on a player's
machine: the expensive part is not growing the line, it is settling the
wood.

      page 9's lines, from here   a0e3772461 7aa37cf6f1 b49b812a0e 3a141a6fa2 f8630c5170
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## The long detours: a root forgiven too much for coming down

"There's some weird roots still though, long detours feel like something
went wrong in the rendering." Two causes, and the first is a rule of mine
working exactly as written and being wrong.

**A root was forgiven everything it spent getting down.** Going down a face
counted a half toward its length and going through the air a third -- put
in so that a root leaving the level it started on would not be cut off in
mid-air. But a bold root that goes over a cliff spends most of its run
descending, so it arrived at the bottom with nearly its whole length
unspent and ran it out across the flat in one straight line. That is the
detour: a long, nearly straight, barely tapered root going nowhere, which
reads as a fault in the drawing because there is no reason in it. It may
be forgiven up to a fifth of its length now, and no more.

**And the ground is a patch, not a world.** A root that reached the edge of
the ground it was given stopped dead, at whatever girth it had: a cut
stump, which is exactly what asset clipping looks like. It feels the edge
coming from 0.68 out and turns along it now.

      roots that run out of ground   10 of 154  ->  4 of 138
      of those, still thick when they stop   2  ->  0

Wrong, or not there:
- The edge-turn is housekeeping for a sketch, not a rule about trees. On a
  real terrain there is no edge, and the rule should go when there isn't
  one. It is the only thing in the walk that knows the ground is a square.
- A root that goes over a cliff still comes down because the ground falls
  away, not because there is anything below worth reaching.

      page 9's lines, from here   a0fd975885 605974eb6b 482d097487 7f4b3b56bb 1aed93441d
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## The bends were made when it was a thread

"There's not enough joints, knuckles in them. Not all of them need it, but
stochastically a whole bunch need more." And then the part that was
missing from the model altogether:

> roots often don't need anything to force them to snap into a new
> direction. That's because roots often start small, a tiny pebble could
> add a hinge and then it stays that way even as the root grows huge. Add
> soil erosion washing away the causes of the bends and you got roots that
> snake seemingly without reason, because what was once the reason is
> either too small or no longer exists.

Three changes, and the first two are each a thing I had backwards.

**The spacing of the knuckles was a share of the root's final girth.** A
heavy root was given long runs between its bends -- so the heaviest roots,
the ones most looked at, were the straightest things on the tree. But a
root's bends were settled when it was a thread. A pebble that turns a hair
aside is nothing to a root of a hand's width, and the bend it makes is kept
and grown around for the rest of the root's life. The spacing is a young
root's spacing now, the same for every root whatever it becomes.

**And nothing made a joint be a joint.** Turning more often had been tried
twice and came out as a curve both times, because a corner was free to be
almost straight: twenty corners of five degrees is an arc. A root that
articulates now pays for a small angle at a knuckle, so each one is a real
turn.

**What a root can swallow, it does.** With a thread's spacing on a thick
root the result was a ripple running along it, not knuckles -- which is
right, and is what really happens: as a root thickens the wood fills the
inside of every bend tighter than the root is wide. Those turns are gone,
absorbed. What is left is the few it could not fill. So the bends are
drawn mostly small with a long tail of big ones, and then the wood eats
what it can: a thread keeps all its wiggles, and a heavy root keeps three
or four real joints with smooth wood between them -- not because it bent
less, but because it grew over most of what it did.

This is the first rule here that is about *time* -- the shape is from one
age of the root and the girth from another, and the look comes from the
disagreement between them.

      roots crossing a ring, at most   0.35 of the trunk's section
      page 7's four                    unchanged

Wrong, or not there:
- What a root swallows is decided by its final girth everywhere at once. A
  root thickens from the foot outward over years, so the near part should
  have swallowed more than the far part, and the joints should survive
  further out than near in.
- Nothing in the ground ever made any of these bends. The account says the
  cause is gone, which is a licence for the bends to be arbitrary -- but a
  root crossing a stone that is still there should still bend at it, and
  the pebbles that have washed away should have left the bends they made
  in the ground's own pattern, not in the root's private stream of numbers.

      page 9's lines, from here   53ec4047f0 c104457eb0 9e8dcca33f 75f3c67c09 6aaf3a1c9f
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## A flag for the flooded foot

"You frequently do this thing where you seem to flood the rootplate with
growth hormone and it's like a cancerous growth blasting from the bottom
[...] And you clearly don't pick up on it in screenshots."

Fair, and the second half is the important half. A dense foot and a strong
foot look much alike from most angles, so a still does not settle it, and
I have shipped the fault more than once while looking straight at it.

`runs/023-plate/plate.js` counts it instead. It samples a ball about the
foot, a little over two trunks across, and reports how much of that space
is wood. A second ball at twice the radius says whether what is there
spreads or stops.

What makes it a useful flag rather than another number is what it does
*not* answer to. Forced on purpose, on page 11's seven sites:

      as it stands                       foot 0.13 to 0.21
      more roots      (feet 14)          foot 0.17 to 0.21   no worse
      more dividing   (forks 3)          foot 0.19 to 0.20   no worse
      roots twice as thick (grip 1.0)    foot 0.27 to 0.33   flagged, all seven

A foot may have as many roots as it likes and may not be made of wood,
which is exactly the distinction that was being missed. The flag is at
0.25. Nothing is clamped -- it prints and marks, and it is to be run
before believing a picture, the way the lint is run before a render.

This is the third measure in the repository and the first one asked for
rather than reached for. The other two (the girth budget, the seam count)
were both built to answer a question I already had; this one exists
because a fault kept getting past the eye. Worth remembering which kind of
measure is worth having.

Wrong, or not there:
- It counts a ball at the foot, so a tree whose roots go under the ground
  reads lower than one whose roots lie on it, for no reason that has
  anything to do with the fault.
- It is run by hand. Nothing stops a picture being taken without it.

## Retracted: the plate flag was counting the wrong thing

The entry above is wrong and the round it reports did not fix anything.
"So you fixed nothing, this is still the freakish growth tumor roots."

I had assumed the fault was **wood** -- a foot flooded, a mass -- and built
a measure of how much of a ball at the foot is solid. It was calibrated
against a tree with its root girth doubled, which it caught; it passed the
trees that actually had the fault; and I reported a clean bill while the
fault was in the picture I sent with it. Worse, in calibrating it I wrote
down that more roots (`feet 14`) left the number unmoved and called that
the right sensitivity. More roots *is* the fault. I had the measure certify
the thing it was built to catch.

What the fault actually is, cut open and counted: **thirteen to nineteen
roots were leaving the foot, and every one of them was a wire.** They share
one trunk's worth of section between them, so the more of them there are
the thinner each must be. A fringe of wires round a swollen trunk is what
reads as a tumour. Volume cannot see it, because fourteen wires and six
roots weigh the same.

And the cause was mine, from two rounds ago. Crowding the divisions toward
the foot -- right as a share of a root's length -- put them inside the
first two trunk-widths, so each primary root sprouted two or three more
before it had got clear of the collar. The foot is left clear now
(`clearFoot`, 2.1 trunk radii): what leaves the foot is few, and the
dividing starts out beyond it.

      roots leaving the foot   13 to 19  ->  4 to 7
      roots crossing a ring, at most   0.48 of the trunk's section
      (`grip` 0.5 -> 0.6: with six roots instead of sixteen, each can carry more)

`runs/023-plate/plate.js` counts both now -- how many leave, and the fill
-- and says in its own comments which fault each number sees and that the
first one was got wrong. The fill is kept because the solid-foot fault is
real; it is just not this one.

The lesson is sharper than "a picture beats a number", which I had already
written down twice. It is: **a measure built from a guess about the cause
will certify the fault.** I guessed wood, calibrated against wood, and got
a green light. What found it was cutting the foot open, failing to see it
there either, and then going back to the picture the complaint was about
and counting what was actually in it.

      page 9's lines, from here   3124a3e482 a6955d0811 8edf224e71 95442327a8 adbe75f371
      page 7's four, unchanged    e387ada36c 17dc01b122 a61f129179 b2eac9db5f

## A root is a cylinder cut off blunt

Three rounds of work on the root plate went to the roots' *paths* -- how
many leave, where they divide, how they snake -- and the complaint did not
move. It was never the paths.

Two things had to change before I could see it. The first was framing: I
had been judging trees in seven-panel contact sheets at a few hundred
pixels each, and then, when that failed, in close crops of one foot. Both
are useless. A crop cannot show a root's end, and the end is where the
fault is. `shots.cjs` now takes a radius of 0 to mean *frame the whole
shape from its bounding sphere* -- every root tip in the picture, or the
picture is thrown away. The second was colour: `f.whoAt` reports which
strand owns the surface at a place, and the viewer paints each strand its
own hue, so a pile of swellings can be told from one root's own flaring.

With the whole tree in frame the reading is plain. The roots are flat
straps, not cords; they end blunt, in rounded paddles; and they lie over
each other in layers. A strap that snakes is still a strap, which is why
every change to the paths left it alone.

`runs/024-section/section.js` cuts across each root at five stations,
ordered trunk to tip, and draws the sections at their true size with the
strand's girth circle behind them. Drawn, not scored -- but the numbers
beside them settle it. The girth, trunk to tip:

      root  8   .036 .030 .023 .031 .035      ends as thick as it began
      root 14   .072 .034 .034 .040 .026
      root 16   .054 .051 .020 .014 .018
      root 17   .046 .043 .031 .027 .033
      root 15   .114 .096 .030 .022 .016      the one clean taper

Four of five get fatter again near their far end. The cause is one line,
`trees.js` 120:

      (dives ? 1 : Math.pow(Math.min(1, (1 - g) / P.toe), 0.7) * (1 - P.tip) + P.tip)

With a ground, `dives` is true for nine roots in ten, so nine in ten get no
taper whatever: they hold their girth to the end, modulated only by the
`sinew` wave (17%) and the knuckle swells (55%), and stop. And `toe` at
0.13 means the tenth tapers over the last eighth of its run only -- flat,
then a cliff -- bottoming out at `tip`, a quarter of base girth.

That is a blunt club at the end of a near-cylinder, which is what reads as
a growth.

**Prediction, before the change.** Making the fall continuous over the
whole run and dropping the dive exemption will make the sections shrink
from trunk to tip and take the clubs off the ends. It will *not* fix the
flatness: the width-to-height of a section is set by the band's `wide` and
`high` in page 7, about 1.15 against 0.62, and no change to girth touches
it. I expect tapering straps.

### What the change did, against the prediction

The exemption is gone and `toe` and `tip` are swept. One tree, five roots,
girth at the tip over girth at the collar:

      toe   tip     median   worst   roots ending over .45 of base
      0.13  0.26     0.33    0.46    1 of 5      (the taper as it was, now reaching divers)
      0.4   0.26     0.26    0.33    0
      0.7   0.26     0.23    0.29    0
      1.0   0.26     0.24    0.27    0
      1.0   0.12     0.14    0.17    0
      1.0   0.05     0.09    0.11    0
      1.4   0.08     0.13    0.16    0

`tip` sets how thin the end is; `toe` sets how early the fall starts and
buys nothing past 1.0. The count of places where the girth rises along the
run barely moves across the whole table, which is right: those are the
sinew wave and the knuckle swells riding on the fall, and they are wanted.

Chosen from the pictures, not the table: **toe 0.7, tip 0.15**. Below that
the roots keep too little wood mid-run and read as fins; above it the ends
are still stubby.

The prediction held on both counts. The blunt ends are gone. The flatness
is untouched -- the sections are still about half again as wide as they are
tall, because that is what the band is.

**What surprised me.** Thinning the roots did not just fix the ends, it
uncovered a second mass. With fat roots the foot reads as a knot of legs
and there is nothing to notice; at `tip` 0.05 the roots are thin enough
that the foot behind them resolves into one smooth swollen dome. The dome
was always there. The fat roots were hiding it.

Colour by strand says what the dome is, and it is not an extra body. Each
hue runs unbroken from a branch tip, down the trunk, and out into a root:
one strand, the whole height of the tree. The foot is those same strands,
each laying down a band, splayed side by side where they turn from trunk
into root. There is no lump to take away. The mass *is* the bands being
wide, which is the same fault as the flatness seen from further off.

A third thing, noted and not yet chased: one strand's root leaves the trunk
sideways at mid-height and stops blunt in the air. A root above the ground.

**What broke.** Taking `(dives ? 1 : ...)` out took the brackets with it,
so `* (1 - P.tip) + P.tip` stopped being the taper factor and started
adding 0.26 to every girth -- a tenfold thickening on a root of 0.03. The
first sweep row was measuring that, and was reported before I caught it.
Retracted. This is the ninth time a one-line edit in this file has been
mangled by what surrounded it; the linter catches comments swallowing
braces but had nothing to say about a dropped parenthesis.

## The foot pinches where it should flare

Taking the roots' girth down uncovered a mass at the foot, and the mass is
not what it looked like from outside. `runs/025-flare/flare.js` cuts the
tree on a vertical plane through its axis and draws what is solid; a
companion sampling of horizontal slices gives the wood's area at each
height. As an equivalent radius, in trunk radii:

      at the ground           1.09
      0.2 to 0.7 R0 above     0.74 to 0.77     a waist
      1.76 R0 above           1.23             a bulge
      2.9 R0 above            0.84

The tree pinches at the ground and swells above it. A trunk is widest
where it meets the ground and narrows from there up; this is an onion on a
neck, with three to five roots radiating out of the neck. That is the
growth read at the scale of the whole base, and no change to a single
root's girth or to a band's width can reach it.

The cause is the collar term of the same `girth` line:

      P.grip * (1 + (P.collar - 1) * Math.pow(Math.max(0, 1 - far / P.flare), 1.6))

`flare` is 0.07 against a trunk radius of 0.27, and `ds` is 0.035. So the
multiplier falls from grip*collar = 1.2 to grip = 0.6 **in two steps**: the
trunk hands its whole section to the roots across a tenth of its own
radius, losing 64 percent of it on the way. Everything must neck there.
There is no buttress because the flare has no length to be a buttress in.

This is the ontology, not the drawing. A root does not begin at a line; a
trunk becomes roots over a distance, and that distance is about the trunk's
own width, not a thirtieth of it.

**Prediction, before the change.** Lengthening the flare to the order of a
trunk radius will take out the waist and the bulge above it, leaving the
base widest at the ground and narrowing upward. It will not touch the root
tips, which the taper already fixed, and it will not touch the flatness of
a band.

### The flare was not it. The tree is on stilts.

Lengthening the flare does not remove the waist or the bulge. It softens
the waist and makes the bulge **bigger**:

      flare  grip   equivalent radius at each 0.22 R0 up from the ground
      0.07   0.6    1.13 0.74 0.76 0.76 0.87 0.89 0.98 1.12 1.21 1.15 0.98
      0.2    0.6    1.13 0.76 0.72 0.88 1.03 1.27 1.36 1.36 1.29 1.25 1.09
      0.35   0.6    1.00 0.85 0.83 0.97 1.12 1.33 1.42 1.38 1.29 1.19 1.13
      0.6    0.6    1.15 0.99 1.05 1.20 1.38 1.49 1.55 1.53 1.47 1.31 1.08
      0.35   0.8    1.38 1.16 1.08 1.41 1.54 1.70 1.74 1.67 1.57 1.38 1.22

Not one of them is widest at the ground. The bulge sits at 1.3 to 1.5 R0
up and grows with the flare, which says the flare is being applied there
and not at the ground. So: where is the ground?

      ground surface under the foot   y = 0.000
      trunk base                      y = 0.380  = 1.90 trunk radii
      roots leave the trunk at        y = 0.35 to 0.46, 1.75 to 2.28 R0
      root tips                       y = -0.28, below ground

**The trunk begins nearly two trunk radii in the air.** `sprout` has
`p0 = [0, Q.perch * R0, 0]` with `perch` 1.9, so the tree is perched, and
every root leaves the trunk up there and runs down to the ground. The only
wood between the collar and the ground is the descending legs: that is the
waist. The collar's flare swells in mid-air: that is the bulge. A swollen
knot held above the ground on radiating legs is the growth read, and it is
why three rounds aimed at paths, counts and girths all missed.

The perch is a shape put in. It is there so the roots have somewhere
visible to be, which is the same reasoning that gives a hand-placed
profile, and the brief rules it out: every form has to come out of a rule.
What should lift a trunk off the ground is its own flare -- wood piling up
where it meets the ground -- not a number that holds it up.

Retracting the prediction above: lengthening the flare was the wrong
change, made on the wrong cause. The flare has no length worth having
*and* it is in the wrong place; the second is what matters.

**Prediction, before the change.** Bringing the perch down puts the collar
at the ground, so the flare swells where the tree meets the ground rather
than in the air. I expect the waist to go and the base to become widest at
the ground and narrow upward. What I am unsure of: at perch 0 the roots may
end up entirely buried and the foot may read as a post pushed into mud, in
which case what lifts the trunk has to come from the flare itself and the
flare's length becomes the next rule after all -- in the right place this
time.

### Down off the stilts

      perch 1.9   ground 1.10   waist 0.75   widest up the trunk 1.23
      perch 1.2   ground 1.07   waist 0.90   widest up the trunk 1.25
      perch 0.7   ground 1.28   waist 0.99   widest up the trunk 1.06

At 0.7 the equivalent radius runs 1.28 at the ground, 0.99 just above it,
then 0.84 to 0.90 up the trunk: widest where it meets the ground and
narrowing from there. The onion is gone.

The pictures agree, which they did not have to. In the four vertical cuts
the wood now reaches the ground in all four planes; before it stopped
short of it in two of them, and I had taken that for a cutting-plane
artefact. It was not. The trunk widens into a flare that stands on the
ground and the roots run out of the flare, instead of a knot in the air
with legs reaching down.

perch 0.3 and 0 are not evidence of anything: they grow no tree. `inside()`
in sprout requires every shoot to stay more than 0.12 clear of the ground,
so with `foot` 0.2 the trunk's base would start outside the region a shoot
may occupy. That 0.12 is a second number put in at the foot and an
absolute one, so it does not scale with the tree: the floor at 0.7 is its
doing, not the tree's. A smaller tree will hit it differently. Same class
of fault as the perch, and next.

**What this cost to find.** Three rounds went to the roots' paths, their
count, their snaking and their girth, and the complaint did not move,
because all of those adjust things hanging off a base whose geometry was
wrong. The ontology was: a trunk begins in the air at a given height, and
roots are what reach down from it. It should be: a trunk stands on the
ground, and what lifts it is its own flare.

**Still open**, and deliberately not folded into this: a band is about
1.25 rho across and 0.75 tall, so every root is a strap -- right for a
trunk, where a dozen bands wrap a bundle, wrong for a root, where the
strand is the whole body. And one strand's root still leaves the trunk
sideways at mid-height and stops blunt in the air.

### Both numbers gone: the tree starts on the ground

The second number was `inside()` in sprout: a shoot could not grow within
**0.12** of the ground. Absolute, so on a tree of half the girth it is
twice the bar, and it was what made perch 0.3 and 0 grow no tree at all in
the sweep above -- those two rows were measuring that, not the perch, and
are retracted as evidence. It is now `clear` times the trunk's own width,
0.6 x 0.2, the same 0.12 at the default size and scaling from here.

With that relative the perch has nothing left to do. `p0` sits on the
ground and the leader is let inside the clearance for its first stretch,
because a tree starts at the ground and has to climb out of its own flare.
Nothing else is let inside it. perch 0.7 -> 0.

      perch 1.9   ground 1.10   waist 0.75   widest up the trunk 1.23
      perch 1.2   ground 1.07   waist 0.90   widest up the trunk 1.25
      perch 0.7   ground 1.28   waist 0.99   widest up the trunk 1.06
      perch 0.3   ground 1.42   waist 0.89   widest up the trunk 0.95
      perch 0     ground 1.48   waist 0.94   widest up the trunk 1.12

At 0 the profile runs 0.77 below ground, 1.37, **1.48 at the ground**,
then 1.13 1.00 0.95 0.94 0.90 and holds near 0.90 up the trunk. Widest
where it meets the ground, narrowing from there, wood below the ground.
In the four vertical cuts the trunk now stands on the blue line in all of
them and widens into it.

So the whole of the root-plate complaint, three rounds of it, came down to
two put-in numbers at the foot: one that held the trunk in the air and one
that stopped anything growing near the ground. Neither was a rule. Both
are now either gone or expressed as a share of the tree's own size.

### Next: a band is a tile, and a root is not a tiled thing

With the base right, the straps are what is left. A band is about 1.25 rho
across against 0.75 tall. In a trunk a dozen bands wrap a bundle and that
width is correct. Where the strand IS the body -- a root, a lone twig --
the tile has nothing to wrap and lies there half again as wide as it is
tall.

`free` already says which case a band is in, and it is not a crown risk:
`far` is a strand's distance from the axis of the bundle it belongs to, so
in a trunk `free` is 0, along a root it is 1, and a branch of six strands
is still a bundle. The rule can be uniform. `cord` is the width when the
band covers the whole body; `cordAt` 0 restores the old behaviour exactly,
so the baseline in the sweep is the real one and not an approximation.

## The root plate was the ground, not the roots

Level ground had no soft channel. `softAt` is `G && G.soft && P.bury`, and
sprout hands grow `ground: Q.ground || level` where `level` is bare. So on
every tree not given a ground of its own, **no root could ever go under**.
They were pinned to the surface by construction, and a bundle of twenty
strands splaying open at the foot with nowhere to go but sideways is a
flat disc. That disc is the root plate.

Not the girth. Not the band width. Not the collar, the skirt, the elbow
fill or the trunk's profile. Each of those was adjusted on a hunch and
each turned out innocent; all are back at their old values, with the
reasoning kept:

      skirt       already clamped to nothing by neighbouring wood;
                  0 and 1 measure identically (33.1% against 33.2%)
      collar      1.0 changes nothing visible
      elbow fill  stopping it webbing roots changes nothing visible
      rise        empties the base rather than flaring it: a strand that
                  gives up its lower run takes that wood with it

What found it, after those four misses, was a transect: walk sideways from
a root's line and print what is there at each tenth of a trunk radius --
solid or not, which layer, which strand.

      strand 8 step 13, girth 0.29 R0:
      root/8 root/8 root/8 root/8 band/16 band/16 band/16 band/16
      root/16 root/8 root/8 root/8 band/8 band/8 band/8 band/16 ...

The wood runs unbroken for 2.4 trunk radii and belongs to a dozen strands
in turn. Each band is its own girth wide and no more. Strands 15 and 16,
measured the same way, are 0.1 R0 of their own wood on girths of 0.07 and
0.10. **The bands were never wrong.**

That also kills one more of my measures. "Widest single band 4.9x its
girth" took the furthest point owned by a strand anywhere along the ray,
not its contiguous width -- and ownership alternates. Strand 8's own band
is 0.3 R0 on a girth of 0.29 R0: 1.0x, exactly right. Retracted.

      level ground is soil, and soil can be dug: level.soft = () => 1
      bury 0 -> 1.5

      bury 0     a flat plate, two strands' wedges spread across the foot
      bury 1.0   the plate shrinks, some roots still lying on it
      bury 1.4   a flaring base, roots arching out and diving under
      bury 1.8   tighter, slightly less root showing
      bury 2.1   the plate is gone and so are the roots: a post in soil

1.5 keeps the roots declaring themselves while the plate goes.

### On measures, for the fourth time

Four measures in this round answered questions I was not asking: wood in a
wide disc (counts roots running through the slice as trunk), trunk-body
profile (right about the trunk, and the trunk was never the problem), the
furthest-owned-point width (ownership alternates), and the flare sweep
(invalidated by the stilt it was measured on). Each gave a clean table.
The picture was right every time and I argued with it four times.

The rule I keep relearning, now stated as sharply as I can: **a measure is
a claim about where the fault is, and if that claim is wrong the number
will be clean.** The way out is not a better number but a reading that
cannot be aggregated -- what is at this place, and whose is it.

## Better roots: fewer, heavier, and the buttress climbs

`feet` 8 -> 5, `roots` 0.9 -> 1.1. The foot was too solid and the roots
too slight to show once clear of it; plate.js and the picture agreed for
once, fill 0.249 to 0.254 against a healthy 0.17 to 0.23. Eight roots'
worth of collar wood crowded into one place is what filled it, and each
root was then too thin to read by the time it left.

      A  roots 1.4, feet 8             longer, still lost in the base
      B  roots 1.1, feet 5             long arms reaching, arching,
                                       diving; a tighter base. Taken.
      C  roots 1.4, feet 5, grip 1.2   massive trunk, blocky base, roots
                                       breaking into disconnected chunks

      leaving   6 to 7 (3 wires)  ->  4 to 5 (1 to 2 wires)

### What the apron was

The flat apron under the trunk survived the skirt, the collar, the elbow
fill and `rise` -- four guesses, four misses. Colouring by layer settled
it in one render: it is **red, layer 6, root bands**. Five roots' collars
merging into a low ring round the trunk, with the roots running out of
it. That is a root flare and it is right; what is wrong is its
proportion. It spreads sideways and barely rises.

A buttress climbs. The height boost at the collar was 1.1 at most, on a
band 0.62 rho tall, so the fin stood a fraction of a trunk radius proud
of the ground and read as a shelf. 3.2 now, so the collar is a wall of
wood going up the trunk rather than a skirt lying round it.

**Noted, not chased:** a broad blue patch in the layer view is bark
covering one whole face of the trunk, which is not what bark should read
as. Separate from the roots.

## The ground was lying on top of the evidence

The viewer's floor was opaque, so every judgement in this thread was made
with half the root system hidden under a disc. `soil` takes the floor
away and colours what is beneath it: buried wood cold and dark, wood in
the air its own colour. Nothing about the tree changes.

One render with it found the fault that had defeated everything else.

      hug = rad * (legHug - P.bury * sf - ...)

**Burying was measured in root radii, not depth.** A root of radius 0.03
at `bury` 1.5 went down 0.045 units. Every root skimmed the surface with
only its underside beneath it, and the whole root system was a shallow
disc lying in the ground plane. That is why the base kept reading flat
whatever was done to girth, band width, collar, section or count: none of
them can move a root pinned to within its own thickness of the surface.

A depth in the ground is a depth in the ground, measured against the
trunk's radius, which is the tree's own scale.

      bury 1.5 (root radii) -> 0.6 (trunk radii)

      0.3   roots still shallow, the descent barely reads
      0.6   out, then down; the descent reads as travel
      1.0   near-vertical plunges, ending abruptly: crab-like

The depth alone emptied the foot, because roots now leave the ball
downward instead of spreading inside it:

      grip 1.0, before the depth fix   fill 0.234 to 0.288   4 flagged
      grip 1.0, after                  fill 0.226 to 0.256   1 flagged
      grip 0.9, after                  fill 0.179 to 0.224   none

### Retracted: the buttress rule added wood

I justified it as moving wood rather than adding it, then changed its
numbers twice without re-checking that claim. At 0.88 width by 2.2 height
by 1.7 depth the section is nearly double. plate.js caught it -- fill
went from 2 flagged to 4 -- which is the first time in this session a
measure corrected me rather than the reverse. Back to 0, kept in the code
with the finding.

Also overshot twice in opposite directions before that: at a 1.1 height
boost the collar was a shelf, at 3.2 it was thin wavy fins. Both because
the narrowing stayed at 0.55 of the cord while only the height moved, so
every bit of height bought thinness.

### Where the roots are now

      feet 8 -> 5, roots 0.9 -> 1.1, grip 1.0 -> 0.9, bury in trunk radii

      leaving     6 to 7 (3 wires)  ->  4 to 5 (2 wires)
      fill        0.249 to 0.254    ->  0.179 to 0.224, none flagged
      girth       .163 .083 .048 .024 .014 along a root
      section     every root a fin on edge, 0.29 to 0.88 across over up

Still open: ~0.2% of wood adrift in about 50 specks, mostly buried root
tips and long-standing; root 17 runs buried inside another root's body;
bark covers one whole face of the trunk; pages 10 and 11 and the other
page-9 trees have not been looked at since any of this.

### The sheets at the base are load-bearing

The flat sheets are cream in the layer view: layer 0, trunk bands, not
roots. And the band-width rule had a flaw of its own. It decided
tile-versus-cord from `far`, a strand's distance from its bundle's axis,
which cannot tell a strand WRAPPING a bundle from one that has dispersed.
In the trunk `far` is large because the strand rides the bundle's edge --
tile. At the foot `far` is large because the strands have splayed apart
-- the opposite -- and the rule handed every one of them a wide tile.

Asking it directly instead, by the gap to the nearest other strand, is
the right question and gives a worse tree: **the base shreds**, a torn
region where the surface has come apart. Those wide tiles are what holds
the foot together as one body. Narrow them and the dispersed strands stop
overlapping and leave gaps.

So the sheets are not gratuitous, and this is not a drawing fault to be
tuned away. The strands disperse at the foot and still have to make one
surface; wide tiles are how. Reverted (`byNeighbour` 0), kept in the code
with the finding, because the next person to look at those sheets will
have the same idea I did.

The honest fix is further back: the strands should not disperse at the
foot at all. That is the `feet` family design, and it is a bigger change
than anything in this round.

## Reverted to b47ef12

Everything in trees.js and the page files since `b47ef12` is reverted.
Days of work on the roots made them worse, not better: a bulging foot
spilling into bulging roots, which is the fault that was being complained
about at the start of it.

What went wrong, so it is not repeated:

**The test case was degenerate.** Page 9's trees stand on `level`, a flat
plane going on forever. Nearly every rule that makes a root interesting
here is a rule about answering to ground -- seams, lips, nooks, the bite,
going without where another body is ahead, gripping an edge. On a
featureless plane none of them fire, and what is left is a root lying
down. I read that as a fault and invented rule after rule to fix it:
collar, skirt, elbow fill, band width, an edgewise buttress section, a
heave, roots leaving at their own height. Four were tried and reverted.
The flat sheets at the foot turned out to be load-bearing. Meanwhile the
trees on real ground -- page 11's cliffs, boulders, cracked rock -- were
fine the whole time and I never once looked at them.

**And the method was wrong.** Work was fired off in the background and
picked up later with the reasoning cold, so four rules in a row were
changed on a hunch rather than on evidence, and each miss cost a full
render cycle to discover.

Kept, because they are tools and not rules:

      runs/024-section   cuts across a root, drawn at true size
      runs/025-flare     the foot on a vertical plane
      runs/026-whole     is the organism one body
      runs/021-girth     the linter, which had the bug it was written to
                         catch: it returned early when the code before a
                         comment ended in `;`, which is the shape of all
                         nine accidents
      sketchbook9.html   colour by layer and by strand, and `soil`, which
                         takes the floor away and colours buried wood --
                         an opaque floor hides the half of a root system
                         the work is about

Two real bugs were found and are lost in the revert, because at b47ef12
the code they are in never runs (`bury` is 0 and level ground has no soft
channel). Recorded here so they can be put back if that changes:

      the burying term, and the vertical wave on a root's run, are both
      scaled by the ROOT's own radius rather than a depth, so a root of
      radius 0.03 descends 0.045 and undulates by 0.01. Nothing can move
      a root off the plane while that is true.

### The bulging foot was the invariant, broken again

`b47ef12` raised `grip` 0.5 -> 0.6 and left `collar` at 2, so the product
went to 1.2. Line 68 of trees.js says what that means: "`collar` x `grip`
is about 1: the two are set together." Every root left the trunk a fifth
over its share, and that is the bulging trunk floor spilling into bulging
roots.

This is the third time through that door. The round that fixed the huge
girths broke it the same way (0.8 x 2 = 1.28) and recorded the lesson
directly under the comment; `b47ef12` did it again at a smaller size
while I was looking at root COUNT and not at girth at all.

      grip 0.6, collar 2       worst ring share 0.48
      grip 0.6, collar 1.667   worst ring share 0.45
      grip 0.5, collar 2       worst ring share 0.37

Raising the collar alone barely moves it: the collar acts over `flare`,
the first 0.07 of a run, and the loaded rings are past it. The ring
shares are `grip`. So the approved pair is restored exactly -- grip 0.5,
collar 2, product 1 -- and every site is at or under 0.37 against the
round's own standard of 0.40.

Noted for the next round: the paste of that round also records that the
edgewise section was already tried and rejected -- "at a root's girth,
with the surface smoothed as it is, a near-square section reads as a
tube... The section wasn't the thing. The length of the faces, and
whether they touch the ground, were." I re-derived and re-ran that whole
experiment this session without reading back.

### Snaking: it is the swing flipping, not the swing being stronger

The open request from the girth round -- "the roots need more turns, or
at least some of them, it really has to snake" -- was still untouched.

The machinery was already there. At each knuckle a nine-way fan of angles
is scored, `P.snake` biases the turn toward the hand the root is
currently swinging to, `P.kink` penalises going straight, and `hold`
decides how often that hand changes.

Raising `snake` is the obvious move and it is wrong: it pushes every
corner the same way, so the root **corkscrews**. At 1.8 the roots coil
round the trunk in a tight spiral instead of spreading. Snaking is turns
that ALTERNATE, which is `hold`, and `hold` was hardcoded.

`swap` scales it, 1 being what it was. At 0.4 the swing changes hand
about twice as often: on the cliff a root zigzags down the face, and on
the boulder the tree straddles the rock on bent kinked legs that grip
over it and reach the ground.

Path only, so the girth budget should not move, and it does not -- worst
ring share across the nine trees 0.36, against 0.37 before and the
round's standard of 0.40.

### The bulging foot: one family swallowing a third of the tree

Two sites, same code, one acceptable and one not -- the boulder passable,
the cliff edge still spilling. A controlled pair, and far better evidence
than anything the flat-plane chase produced.

The foot probes could not see it: fill 0.190 against 0.170, both well
inside the flag. Colour by layer could. The mass at the cliff's foot is
red -- layer 6, root wood -- and it is ONE continuous lobe, with the
trunk ending at a ragged edge above it. Not several roots merging.

The girths say the same:

      cliff edge   collar girths, in trunk radii   0.57 0.29 0.26 0.25 0.16
      boulder                                      0.33 0.29 0.25 0.24 0.23 0.19 0.15

One root at nearly twice the next. And it is not a drawing fault: a
family of five strands out of eighteen must carry a third of the trunk's
section, and sqrt(5/18) x R0 is 0.53. The pipe model is doing exactly
what it should. The fault is that one family got five.

      wt = Array.from({ length: P.feet }, () => Math.pow(0.1 + rd(), P.rank))

At `rank` 2.6 that is a spread of about 500 to 1, so a family can swallow
a third of the strands. The boulder simply drew more even weights, which
is the whole of why it reads better.

      rank 2.6   0.57 0.29 0.26 0.25 0.16          biggest/next 2.0
      rank 1.8   0.46 0.32 0.29 0.27 0.25          1.4
      rank 1.2   0.39 0.36 0.33 0.29 0.27 0.12     1.1, hierarchy gone

`rank` 1.8. It keeps a clearly dominant root -- which is the hierarchy
that was asked for -- without one that has to be a lobe. Worst ring share
0.34, inside the 0.40 standard.

`carry` was added while chasing this and does nothing for it: the
family's share is weighted (k/root)^carry, which is 1 at the collar
whatever the exponent, so the collar girth moves 0.57 to 0.59 across the
whole range. Left in at 1.5, the old value.
