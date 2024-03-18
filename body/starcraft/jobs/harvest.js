import Job from "../job.js";
import Order from "../order.js";

const OFFSET_MINERAL = 0.95;
const OFFSET_VESPENE = 1.95;
const OFFSET_DEPOT = 3.0;

export default class Harvest extends Job {

  constructor(resource, depot) {
    super({ type: { isWorker: true }, depot: depot }, null, resource);

    const distance = resource.d;

    if (distance < 10) {
      const offset = resource.type.isMineral ? OFFSET_MINERAL : OFFSET_VESPENE;
      const boost = (distance - offset - OFFSET_DEPOT) / 2 + offset;

      this.boostDistance = boost * boost;
      this.harvestPoint = calculatePathEnd(depot, resource.body, distance, offset);
      this.storePoint = calculatePathEnd(resource.body, depot, distance, OFFSET_DEPOT);

      this.isSpeedMining = true;
      this.priority = Math.round(10 - distance);
    } else {
      this.isSpeedMining = false;
      this.priority = 0;
    }
  }

  execute() {
    if (!this.target.isAlive || !this.target.isActive) {
      return this.close(true);
    }

    if (this.isSpeedMining) {
      const sd = squareDistance(this.assignee.body, this.target.body);

      this.isCommitted = true;

      if (this.assignee.isCarryingHarvest) {
        if (sd < this.boostDistance) {
          pushToDepot(this.assignee, this.storePoint);
        } else {
          returnHarvest(this.assignee);
        }
      } else {
        if (sd < this.boostDistance) {
          harvestResource(this.assignee, this.target);
        } else {
          pushToResource(this.assignee, this.harvestPoint);

          // While pushing to the resource, the worker is available to take hiher priority jobs
          this.isCommitted = false;
        }
      }
    } else if (!this.order) {
      this.order = new Order(this.assignee, 298, this.target);
    }
  }

}

function pushToResource(worker, harvestPoint) {
  if ((worker.order.abilityId !== 16) || !isSamePoint(worker.order.targetWorldSpacePos, harvestPoint)) {
    new Order(worker, 16, harvestPoint, isAccepted);
  }
}

function harvestResource(worker, resource) {
  if ((worker.order.abilityId !== 298) || (worker.order.targetUnitTag !== resource.tag)) {
    new Order(worker, 298, resource, isAccepted);
  }
}

function pushToDepot(worker, storePoint) {
  if ((worker.order.abilityId === 299) && !worker.order.targetUnitTag) return;

  if ((worker.order.abilityId !== 16) || !isSamePoint(worker.order.targetWorldSpacePos, storePoint)) {
    new Order(worker, 16, storePoint, isAccepted);
  }
}

function returnHarvest(worker) {
  if (worker.order.abilityId !== 299) {
    new Order(worker, 299, null, isAccepted);
  }
}

function isAccepted() {
  return true;
}

function isSamePoint(a, b) {
  if (!a || !b) return false;

  return (Math.abs(a.x - b.x) < 0.1) && (Math.abs(a.y - b.y) < 0.1);
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function calculatePathEnd(from, to, distance, offset) {
  return {
    x: to.x + offset * (from.x - to.x) / distance,
    y: to.y + offset * (from.y - to.y) / distance,
  };
}
