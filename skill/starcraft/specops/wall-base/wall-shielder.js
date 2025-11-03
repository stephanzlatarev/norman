import { Depot, Job, Order } from "../imports.js";

let initialized;
let mineralsBack;
let mineralsForth;
let minx;
let maxx;
let miny;
let maxy;
let holdPosition;

export default class WallShielder extends Job {

  constructor(wallSite) {
    super("Probe");

    this.zone = Depot.home;
    this.priority = 100;

    this.isRequestingBackup = false;

    if (!initialized) {
      mineralsBack = [...Depot.home.minerals][0];
      mineralsForth = findMineralsForth();
      
      minx = wallSite.x - 1;
      maxx = wallSite.x + 1;

      if (wallSite.dy > 0) {
        miny = wallSite.y + 0.5;
        maxy = wallSite.y + 1;
      } else {
        miny = wallSite.y - 1;
        maxy = wallSite.y - 0.5;
      }

      holdPosition = { x: wallSite.x, y: (miny + maxy) / 2 };

      initialized = true;
    }
  }

  execute() {
    const probe = this.assignee;

    if (!probe.isAlive) return this.close(false);

    if (shouldMoveBack(probe)) {
      return this.close(true);
    }

    const target = findTarget(probe);

    if (target) {
      Order.attack(probe, target);

      this.isRequestingBackup = true;
    } else if (isInHoldPosition(probe)) {
      Order.hold(probe, holdPosition);

      this.isRequestingBackup = false;
    } else {
      slipTo(probe, mineralsForth);

      this.isRequestingBackup = false;
    }
  }

  close(outcome) {
    const probe = this.assignee;

    if (probe && probe.isAlive) {
      slipTo(probe, mineralsBack);
    }

    this.isRequestingBackup = false;

    super.close(outcome);
  }

}

function findMineralsForth() {
  for (const depot of Depot.list()) {
    if (depot === Depot.home) continue;
    if (!depot.minerals.size) continue;

    return [...depot.minerals][0];
  }
}

function findTarget(probe) {
  for (const enemy of Depot.home.enemies.values()) {
    if (probe.order.abilityId === 23 && (probe.order.targetUnitTag === enemy.tag)) {
      return enemy;
    }
  }

  for (const enemy of Depot.home.enemies.values()) {
    const squareDistance = calculateSquareDistance(probe.body, enemy.body);
    const squareBuffer = (probe.type.movementSpeed * 3) * (probe.type.movementSpeed * 3);

    if (squareDistance <= squareBuffer) {
      return enemy;
    }
  }
}

function isInHoldPosition(probe) {
  return (probe.body.x >= minx) && (probe.body.x <= maxx) && (probe.body.y >= miny) && (probe.body.y <= maxy);
}

function shouldMoveBack(probe) {
  // The probe is hit and needs to retreat to regenerate its shields
  if (probe.armor.shield <= 0) return true;

  // The probe when too far from the wall
  if (probe.cell.rampVisionLevel < 7) return true;
}

function slipTo(probe, minerals) {
  if ((probe.order.abilityId !== 298) || (probe.order.targetUnitTag !== minerals.tag)) {
    new Order(probe, 298, minerals).accept(true);
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
