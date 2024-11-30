import Battle from "../battle/battle.js";
import Resources from "../memo/resources.js";

const MARCHING_DISTANCE = 1;

export default function(battle) {
  if (battle.mode !== Battle.MODE_MARCH) return;

  let sum = 0;
  let count = 0;

  for (const fighter of battle.fighters) {
    if (!fighter.assignee) continue;
    if (!fighter.marching) continue;
    if (Resources.loop - fighter.marching.loop > 3) continue;

    sum += fighter.marching.distance;
    count++;

    if (!battle.marchingDistance) {
      fighter.marching.isLeader = true;
    }
  }

  if (count) {
    battle.marchingDistance = (sum / count) + MARCHING_DISTANCE;
  } else {
    battle.marchingDistance = 0;
  }
}
