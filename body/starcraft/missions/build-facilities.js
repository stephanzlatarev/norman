import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Hub from "../map/hub.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";

const DEFAULT_FACILITIES = ["Gateway"];
const SPECIAL_FACILITIES = ["Gateway", "CyberneticsCore", "RoboticsFacility", "Forge", "TwilightCouncil"];

// TODO: Convert to skill and run one skill per facility type

export default class BuildFacilitiesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        this.job = null;
      } else if (this.job.isDone) {
        if (this.job.product && (this.job.product.type === Types.unit(SPECIAL_FACILITIES[0]))) {
          SPECIAL_FACILITIES.splice(0, 1);
        }

        this.job = null;
      } else {
        return;
      }
    }

    const facility = selectFacilityType();
    if (!facility) return;

    const pos = findBuildingPlot();
    if (!pos) return;

    this.job = new Build(facility, pos);
  }

}

function selectFacilityType() {
  // Try special types
  if (SPECIAL_FACILITIES.length) {
    const facility = Types.unit(SPECIAL_FACILITIES[0]);
  
    if (TotalCount[facility.name] < Limit[facility.name]) {
      return facility;
    }
  }

  // Try default type
  for (const one of DEFAULT_FACILITIES) {
    const facility = Types.unit(one);

    if (TotalCount[facility.name] < Limit[facility.name]) {
      return facility;
    }
  }
}

function findBuildingPlot() {
  for (const hub of Hub.list()) {
    if (!hub.isPowered) continue;

    for (const plot of hub.buildingPlots) {
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
    if (isSamePosition(pos, building.body)) {
      return true;
    }
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}
