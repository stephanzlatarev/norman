import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Build from "../jobs/build.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

const guards = new Map();
const perimeter = new Set();
let pylon;

export default class DeployTroopsMission extends Mission {

  run() {
    closeDeadGuardJobs();
    determinePerimeterZones();
    createGuardJobs();
    createPylonJob();
  }

}

class Guard extends Job {

  constructor(zone, priority) {
    super("Stalker");

    this.summary = "Guard " + zone.name;
    this.priority = priority;
    this.zone = zone;
    this.shield = 0;
  }

  execute() {
    const stalker = this.assignee;

    if ((stalker.zone.enemies.size > stalker.zone.warriors.size) || (stalker.armor.shield < this.shield)) {
      // Retreat to a safe zone
      const safe = findSafeZone(stalker.zone);

      if (safe) {
        orderMove(stalker, safe);
      }
    } else if (stalker.zone.enemies.size) {
      orderAttack(stalker, this.zone);
    } else {
      orderMove(stalker, this.zone);

      if (isSamePosition(stalker.body, this.zone)) {
        perimeter.add(this.zone);
      }
    }

    this.shield = stalker.armor.shield;
  }

}

function closeDeadGuardJobs() {
  for (const [zone, guard] of guards) {
    if (guard.assignee && !guard.assignee.isAlive) {
      guards.delete(zone);
    }
  }
}

function determinePerimeterZones() {
  for (const zone of Zone.list()) {
    if (zone.isCorridor) continue;

    if (zone.enemies.size > zone.warriors.size) {
      perimeter.delete(zone);
    } else if (zone.buildings.size) {
      perimeter.add(zone);
    }
  }
}

function createGuardJobs() {
  for (const zone of Zone.list()) {
    if (zone.isCorridor) continue;

    const guard = guards.get(zone);

    if (isBorderZone(zone)) {
      const priority = 80 - zone.tier.level;

      if (guard) {
        guard.priority = priority;
      } else {
        guards.set(zone, new Guard(zone, priority));
      }
    } else if (guard) {
      guard.close(true);
      guards.delete(zone);
    }
  }
}

function createPylonJob() {
  if (pylon) {
    if (pylon.isFailed || pylon.isDone) {
      pylon = null;
    } else {
      // A pylon is already being built
      return;
    }
  }

  if ((Resources.minerals < 100) || (Resources.supplyUsed < 197)) return;

  let pos;

  for (const zone of perimeter) {
    if (!zone.buildings.size && !isBorderZone(zone)) {
      pos = zone.isDepot ? zone.exitRally : zone;
      break;
    }
  }

  if (pos) {
    pylon = new Build("Pylon", pos);
    pylon.priority = 80;
  }
}

function isBorderZone(zone) {
  if (zone.buildings.size) return false;

  for (const corridor of zone.corridors) {
    if ((corridor.zones.length === 2) && (perimeter.has(corridor.zones[0]) !== perimeter.has(corridor.zones[1]))) return true;
  }
}

function findSafeZone(zone) {
  let safe = zone;

  for (const corridor of zone.corridors) {
    for (const neighbor of corridor.zones) {
      if (neighbor.tier.level < safe.tier.level) {
        safe = neighbor;
      }
    }
  }

  return safe;
}

function orderAttack(warrior, pos) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;

  if (
    (warrior.order.abilityId !== 23) ||
    (warrior.order.targetWorldSpacePos && !isSamePosition(warrior.order.targetWorldSpacePos, pos)) ||
    (warrior.order.targetUnitTag && isFarFrom(warrior.body, pos))
  ) {
    new Order(warrior, 23, pos).accept(true);
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !pos) return;
  if (isCloseTo(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}

function isFarFrom(a, b) {
  return (Math.abs(a.x - b.x) >= 20) && (Math.abs(a.y - b.y) >= 20);
}
