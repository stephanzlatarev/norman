import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Hub from "../map/hub.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

export default class BuildPylonsMission extends Mission {

  job;

  run() {
    if (Resources.supplyUsed < 14) return;

    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (!this.job.isDone) {
        return;
      }
    }

    const pos = findPylonForSupply() || findPylonForPower();

    if (pos) {
      this.job = new Build("Pylon", pos);
      this.job.priority = 100;
    }
  }

}

function findPylonForSupply() {
  if (Resources.supplyLimit >= 200) return;
  if ((Resources.supplyUsed < 20) && (TotalCount.Pylon >= 1)) return; // Too early for a second pylon

  // TODO: Also count a nexus when currently building but only if remaining time to build is the same as the time to build a pylon
  const expectedSupply = ActiveCount.Nexus * 15 + TotalCount.Pylon * 8;

  if (Resources.supplyUsed + 8 >= expectedSupply) return findPylonPlot();

  const timeToConsumeSupply = (expectedSupply - Resources.supplyUsed) / countSupplyConsumptionRate();
  const timeToIncreaseSupply = Types.unit("Pylon").buildTime + 5 * 22.4; // Assume 5 seconds for probe to reach pylon construction site

  if (timeToConsumeSupply <= timeToIncreaseSupply) {
    return findPylonPlot();
  }
}

function findPylonForPower() {
  const buildings = countBuildings();
  const hubs = reviewHubs();

  if (!hubs.next || (buildings + 1 < hubs.powered * 3)) return;

  return hubs.next;
}

function countSupplyConsumptionRate() {
  let consumption = 0;

  for (const building of Units.buildings().values()) {
    if (building.type.supplyConsumptionRate) {
      consumption += building.type.supplyConsumptionRate;
    }
  }

  return consumption;
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
