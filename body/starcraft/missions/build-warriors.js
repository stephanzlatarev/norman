import Mission from "../mission.js";
import Units from "../units.js";
import BuildingTrain from "../jobs/BuildingTrain.js";
import Resources from "../memo/resources.js";

const jobs = new Map();

export default class BuildWorkersMission extends Mission {

  run() {
    removeCompletedJobs();

    Resources.supplyUsed += jobs.size + jobs.size;

    if (Resources.minerals < 100) return;
    if (Resources.supplyUsed > Resources.supplyLimit - 2) return;

    for (const factory of Units.buildings().values()) {
      if (factory.type.name !== "Gateway") continue;

      if (!factory.isActive) continue;
      if (factory.order.abilityId) continue;

      if (Resources.minerals < 100) return;
      if (Resources.supplyUsed > Resources.supplyLimit - 2) return;

      createBuildWarriorJob(factory);

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

function createBuildWarriorJob(factory) {
  let job = jobs.get(factory);

  if (!job) {
    job = new BuildingTrain("Zealot", factory);

    jobs.set(factory, job);
  }
}
