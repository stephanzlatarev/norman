import { Job, Order, Units, Zone } from "./imports.js";

const ALERT_YELLOW = 4;
const PERIMETER_GREEN = 2;
const PERIMETER_WHITE = 3;

const jobs = new Set();
let rock = null;

// Clear passages
export default function() {
  if (!rock) rock = findRockToClear();

  if (rock && !areUnderAttack()) {
    let hasOpenJob = false;

    for (const job of jobs) {
      if (job.target !== rock) {
        job.close(true);
        jobs.delete(job);
      } else if (!job.assignee) {
        hasOpenJob = true;
      }
    }

    if (!hasOpenJob) {
      jobs.add(new ClearRock(rock));
    }
  } else {
    for (const job of jobs) {
      job.close(true);
      jobs.delete(job);
    }
  }
}

function findRockToClear() {
  for (const obstacle of Units.obstacles().values()) {
    if (!obstacle.zone) continue;
    if (!obstacle.zone.perimeterLevel) continue;
    if (obstacle.zone.perimeterLevel >= PERIMETER_GREEN) continue;

    if (!obstacle.armor.health) continue;
    if (!obstacle.armor.health > 3000) continue; // Ignore this one as it's too hard to destroy

    return obstacle;
  }
}

class ClearRock extends Job {

  constructor(rock) {
    super("Stalker");

    this.zone = rock.zone;
    this.target = rock;
    this.priority = 100;
  }

  execute() {
    if (!rock || !Units.obstacles().has(rock.tag)) {
      // The rock has been cleared
      rock = null;
      return this.close(true);
    }

    Order.attack(this.assignee, rock);
  }
}

function areUnderAttack() {
  for (const zone of Zone.list()) {
    // Check alert levels in our perimeter
    if (zone.perimeterLevel && zone.alertLevel) {
      if ((zone.perimeterLevel >= PERIMETER_WHITE) && (zone.alertLevel >= ALERT_YELLOW)) {
        return true;
      }
    }

    // Check if our warriors are facing enemies
    if (zone.warriors.size && zone.enemies.size) return true;
  }
}
