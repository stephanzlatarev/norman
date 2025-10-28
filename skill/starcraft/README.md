
# Strategy

The strategy of playing StarCraft II is as follows:

## Deployment outreach

Continuously determine the deployment outreach based on our economy strength and the percieved balance between own and enemy forces.
The game goes through the following states of deployment outreach:

### Starter

Build economy and production facilities at the start of the game.

Send a probe to scout the enemy base.

### Survival

Enemy creates proxies in the home base or attacks before the home base is properly walled off.

Defend within the home base against extreme enemy rush.
Pull probes to support the warriors.
Produce stalkers when there are at least 2 zealots and we have enough minerals and gas for the stalker.

### Siege defense

Overwhelming enemy attack is imminent.

If on only one base, then defend the home base behind walls against enemy rush.

Otherwise, defend the largest defendable perimeter with all warriors.
Abandon exposed outposts if necessary.
Only workers and hallucinations may scout outside perimeter.

### Normal defense

Station warriors in economy perimeter.

Use scouts to watch approaches.
Use hallucinated phoenixes to see deep in enemy territory.

### Push expand

Secure the next outpost with the intent to build a new base.

If the outpost is the natural expansion location and was under siege or facing multiple enemy waves, then secure the natural.
Build shield battery at the natural expansion.
Keep main army ready to return behind home base walls.

Use scouts to watch enemy lines.
Use hallucinated phoenixes to see deep in enemy territory.

### Probing attacks

Freely expand as necessary.

Test enemy lines for weaknesses and keep main army near the newest expansion and ready to defend bases.

Use scouts to distract enemy forces and harrass worker lines.

### Normal offense

Create multi-pronged attacks on weakest enemy zones with the intent to build forces and upgrade technology.

Use scouts to detect enemy movements.

Freely expand as necessary.

### Full offense

When maxed out, create aggressive attacks with the intent to rotate forces into more powerful army composition.

Use scouts to detect enemy movements.

Occupy as many expansion locations as possible by building new base buildings.

## Zoning

Zone the map to set the boundaries of the effective deployment outreach.

Model zones of the map in memory in layered perimeters:

- harvest perimeter - own harvest lines
- economy perimeter - own production structures
- outpost perimeter - selected zones for expansion
- approach perimeter - neighboring zones to own harvest, economy, outpost; needs monitoring
- defense perimeter - challenged neighboring zones; close zones with non-warrior enemy presence
- offense perimeter - zones with enemy warrior presence
- enemy perimeter - zones with enemy harvest lines

## Harvest

Harvest minerals and vespene as much as possible within the limits of the effective deployment outreach

- Use jit mining to harvest minerals with up to 5 workers per pair of minerals
- Continuously train probes within the limits in memory when the active nexuses are not saturated
- Build pylons when reaching the supply limit
- Build assimilators on free geysers when reaching the saturation for the active mineral fields and assimilators
- Build nexuses within the limits in memory when reaching saturation for the active nexuses

## Production

Manage production to support the effective deployment outreach

- Model target army composition based on the percieved balance between own and enemy forces - priority and limit in memory per unit type
- Build technology and production structures to meet the needs of the target army composition
- Continuously train army units within the limits in memory

## Combat

Coordinate battles and harassment missions with aggression levels depending on the effective deployment outreach

- Maintain an ordered list of battles by priority. Battles may be front attacks with may combat units or harrassment missions with a few specialists.
- Assign the required warriors to the battles by priority. Direct battles according to the balance between deployed own forces and anticipated enemy forces.
