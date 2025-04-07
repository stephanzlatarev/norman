import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Zone from "../map/zone.js";
import { ActiveCount } from "../memo/count.js";
import { VisibleCount } from "../memo/encounters.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

const COST_GUARDIAN_SHIELD = 75;
const COST_HALLUCINATION = 75;
const TWO_MINUTES = 22.4 * 60 * 2;

// TODO: Maintain up to 2 hallucinated phoenixes at a time for better map coverage
// TODO: Create scouts when visible enemies are only at tier 2 or higher
// TODO: Maneuver the scout in zones where there are enemies that can shoot air
export default class ScoutFlyby extends Mission {

  jobCreateScout = null;
  jobScoutFlyby = null;

  run() {
    // Update last scout time for all zones
    for (const zone of Zone.list()) {
      if (zone.warriors.size || zone.buildings.size) {
        zone.lastScoutTime = Resources.loop;
      } else if (!zone.lastScoutTime) {
        zone.lastScoutTime = 0;
      }
    }

    // Check if job to create scout is closed
    if (this.jobCreateScout && (this.jobCreateScout.isDone || this.jobCreateScout.isFailed)) {
      this.jobCreateScout = null;
    }

    // Check if job to fly by is closed
    if (this.jobScoutFlyby && (this.jobScoutFlyby.isDone || this.jobScoutFlyby.isFailed)) {
      this.jobScoutFlyby = null;
    }

    // When there is no active scout then create job to create it
    if (!this.jobScoutFlyby && !this.jobCreateScout) {
      const sentry = selectSentry();

      if (sentry) {
        this.jobCreateScout = new CreateScout();
        this.jobScoutFlyby = new Flyby();

        this.jobCreateScout.assign(sentry);
      }
    }

    // Ensure the flyby job is assigned. The scheduler won't do it as hallucinations are not considered warriors
    if (this.jobScoutFlyby && !this.jobScoutFlyby.assignee) {
      for (const unit of Units.hallucinations().values()) {
        if (!unit.job) {
          console.log("Hallucinated phoenix", unit.nick, "starts flyby scouting");

          this.jobScoutFlyby.assign(unit);
          break;
        }
      }
    }
  }

}

class CreateScout extends Job {

  order = null;

  constructor() {
    super("Sentry");

    // Make sure the scout is kept busy until the scout is created
    this.priority = 100;
    this.isBusy = true;
  }

  execute() {
    const sentry = this.assignee;

    if (!sentry.isAlive) {
      this.close(false);
    } else if (!this.order) {
      console.log("Sentry", sentry.nick, "creates a Phoenix hallucination for scouting");

      const energy = sentry.energy;
      this.order = new Order(sentry, 154).accept(() => (sentry.energy < energy));
    } else if (this.order.isRejected) {
      this.close(false);
    } else if (this.order.isAccepted) {
      // Find the hallucination
      for (const unit of Units.hallucinations().values()) {
        if (!unit.job) {
          this.close(true);
          break;
        }
      }
    }
  }

}

class Flyby extends Job {

  constructor() {
    super("Phoenix");
  }

  accept(unit) {
    return unit.isHallucination;
  }

  execute() {
    const scout = this.assignee;

    // Check if hallucination expired
    if (!scout.isAlive) return this.close(true);

    // Update last scout time for all zones
    if (scout.zone) {
      scout.zone.lastScoutTime = Resources.loop;
    }

    // Select next zone for scouting
    if (!this.target || isSamePosition(scout.body, this.target)) {
      this.target = getTarget(scout);
    }

    Order.move(scout, this.target);
  }

}

function selectSentry() {
  if (!ActiveCount.Sentry) return;

  let energyThreshold = COST_HALLUCINATION;

  if (VisibleCount.Warrior) {
    energyThreshold += COST_GUARDIAN_SHIELD;
  }

  for (const unit of Units.warriors().values()) {
    if (unit.type.name !== "Sentry") continue;
    if (unit.energy < energyThreshold) continue;

    return unit;
  }
}

function getTarget(scout) {
  if (!scout.zone) return;
  if (Enemy.base && !Enemy.base.lastScoutTime) return Enemy.base;

  let bestTarget;
  let bestDistance;

  for (const zone of Zone.list()) {
    const distance = calculateSquareDistance(scout.body, zone);

    if (isBetterScoutTarget(zone, distance, bestTarget, bestDistance)) {
      bestTarget = zone;
      bestDistance = distance;
    }
  }

  return bestTarget;
}

function isBetterScoutTarget(zone, zoneDistance, bestTarget, bestDistance) {
  if (!bestTarget) return true;

  const hasZoneBeenScoutedRecently = (Resources.loop - zone.lastScoutTime < TWO_MINUTES);
  const hasBestBeenScoutedRecently = (Resources.loop - bestTarget.lastScoutTime < TWO_MINUTES);

  if (hasZoneBeenScoutedRecently && hasBestBeenScoutedRecently) {
    return (zoneDistance < bestDistance);
  } else if (!hasZoneBeenScoutedRecently && !hasBestBeenScoutedRecently) {
    if (zone.isDepot && !bestTarget.isDepot) return true;
    if (!zone.isDepot && bestTarget.isDepot) return false;

    return (zoneDistance < bestDistance);
  } else {
    return !hasZoneBeenScoutedRecently;
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 2) && (Math.abs(a.y - b.y) < 2);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
