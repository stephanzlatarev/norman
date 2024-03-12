import Mission from "../mission.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
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
    job = new Produce("Zealot", facility);

    jobs.set(facility, job);
  }
}
