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
