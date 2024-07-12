import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import Map from "../map/map.js";
import Wall from "../map/wall.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";

const DEFAULT_FACILITIES = ["ShieldBattery", "Gateway"];
const SPECIAL_FACILITIES = ["Gateway", "CyberneticsCore", "RoboticsFacility", "Forge", "TwilightCouncil", "RoboticsBay"];

let wallPylon = null;

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

    const pos = findBuildingPlot(facility);
    if (!pos) return;

    this.job = new Build(facility, pos);
  }

}

function selectFacilityType() {
  const specialFacilityType = selectSpecialFacilityType();
  const defaultFacilityType = selectDefaultFacilityType();

  if (!defaultFacilityType) {
    return specialFacilityType;
  }

  if (!specialFacilityType) {
    return defaultFacilityType;
  }

  return (Priority[specialFacilityType.name] > Priority[defaultFacilityType.name]) ? specialFacilityType : defaultFacilityType;
}

function selectSpecialFacilityType() {
  if (SPECIAL_FACILITIES.length) {
    const facility = Types.unit(SPECIAL_FACILITIES[0]);

    if (TotalCount[facility.name] < Limit[facility.name]) {
      return facility;
    }
  }
}

function selectDefaultFacilityType() {
  for (const one of DEFAULT_FACILITIES) {
    const facility = Types.unit(one);

    if (TotalCount[facility.name] < Limit[facility.name]) {
      return facility;
    }
  }
}

//TODO: Optimize by remembering found plots and re-using them when pylons are destroyed but otherwise continue the search from where last plot was found
function findBuildingPlot(facility) {
  for (const wall of Wall.list()) {
    if (!wallPylon) {
      wallPylon = findPylon(wall);
    }

    if (wallPylon && wallPylon.isActive) {
      const plot = wall.getPlot(facility);
      const size = (facility.name !== "ShieldBattery") ? 3 : 2; // TODO: Get Types to know the size of unit types

      if (plot && Map.accepts(plot, plot.x, plot.y, size)) {
        return plot;
      }
    }
  }

  for (const building of Units.buildings().values()) {
    if (!building.type.isPylon || !building.isActive || building.isWall) continue;

    const pos = building.body;

    if (Map.accepts(pos, pos.x + 2.5, pos.y + 1.5, 3)) return { x: pos.x + 2.5, y: pos.y + 1.5 };
    if (Map.accepts(pos, pos.x + 2.5, pos.y - 1.5, 3)) return { x: pos.x + 2.5, y: pos.y - 1.5 };
    if (Map.accepts(pos, pos.x - 2.5, pos.y + 1.5, 3)) return { x: pos.x - 2.5, y: pos.y + 1.5 };
    if (Map.accepts(pos, pos.x - 2.5, pos.y - 1.5, 3)) return { x: pos.x - 2.5, y: pos.y - 1.5 };
  }
}

function findPylon(wall) {
  const plot = wall.getPlot(Types.unit("Pylon"));

  for (const building of Units.buildings().values()) {
    if (building.type.isPylon && (building.body.x === plot.x) && (building.body.y === plot.y)) {
      building.isWall = true;
      return building;
    }
  }
}
