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
const SPECIAL_FACILITIES_DEFAULT = ["Gateway", "CyberneticsCore", "RoboticsFacility", "Forge", "TwilightCouncil", "RoboticsBay"];
const SPECIAL_FACILITIES_ROBOBAY = ["Gateway", "CyberneticsCore", "RoboticsFacility", "RoboticsBay", "Forge", "TwilightCouncil"];

let wallPylon = null;

// TODO: Convert to skill and run one skill per facility type
export default class BuildFacilitiesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isDone || this.job.isFailed) {
        // This build job is closed. Free the slot to open a new build job
        this.job = null;
      } else if (!this.job.assignee && (TotalCount[this.job.output.name] >= Limit[this.job.output.name])) {
        // This build job is not assigned yet but priorities have meanwhile changed so close it
        this.job.close(false);
        this.job = null;
      } else {
        // This build job is still in progress
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
  const facilities = (Priority.RoboticsBay > 50) ? SPECIAL_FACILITIES_ROBOBAY : SPECIAL_FACILITIES_DEFAULT;

  for (const facility of facilities) {
    // Special facilities are to be built in order, so if there's one of this type, then move to the next
    if (TotalCount[facility] >= 1) continue;

    // When this type of facility is not built yet, then either build it or build no special facility at all
    return (TotalCount[facility] < Limit[facility]) ? Types.unit(facility) : null;
  }
}

function selectDefaultFacilityType() {
  for (const facility of DEFAULT_FACILITIES) {
    const type = Types.unit(facility);

    if (TotalCount[facility] < Limit[facility]) {
      return type;
    }
  }
}

//TODO: Optimize by remembering found plots and re-using them when pylons are destroyed but otherwise continue the search from where last plot was found
function findBuildingPlot(facility) {
  for (const wall of Wall.list()) {
    if (!wallPylon || !wallPylon.isAlive) {
      wallPylon = findPylon(wall);
    }

    if (wallPylon && wallPylon.isActive) {
      const plot = wall.getPlot(facility);

      if (plot) {
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
  const plot = wall.getPlot("Pylon");

  if (plot) {
    for (const building of Units.buildings().values()) {
      if (building.type.isPylon && (building.body.x === plot.x) && (building.body.y === plot.y)) {
        building.isWall = true;
        return building;
      }
    }
  }
}
