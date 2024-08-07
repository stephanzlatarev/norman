import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import frontline from "../battle/frontline.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

export default class BattleTargetMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      if (!zone.battle) continue;

      if (zone.battle.mode === Battle.MODE_FIGHT) {
        setFightTargets(zone.battle);
      } else if (zone.battle.mode === Battle.MODE_SMASH) {
        setSmashTargets(zone.battle);
      }
    }
  }

}

function setFightTargets(battle) {
  const stations = frontline(battle, getThreats(battle));
  const targets = getTargets(battle.zone);

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      fighter.direct(getClosestVisibleTarget(warrior, targets), getClosestStation(warrior, stations));
    }
  }
}

function getThreats(battle) {
  const threats = [];

  for (const zone of battle.zones) {
    for (const threat of zone.threats) {
      // TODO: Add spell casters and later air-hitters
      if (threat.type.damageGround) {
        threats.push(threat);
      }
    }
  }

  return threats;
}

function getTargets(zone) {
  const targets = [];

  for (const threat of zone.threats) {
    // TODO: Add spell casters and later air-hitters
    if (threat.type.damageGround) {
      targets.push(threat);
    }
  }

  return targets;
}

function setSmashTargets(battle) {
  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior) {
      fighter.direct(getClosestVisibleTarget(warrior, battle.zone.threats));
    }
  }
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
  let closestDistance = Infinity

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

function getClosestStation(warrior, stations) {
  let closestStation;
  let closestDistance = Infinity

  for (const station of stations) {
    const distance = calculateSquareDistance(warrior.body, station);

    if (distance < closestDistance) {
      closestStation = station;
      closestDistance = distance;
    }
  }

  return closestStation;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
