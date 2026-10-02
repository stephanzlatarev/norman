# Combat: Hotspots and Battles

The combat skill decides where the bot fights and manages each fight. It works
with two concepts — hotspots and battles — over a graph of map zones.

## The map

The map is a graph of zones. Base zones (depots and halls) are connected through
corridor zones. Each zone has a perimeter level (distance from home) and an alert
level (how threatened it is), and links to its neighbours as forward (away from
home) and backward (toward home).

## Hotspots and battles

- A **hotspot** is a transient, per-frame judgement about a single zone under
  threat. Hotspots are recomputed every frame and own no units.
- A **battle** is a persistent engagement. It survives across frames and owns the
  fighters committed to it, a detector when one is needed, the stations where
  fighters hold, and its own mode and priority.

Each frame the hotspots are recomputed, a subset is selected, and the selected
hotspots are mapped onto the battles. Mapping gives continuity: a battle keeps
its fighters when a matching hotspot is found, is created when none exists, and
is closed when no hotspot maps onto it.

## Identifying hotspots

A zone is a hotspot candidate when it is a base zone (depot or hall) and its
alert level has reached the red threshold. Candidates are found by sweeping
outward from home along forward links; the sweep stops at the first serious
engagement on a branch, so the bot engages the nearest resistance rather than
reaching past it.

The deployment posture shapes the set:

- **Home-base / siege defense.** Only the home base is a hotspot.
- **Defense.** Hotspots outside the defensive perimeter are pulled back to a base
  zone on the same route inside it; if none remain, an outer-perimeter zone is
  held.
- **Offense.** If no serious engagement exists, the enemy base is targeted.

Each hotspot has a **front** zone (what it is centred on) and a **rally** zone
(where fighters gather, found by walking back toward the nearest base; an
*enforced* hotspot backed by a shield battery holds its own zone instead). Its
ordering value ranks hotspots closer to home ahead of those further out.

## The areas of a hotspot

A hotspot is described by three nested areas, each a union of circles, built from
its zone, its rally, and where our warriors are:

- **Protect area.** A circle enclosing the hotspot's zone — the ground we defend
  or attack.
- **Engage area.** The protect circle plus a chain of link circles along the
  route to the rally, each widened by a close-combat buffer. Our warriors operate
  within it: a warrior inside is **deployed**, and enemy non-warriors inside are
  **contacts**.
- **Threat area.** The engagement area, extended by a close-combat buffer around
  each warrior at its edge (warriors deeper inside do not extend it). Enemy
  warriors inside are **threats**. Because it follows our forward warriors, the
  threat area reaches enemies that can engage our leading units.

Only units in the horizon sectors along the route from the front to the rally
are tested against the areas, which bounds the per-frame work.

## Own units in a hotspot

Our warriors inside the engagement area are the hotspot's **deployed** warriors,
and the set is carried to the battle. A warrior assigned to the battle but
outside the engagement area is still **rallying**. The deployed warriors also
shape the threat area, and a warrior near the zone provides the visibility needed
to judge the zone empty.

## Enemy units in a hotspot

A hotspot records two lists: **threats** (enemy warriors in the threat area) and
**contacts** (enemy non-warriors in the engagement area). From these it is
classified:

- **Empty.** No enemies present and a warrior is close enough to confirm it.
- **Air.** Threats are airborne with no ground threat.
- **Small.** Only a few ground-damaging, non-worker enemies, none of them strong
  (siege tank, immortal, battlecruiser, bunker, shield battery).
- **Cleanup.** Only harmless, immobile enemies.
- **Trench.** A static defensive enemy (bunker, photon cannon, shield battery).
- **Intercept.** A small engagement that is neither trench nor cleanup.
- **Normal.** A real engagement — not a mission and not empty. The enemy base,
  when not empty, is always normal.

Cleanup and intercept hotspots are **missions** — side objectives distinct from
the main fight.

## Selecting hotspots

Selection reduces the candidates to those the bot commits to, from
closest-to-home outward:

- **Normal** engagements are always selected.
- **Trench** engagements are selected only when no normal, non-trench engagement
  is available.
- **Mission** engagements are selected up to a budget that scales with army size
  (zero in defensive postures).
- Other hotspots (such as empty ones) are kept.

One selected hotspot is the **focus** — the engagement the main army commits to,
normally the closest normal engagement. Under **draw-back**, if the focus's rally
is itself a hotspot, the focus is pulled toward home so the army consolidates at
the nearer fight rather than overextending.

## Mapping hotspots onto battles

Selected hotspots are matched to existing battles, in order of preference: a
battle on the same zone; a battle one step back on the same route; a battle on a
neighbouring zone; otherwise a new battle. A battle with no matching hotspot is
closed.

Mapping transfers to the battle its front and rally zones, ordering value,
classifications, threats and contacts, deployed warriors, and areas. The battle
fights from these lists directly; the front and rally zones also place where
warriors rally and station. Battles are prioritised by their ordering value,
closer battles higher. Each enemy belongs to the hotspot whose area contains it,
and counts in full for that battle.

## Strength and balance

Each battle tallies strength over its threats and warriors:

- **Enemy strength** sums the threats' army health and damage (non-worker,
  ground-damaging units), with special handling for immortals (extra damage and
  effective health, as they counter the main unit) and shield batteries (a large
  health pool).
- **Own strength** sums the health and damage of assigned warriors — as
  **recruited** (every assigned warrior, wherever it is) and **deployed** (only
  those inside the engagement area).

The **balance** is own strength over enemy strength, boosted when a shield
battery backs the front. The deployed balance drives the battle's behaviour.

## How a battle behaves

A battle moves through modes based on its deployed balance and posture:

- It begins watching; mission battles go straight to smashing harmless targets.
- While building strength, or preparing a defense or ambush, it rallies.
- When strong enough it marches, then fights on reaching firing range (or inside
  friendly territory).
- When the balance drops below a retreat level it rallies again, with hysteresis
  so an ongoing fight is not abandoned on a brief dip.
- It fights anyway in a small skirmish where warriors outnumber the enemy, and
  when standing ground to defend its bases (most readily the home base and
  natural, and when backed by a shield battery).
- When the army is maxed out, the focus battle commits once the bulk of its
  fighters have gathered.
