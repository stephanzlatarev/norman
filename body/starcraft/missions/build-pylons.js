import Hub from "../hub.js";
import Mission from "../mission.js";
import Units from "../units.js";
import WorkerBuild from "../jobs/WorkerBuild.js";
import Resources from "../memo/resources.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

export default class BuildPylonsMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    if (Resources.minerals < 100) return;

    const pos = findPylonForSupply() || findPylonForPower();
    if (!pos) return;

    this.job = new WorkerBuild("Pylon", pos, 100);

    Resources.minerals -= 100;
  }

}

function findPylonForSupply() {
  if (Resources.supplyLimit >= 200) return;
  if (Resources.supplyUsed < Resources.supplyLimit - 8) return;
  if (Resources.supplyUsed + countProductionCapacity() < countExpectedSupply() - 8) return;

  return findPylonPlot();
}

function findPylonForPower() {
  const buildings = countBuildings();
  const hubs = reviewHubs();

  if (!hubs.next || (buildings + 1 < hubs.powered * 3)) return;

  return hubs.next;
}

function countExpectedSupply() {
  let count = 0;

  for (const building of Units.buildings().values()) {
    count += building.type.supplyProvided;
  }

  return count;
}

function countProductionCapacity() {
  let count = 0;

  for (const building of Units.buildings().values()) {
    if ((building.type.name === "Nexus") || (building.type.name === "Gateway")) {
      count++;
      if (building.order.abilityId) count++;
    }
  }

  return count;
}

function countBuildings() {
  let count = 0;

  for (const building of Units.buildings().values()) {
    if (building.type.needsPower) {
      count++;
    }
  }

  return count;
}

function reviewHubs() {
  let powered = 0;
  let next = null;

  for (const hub of Hub.list()) {
    if (hub.isPowered || !hub.pylonPlots[0].isFree) {
      powered++;
    } else if (!next) {
      next = hub;
    }
  }

  return { powered, next };
}

function findPylonPlot() {
  for (const hub of Hub.list()) {
    for (const plot of hub.pylonPlots) {
      if (plot.isFree) {
        if (isPositionTaken(plot)) {
          plot.isFree = false;
          continue;
        }

        return plot;
      }
    }
  }
}

function isPositionTaken(pos) {
  for (const building of Units.buildings().values()) {
    if (building.type.isPylon && isSamePosition(pos, building.body)) {
      return true;
    }
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}