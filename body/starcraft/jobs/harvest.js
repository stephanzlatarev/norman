import Job from "../job.js";
import Order from "../order.js";
import Resources from "../memo/resources.js";

const OFFSET_MINERAL = 0.95;
const OFFSET_DEPOT = 3.0;

const MODE_IDLE = "idle";
const MODE_PUSH = "push";
const MODE_PUSHING = "pushing";
const MODE_PACKING = "packing";
const MODE_REAPING = "reaping";
const MODE_STORING = "storing";

export default class Harvest extends Job {

  mode = MODE_IDLE;

  constructor(resource, nexus) {
    super("Probe", null, resource);

    this.nexus = nexus;
    this.zone = nexus.depot;

    const distance = resource.d;

    if (resource.type.isMinerals && (distance < 10)) {
      const boost = (distance - OFFSET_MINERAL - OFFSET_DEPOT) / 2 + OFFSET_MINERAL;

      this.boostDistance = boost * boost;
      this.harvestPoint = calculatePathEnd(nexus.body, resource.body, distance, OFFSET_MINERAL);
      this.storePoint = calculatePathEnd(resource.body, nexus.body, distance, OFFSET_DEPOT);

      this.isSpeedMining = true;
      this.priority = Math.round(10 - distance);
    } else {
      this.isSpeedMining = false;
      this.priority = resource.type.isExtractor ? 50 : 0;
    }

    this.summary = this.constructor.name + " " + (resource.type.isMinerals ? "minerals" : "vespene");
    this.isCommitted = false;
  }

  assign(unit) {
    this.mode = MODE_IDLE;
    this.order = null;

    super.assign(unit);
  }

  execute() {
    if (!this.target.isAlive || !this.target.isActive) {
      return this.close(true);
    }

    if (this.isSpeedMining) {
      this.isCommitted = true;

      // Don't disturb the worker while packing the harvest
      if ((this.assignee.order.abilityId === 299) && !this.assignee.order.targetUnitTag) {
        this.mode = MODE_PACKING;
        return;
      }

      const sd = squareDistance(this.assignee.body, this.target.body);

      if (this.assignee.isCarryingHarvest) {
        if ((sd > this.boostDistance) && isInHarvestLane(this.assignee, this.storePoint, this.harvestPoint)) {
          this.mode = pushToDepot(this.assignee, this.mode, this.storePoint, this.target, this.nexus);
        } else {
          this.mode = returnHarvest(this.assignee);
        }
      } else {
        if ((sd < this.boostDistance) && isInHarvestLane(this.assignee, this.storePoint, this.harvestPoint)) {
          this.mode = pushToResource(this.assignee, this.mode, this.harvestPoint, this.target);
        } else {
          this.mode = harvestResource(this.assignee, this.target);

          // While moving to the resource, the worker is available to take hiher priority jobs
          this.isCommitted = false;
        }
      }
    } else if (!this.order) {
      this.order = order(this.assignee, 298, this.target);
    } else {
      this.isCommitted = (this.assignee.order.abilityId !== 298) || (this.assignee.lastSeen < Resources.loop);
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
