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
