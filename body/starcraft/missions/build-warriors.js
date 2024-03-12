import Mission from "../mission.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import Count from "../memo/count.js";
import Resources from "../memo/resources.js";

const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    Resources.supplyUsed += jobs.size + jobs.size;

    if (Resources.minerals < 100) return;
    if (Resources.supplyUsed > Resources.supplyLimit - 2) return;

    for (const facility of Units.buildings().values()) {
      if (facility.type.name !== "Gateway") continue;

      if (!facility.isActive) continue;
      if (facility.order.abilityId) continue;

      if (Resources.minerals < 100) return;
      if (Resources.supplyUsed > Resources.supplyLimit - 2) return;

      createProduceWarriorJob(facility);

      Resources.minerals -= 100;
      Resources.supplyUsed += 2;
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
    job = new Produce(selectWarriorType(), facility);

    jobs.set(facility, job);
  }
}

function selectWarriorType() {
  if (Count.CyberneticsCore >= 1) {
    if ((Count.Stalker < Count.Zealot * 4) && (Count.Stalker < Count.Sentry * 4)) {
      return "Stalker";
    } else if ((Count.Zealot * 4 < Count.Stalker) && (Count.Zealot < Count.Sentry)) {
      return "Zealot";
    } else if ((Count.Sentry * 4 < Count.Stalker) && (Count.Sentry < Count.Zealot)) {
      return "Sentry";
    }

    return "Stalker";
  }

  return "Zealot";
}
