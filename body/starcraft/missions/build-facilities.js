import Mission from "../mission.js";
import Types from "../types.js";
import Build from "../jobs/build.js";
import { ALERT_WHITE } from "../map/alert.js";
import Board from "../map/board.js";
import Depot from "../map/depot.js";
import { TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const DEFAULT_FACILITIES = ["ShieldBattery", "Gateway", "Forge"];
const SPECIAL_FACILITIES_DEFAULT = ["Gateway", "CyberneticsCore", "RoboticsFacility", "Forge", "TwilightCouncil", "RoboticsBay", "DarkShrine"];
const SPECIAL_FACILITIES_ROBOBAY = ["Gateway", "CyberneticsCore", "RoboticsFacility", "RoboticsBay", "Forge", "TwilightCouncil", "DarkShrine"];

const COOLDOWN_LOOPS = 500;

const cooldown = new Map();
let cooldownSite;

// TODO: Convert to skill and run one skill per facility type
export default class BuildFacilitiesMission extends Mission {

  job;

  run() {
    if (this.job) {
      if (this.job.isFailed) {
        // This build job failed. Set the target on cooldown and open a new build job
        if (cooldownSite) cooldown.set(cooldownSite, Resources.loop);
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

    cooldownSite = null;

    const facility = selectFacilityType();
    if (!facility) return;

    const pos = findBuildingPlot();
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
function findBuildingPlot() {
  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if ((zone.alertLevel > ALERT_WHITE) && !zone.workers.size) continue;

    for (const site of zone.sites) {
      const lastAttempt = cooldown.get(site);

      if (lastAttempt && (Resources.loop - lastAttempt < COOLDOWN_LOOPS)) {
        // This site is on cooldown
        continue;
      }

      for (const plot of site.medium) {
        if (isPlotFree(plot) && isPowered(plot)) {
          cooldownSite = site;
          return plot;
        }
      }
    }
  }
}

function isPlotFree(plot) {
  for (let x = plot.x - 1; x <= plot.x + 1; x++) {
    for (let y = plot.y - 1; y <= plot.y; y++) {
      const cell = Board.cell(x, y);

      if (cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}

function isPowered(plot) {
  const zone = plot.zone;

  for (const pylon of zone.buildings) {
    if (!pylon.type.isPylon) continue;
    if (!pylon.isActive) continue;

    if ((Math.abs(pylon.body.x - plot.x) < 5) && (Math.abs(pylon.body.y - plot.y) < 5)) {
      return true;
    }
  }
}
