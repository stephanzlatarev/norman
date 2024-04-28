import Mission from "../mission.js";
import Order from "../order.js";
import Job from "../job.js";
import Units from "../units.js";
import Priority from "../memo/priority.js";

const CAN_CHRONOBOOST = {
  Gateway: true,
  Nexus: true,
  RoboticsFacility: true,
};

export default class ChronoboostMission extends Mission {

  run() {
    let jobs;

    for (const nexus of Units.buildings().values()) {
      if (nexus.type.name !== "Nexus") continue;
      if (!nexus.isActive) continue;
      if (nexus.energy < 50) continue;

      if (!jobs) jobs = listJobs();
      if (!jobs.length) break;

      const job = jobs[0];

      new Order(nexus, 3755, job.assignee).accept(order => (order.target.boost > 0));

      job.assignee.boost = 1;
      jobs.splice(0, 1);
    }
  }

}

function listJobs() {
  const jobs = [];

  for (const job of Job.list()) {
    if (!job.output || !job.output.name) continue;          // The output of the order is unknown
    if (!job.assignee) continue;                            // The order is not assigned yet
    if (!job.assignee.order.progress) continue;             // The facility hasn't started work on the order yet
    if (job.assignee.boost > 0) continue;                   // This facility is already chronoboosted
    if (!CAN_CHRONOBOOST[job.assignee.type.name]) continue; // This facility cannot be chronoboosted

    const prio = Priority[job.output.name];
    if (!prio) continue;

    jobs.push(job);
  }

  return jobs.sort((a, b) => (Priority[b.output.name] - Priority[a.output.name]));
}
