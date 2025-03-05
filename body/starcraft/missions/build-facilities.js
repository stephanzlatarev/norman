import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import Board from "../map/board.js";
import Tiers from "../map/tier.js";
import Wall from "../map/wall.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Plan from "../memo/plan.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const DEFAULT_FACILITIES = ["ShieldBattery", "Gateway", "Forge"];
const SPECIAL_FACILITIES_DEFAULT = ["Gateway", "CyberneticsCore", "RoboticsFacility", "Forge", "TwilightCouncil", "RoboticsBay"];
const SPECIAL_FACILITIES_ROBOBAY = ["Gateway", "CyberneticsCore", "RoboticsFacility", "RoboticsBay", "Forge", "TwilightCouncil"];

const SLOTS = [
  { x: +2.5, y: +1.5 },
  { x: +2.5, y: -1.5 },
  { x: -2.5, y: +1.5 },
  { x: -2.5, y: -1.5 },
  { x: +2.5, y: +4.5 },
  { x: +2.5, y: -4.5 },
  { x: -2.5, y: +4.5 },
  { x: -2.5, y: -4.5 },
  { x: +5.5, y: +1.5 },
  { x: +5.5, y: -1.5 },
  { x: -5.5, y: +1.5 },
  { x: -5.5, y: -1.5 },
];

const COOLDOWN_LOOPS = 500;

const cooldown = new Map();
let cooldownKey;

let wallPylon = null;

// TODO: Convert to skill and run one skill per facility type
export default class BuildFacilitiesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        // This build job failed. Set the target on cooldown and open a new build job
        if (cooldownKey) cooldown.set(cooldownKey, Resources.loop);
        this.job = null;
      } else if (this.job.isDone) {
        // This build job is done. Free the build slot to open a new build job
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

    cooldownKey = null;

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
  if (!Plan.BaseLimit) {
    for (const wall of Wall.list()) {
      if (!wallPylon || !wallPylon.isAlive) {
        wallPylon = findWallPylon(wall);
      }

      if (wallPylon && wallPylon.isActive) {
        const plot = wall.getPlot(facility);

        if (plot) {
          return plot;
        }
      }
    }
  }

  for (const tier of Tiers) {
    for (const zone of tier.zones) {
      if (!zone.buildings.size) continue;
      if ((zone.alertLevel > ALERT_WHITE) && !zone.workers.size) continue;

      const pylon = findZonePylon(zone);

      if (!pylon) continue;

      for (const slot of SLOTS) {
        const slotKey = getCooldownKey(pylon, slot);
        const lastAttempt = cooldown.get(slotKey);

        if (lastAttempt && (Resources.loop - lastAttempt < COOLDOWN_LOOPS)) {
          // This slot is on cooldown
          continue;
        }

        const plot = getBuildingPlotIfFree(pylon.body, slot);

        if (plot) {
          cooldownKey = slotKey;
          return plot;
        }
      }
    }
  }
}

function findWallPylon(wall) {
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

function findZonePylon(zone) {
  for (const building of zone.buildings) {
    if (!building.type.isPylon) continue;
    if (!building.isActive) continue;
    if (building.isDecoy) continue;
    if (building.isWall) continue;
    if (building.body.x !== zone.powerPlot.x) continue;
    if (building.body.y !== zone.powerPlot.y) continue;

    return building;
  }
}

function getBuildingPlotIfFree(plot, slot) {
  const plotx = plot.x + slot.x;
  const ploty = plot.y + slot.y;

  for (let x = plotx - 1; x <= plotx + 1; x++) {
    for (let y = ploty - 1; y <= ploty; y++) {
      const cell = Board.cell(x, y);

      if (!cell.isPlot || !cell.isPath) {
        return;
      }
    }
  }

  return { x: plotx, y: ploty };

}

function getCooldownKey(pylon, slot) {
  return [pylon.body.x, pylon.body.y, slot.x, slot.y].join();
}
