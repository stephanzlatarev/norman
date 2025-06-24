import { Depot, Job, Order, Resources } from "../imports.js";

let wallRally;
let wallRamp;
let wallStation;
let wallTarget;
let order;

const FORCE_FIELD_ENERGY  = 50;
const FORCE_FIELD_TIME = 11 * 22.4;

export default class WallFielder extends Job {

  constructor(wallSite) {
    super("Sentry");

    this.zone = Depot.home;
    this.priority = 100;

    if (!wallStation) {
      wallRally = findWallRally(wallSite);
      wallRamp = findWallRamp();
      wallTarget = findWallTarget(wallRamp);
      wallStation = wallSite.wall[0];
    }
  }

  execute() {
    const sentry = this.assignee;
    const energy = sentry.energy;

    if (!sentry.isAlive) return this.close(false);

    sentry.energyReserved = FORCE_FIELD_ENERGY;

    if (isDefending()) {
      if (wallTarget && (energy >= FORCE_FIELD_ENERGY)) {
        if (order && !order.isRejected && (order.unit === sentry)) {
          // Wait until the previous order is accepted by the sentry
          if (!order.isAccepted) return;
      
          // Wait unit the previous force field expires
          if (Resources.loop - order.timeIssued <= FORCE_FIELD_TIME) return;
        }

        if (shouldCastForceField()) {
          order = new Order(sentry, 1526, wallTarget).accept(order => (order.unit.energy < energy));
          return;
        }
      }

      Order.attack(sentry, wallStation);
    } else {
      Order.move(sentry, wallRally);
    }
  }

  close(outcome) {
    const sentry = this.assignee;

    if (sentry && sentry.isAlive) {
      sentry.energyReserved = 0;
      Order.move(sentry, wallRally);
    }

    super.close(outcome);
  }

}

function findWallRally(wallSite) {
  const wall = wallSite.wall[0];
  const dx = (wall.x > Depot.home.x) ? 1 : -1;
  const dy = (wall.y > wallSite.y) ? 1 : -1;

  return { x: wall.x + dx + 0.5, y: wall.y + dy + dy + 0.5 };
}

function findWallRamp() {
  const ramp = [];

  for (const cell of Depot.home.cells) {
    if (cell.rampVisionLevel >= 0) {
      ramp.push(cell);
    }
  }

  for (const zone of Depot.home.range.fire) {
    for (const cell of zone.cells) {
      if (cell.rampVisionLevel >= 0) {
        ramp.push(cell);
      }
    }
  }

  return ramp;
}

function findWallTarget(ramp) {
  for (const cell of ramp) {
    if (cell.isPath && (cell.rampVisionLevel === 0)) {
      return { x: cell.x + 0.5, y: cell.y + 0.5 };
    }
  }
}

function isDefending() {
  if (Depot.home.enemies.size) return true;

  for (const zone of Depot.home.range.fire) {
    if (zone.enemies.size) return true;
  }
}

function shouldCastForceField() {
  let count = Depot.home.enemies.size;

  for (const zone of Depot.home.range.fire) {
    if (zone === Depot.home) continue;

    for (const enemy of zone.enemies) {
      if (enemy.cell.rampVisionLevel >= 0) {
        count++;
      }

      if (count >= 5) {
        return true;
      }
    }
  }
}
