import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Plan from "../memo/plan.js";
import Tiers from "../map/tier.js";

const jobs = new Map();
const guards = new Map();
const shield = new Map();

let frontier;
let perimeter;

export default class GuardPerimeterStalkerMission extends Mission {

  run() {
    if (Plan.WallNatural) return;
    if (!Tiers.length) return;
    if (!frontier) frontier = Tiers[0];
    if (!perimeter) perimeter = Tiers[0];

    const skip = new Set();
    let border = Tiers[0];

    for (const tier of Tiers) {
      let guarded = 0;

      for (const zone of tier.zones) {
        if (zone.threats.size) {
          skip.add(zone);
        } else {
          const guardUnit = getGuardUnit(zone);

          if (guardUnit) {
            const knownShield = (guards.get(zone) === guardUnit) ? shield.get(zone) || 0 : 0;
            const currentShield = guardUnit.armor.shield;

            if (currentShield >= knownShield) {
              guarded++;

              if (!guardUnit.type.isWarrior) {
                skip.add(zone);
              }
            } else {
              skip.add(zone);
            }

            guards.set(zone, guardUnit);
            shield.set(zone, currentShield);
          } else if (zone.tier.level <= perimeter.level) {
            guarded++;
          }
        }
      }

      if (guarded < tier.zones.size) {
        frontier = tier;
        break;
      }

      border = tier;
    }

    for (const tier of Tiers) {
      if ((tier === border) || (tier === frontier)) {
        openGuardJobs(tier, skip);
      } else {
        closeGuardJobs(tier);
      }
    }

    perimeter = border;
  }

}

class Guard extends Job {

  constructor(zone, priority) {
    super("Stalker");

    this.zone = zone;
    this.station = zone.isDepot ? zone.exitRally : zone;
    this.priority = priority;
    this.details = this.constructor.name + " " + zone.name;
    this.isCommitted = false;
    this.isGuard = true;
  }

  execute() {
    if (isSamePosition(this.assignee.body, this.station)) {
      this.isStationed = true;
    } else if (!isCloseTo(this.assignee.body, this.station)) {
      this.isStationed = false;
    }

    if (!this.isStationed) {
      orderMove(this.assignee, this.station);
    }
  }

}

function getGuardUnit(zone) {
  const job = jobs.get(zone);

  if (job && job.isStationed && job.assignee && job.assignee.isAlive) return job.assignee;

  for (const building of zone.buildings) {
    if (!building.isAlive) continue;

    if (isSamePosition(building.body, zone)) return building;
    if (zone.isDepot && isSamePosition(building.body, zone.exitRally)) return building;
  }
}

function openGuardJobs(tier, skip) {
  const priority = 80 - tier.level;

  for (const zone of tier.zones) {
    const job = jobs.get(zone);
    const shouldOpenJob = !skip.has(zone);

    if (job) {
      if (!shouldOpenJob) {
        job.close(true);
        jobs.delete(zone);
      } else if (job.assignee && !job.assignee.isAlive) {
        job.assignee = null;
      }
    } else if (shouldOpenJob) {
      jobs.set(zone, new Guard(zone, priority));
      shield.set(zone, 0);
    }
  }
}

function closeGuardJobs(tier) {
  for (const zone of tier.zones) {
    const job = jobs.get(zone);

    if (job) {
      job.close(true);
      jobs.delete(zone);
    }
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !pos) return;
  if (!warrior.order.abilityId && isSamePosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) < 3) && (Math.abs(a.y - b.y) < 3);
}
