import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

const jobs = new Map();

const WARRIOR_PRODUCER = {
  Gateway: true,
  RoboticsFacility: true,
};

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    if (Resources.supplyUsed >= Resources.supplyLimit) return;

    for (const facility of Units.buildings().values()) {
      if (!WARRIOR_PRODUCER[facility.type.name]) continue;
      if (!facility.isActive) continue;

      createProduceWarriorJob(facility);
    }
  }

}

function removeCompletedJobs() {
  for (const [tag, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(tag);
    }
  }
}

function createProduceWarriorJob(facility) {
  let job = jobs.get(facility);

  if (!job) {
    const warrior = selectWarriorType(facility);

    if (warrior) {
      job = new Produce(facility, Types.unit(warrior));

      jobs.set(facility, job);
    }
  }
}

function selectWarriorType(facility) {
  if (facility.type.name === "Gateway") {
    if (ActiveCount.CyberneticsCore >= 1) {
      if ((TotalCount.Stalker <= TotalCount.Zealot * 4) && (TotalCount.Stalker <= TotalCount.Sentry * 4)) {
        return "Stalker";
      } else if ((TotalCount.Sentry * 4 <= TotalCount.Stalker) && (TotalCount.Sentry <= TotalCount.Zealot)) {
        return "Sentry";
      }
    }

    return "Zealot";
  } else if (facility.type.name === "RoboticsFacility") {
    if (TotalCount.Observer < 1) {
      return "Observer";
    }

    return "Immortal";
  }
}
