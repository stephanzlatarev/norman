import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

export default class BattleTargetMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (!zone.battle) continue;

      if (zone.battle.mode === Battle.MODE_FIGHT) {
        setFightTargets(zone.battle);
      } else if (zone.battle.mode === Battle.MODE_SMASH) {
        setFightTargets(zone.battle);
      }
    }
  }

}

function setFightTargets(battle) {
  const targets = battle.zone.threats;
  const primaryTargets = getPrimaryTargets(targets);

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      fighter.direct(getClosestVisibleTarget(warrior, primaryTargets) || getClosestVisibleTarget(warrior, targets));
    }
  }
}

function getPrimaryTargets(threats) {
  const targets = [];

  for (const threat of threats) {
    // TODO: Add spell casters and later air-hitters
    if (threat.type.damageGround) {
      targets.push(threat);
    }
  }

  return targets;
}

//Assign targets with focus fire
//TODO: Make sure fighters do not change targets unless necessary
//TODO: Group warriors on targets for focused fire
//TODO: Don't group more warriors on targets than needed for a single shot kill
//TODO: Prefer instant kills (damage >= health)
//TODO: Prefer lower health (min health)
//TODO: Prefer enemy with higher DPS
//TODO: Prefer attack which concentrates higher warrior DPS
//TODO: Prefer cast spellers with large impact
function getClosestVisibleTarget(warrior, targets) {
  let closestTarget;
  let closestDistance = Infinity;

  for (const target of targets) {
    if (!target.isAlive || (target.lastSeen < Resources.loop)) continue;
    if (target.body.isGround && !warrior.type.damageGround) continue;
    if (target.body.isFlying && !warrior.type.damageAir) continue;

    const distance = calculateSquareDistance(warrior.body, target.body);

    if (distance < closestDistance) {
      closestTarget = target;
      closestDistance = distance;
    }
  }

  return closestTarget;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
