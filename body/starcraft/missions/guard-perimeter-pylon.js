import Mission from "../mission.js";
import Build from "../jobs/build.js";
import Map from "../map/map.js";
import Tiers from "../map/tier.js";

let pylonJob;
let pylonZone;

export default class GuardPerimeterPylonMission extends Mission {

  run() {
    if (pylonJob) {
      if (pylonJob.isFailed || pylonJob.isDone) {
        pylonJob = null;
      } else if (pylonZone.threats.size) {
        pylonJob.close(false);
        pylonJob = null;
      } else if (pylonJob.assignee && !pylonJob.assignee.isAlive) {
        pylonJob.assignee = null;
      }
    }

    if (!pylonJob) {
      for (const tier of Tiers) {
        for (const zone of tier.zones) {
          if (zone.threats.size) return;
          if (zone.buildings.size) continue;

          const station = zone.isDepot ? zone.exitRally : zone;

          if (!Map.accepts(zone, station.x, station.y, 3)) continue;

          for (const warrior of zone.warriors) {
            if (warrior.isAlive && isSamePosition(warrior.body, station)) {
              pylonZone = zone;
              pylonJob = new Build("Pylon", { x: Math.floor(station.x), y: Math.floor(station.y) } );
              pylonJob.priority = 50;

              return;
            }
          }
        }
      }
    }
  }

}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}
