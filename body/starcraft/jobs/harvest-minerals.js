import Job from "../job.js";
import Order from "../order.js";
import Resources from "../memo/resources.js";

const OFFSET_MINERAL = 0.95;
const OFFSET_DEPOT = 3.0;
const COMMIT_SQUARE_DISTANCE = (OFFSET_MINERAL + 1) * (OFFSET_MINERAL + 1);

const MODE_IDLE = "idle";
const MODE_PUSH = "push";
const MODE_PUSHING = "pushing";
const MODE_PACKING = "packing";
const MODE_REAPING = "reaping";
const MODE_STORING = "storing";

export default class HarvestMinerals extends Job {

  isHarvestMineralsJob = true;

  mode = MODE_IDLE;

  constructor(line, resource) {
    super("Probe");

    this.zone = line.zone;
    this.isCommitted = false;

    this.setResource(line, resource);
  }

  setResource(line, resource) {
    this.line = line;
    this.zone = line.zone;
    this.priority = line.priority;
    this.target = resource;
    this.details = line.details;

    if (resource.d < 10) {
      const nexus = this.zone.depot;
      const distance = resource.d;
      const boost = (distance - OFFSET_MINERAL - OFFSET_DEPOT) / 2 + OFFSET_MINERAL;

      this.boostDistance = boost * boost;
      this.harvestPoint = calculatePathEnd(nexus.body, resource.body, distance, OFFSET_MINERAL);
      this.storePoint = calculatePathEnd(resource.body, nexus.body, distance, OFFSET_DEPOT);

      this.isSpeedMining = true;
    } else {
      this.isSpeedMining = false;
    }
  }

  accepts(unit) {
    return (unit.zone === this.zone);
  }

  assign(unit) {
    this.mode = MODE_IDLE;
    this.order = null;

    super.assign(unit);
  }

  execute() {
    if (!this.target) return;

    if (!this.target.isAlive || !this.target.isActive) {
      return this.close(true);
    }

    const worker = this.assignee;

    if (this.wasCarryingHarvest && !worker.isCarryingHarvest) {
      this.setResource(this.line, this.line.sequence.get(this.target));
    }
    this.wasCarryingHarvest = worker.isCarryingHarvest;

    if (this.isSpeedMining) {
      this.isCommitted = true;

      // Don't disturb the worker while packing the harvest
      if ((worker.order.abilityId === 299) && !worker.order.targetUnitTag) {
        this.mode = MODE_PACKING;
        return;
      }

      const sd = squareDistance(worker.body, this.target.body);

      if (worker.isCarryingHarvest) {
        if ((sd > this.boostDistance) && isInHarvestLane(worker, this.storePoint, this.harvestPoint)) {
          this.mode = pushToDepot(worker, this.mode, this.storePoint, this.target, this.zone.depot);
        } else {
          this.mode = returnHarvest(worker);
        }
      } else {
        if ((sd < this.boostDistance) && isInHarvestLane(worker, this.storePoint, this.harvestPoint)) {
          this.mode = pushToResource(worker, this.mode, this.harvestPoint, this.target);
        } else {
          this.mode = harvestResource(worker, this.target);

          // While moving to the resource, the worker is available to take higher priority jobs
          this.isCommitted = false;
        }
      }
    } else if (!this.order || (this.order.target !== this.target)) {
      this.order = order(worker, 298, this.target);
    } else if ((worker.order.abilityId !== 299) && (worker.order.targetUnitTag !== this.target.tag)) {
      this.order = order(worker, 298, this.target);
    } else {
      this.isCommitted = (worker.order.abilityId !== 298) || (worker.lastSeen < Resources.loop);

      if ((worker.order.abilityId === 298) && (squareDistance(worker.body, this.target.body) < COMMIT_SQUARE_DISTANCE)) this.isCommitted = true;
    }
  }

}

function order(worker, ability, target) {
  if (worker.todo) {
    return worker.todo.replace(ability, target).accept(true);
  } else {
    return new Order(worker, ability, target).accept(true);
  }
}

function pushToResource(worker, mode, harvestPoint, resource) {
  if ((worker.order.abilityId === 16) && isSamePoint(worker.order.targetWorldSpacePos, harvestPoint)) return MODE_PUSHING;
  if ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === resource.tag) && (mode === MODE_PUSHING)) return MODE_PUSHING;

  order(worker, 16, harvestPoint).queue(298, resource);

  return MODE_PUSH;
}

function harvestResource(worker, resource) {
  if ((worker.order.abilityId !== 298) || (worker.order.targetUnitTag !== resource.tag)) {
    order(worker, 298, resource);
  }

  return MODE_REAPING;
}

function pushToDepot(worker, mode, storePoint, resource, nexus) {
  if ((worker.order.abilityId === 16) && isSamePoint(worker.order.targetWorldSpacePos, storePoint)) return MODE_PUSHING;
  if ((worker.order.abilityId === 299) && (worker.order.targetUnitTag === nexus.tag) && (mode === MODE_PUSHING)) return MODE_PUSHING;

  order(worker, 16, storePoint).queue(1, nexus).queue(1, resource);

  return MODE_PUSH;
}

function returnHarvest(worker) {
  if (worker.order.abilityId !== 299) {
    order(worker, 299);
  }

  return MODE_STORING;
}

function isInHarvestLane(worker, a, b) {
  if (worker.body.x < Math.min(a.x, b.x) - 0.1) return false;
  if (worker.body.x > Math.max(a.x, b.x) + 0.1) return false;
  if (worker.body.y < Math.min(a.y, b.y) - 0.1) return false;
  if (worker.body.y > Math.max(a.y, b.y) + 0.1) return false;

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
