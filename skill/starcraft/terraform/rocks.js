import { Job, Memory, Order, Units, Zone } from "./imports.js";

const ALERT_YELLOW = 4;
const PERIMETER_WHITE = 3;
const PERIMETER_YELLOW = 4;

const jobs = new Set();
let rock = null;

// Clear rocks and obstacles
export default function() {
  if (!rock || !rock.isAlive) rock = findRockToClear();

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
  const rocks = [];

  const isAttacking = (Memory.DeploymentOutreach >= Memory.DeploymentOutreachProbingAttack);
  const perimeter = isAttacking ? PERIMETER_YELLOW : PERIMETER_WHITE;

  for (const obstacle of Units.obstacles().values()) {
    if (!obstacle.zone) continue;
    if (obstacle.zone.perimeterLevel >= perimeter) continue;

    if (!obstacle.armor.health) continue;
    if (!obstacle.armor.health > 3000) continue; // Ignore this one as it's too hard to destroy

    if (obstacle.type.name === "XelNagaTower") continue;

    rocks.push(obstacle);
  }

  if (rocks.length === 1) {
    return rocks[0];
  } else if (rocks.length >= 1) {
    let selection;

    for (const rock of rocks) {
      if (!selection || (rock.zone.perimeterLevel < selection.zone.perimeterLevel)) {
        selection = rock;
      }
    }

    return selection;
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
    // Check if there are enemies where we are
    if (zone.enemies.size) {
      if (zone.buildings.size) return true;
      if (zone.warriors.size) return true;
      if (zone.workers.size) return true;
    }

    // Check alert levels in our perimeter
    if (zone.perimeterLevel && zone.alertLevel) {
      if ((zone.perimeterLevel < PERIMETER_WHITE) && (zone.alertLevel >= ALERT_YELLOW)) {
        return true;
      }
    }
  }
}
