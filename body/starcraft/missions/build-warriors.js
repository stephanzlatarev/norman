import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import Count from "../memo/count.js";
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
    if (Count.CyberneticsCore >= 1) {
      if ((Count.Stalker <= Count.Zealot * 4) && (Count.Stalker <= Count.Sentry * 4)) {
        return "Stalker";
      } else if ((Count.Sentry * 4 <= Count.Stalker) && (Count.Sentry <= Count.Zealot)) {
        return "Sentry";
      }
    }

    return "Zealot";
  } else if (facility.type.name === "RoboticsFacility") {
    if (Count.Observer < 1) {
      return "Observer";
    }

    return "Immortal";
  }
}
