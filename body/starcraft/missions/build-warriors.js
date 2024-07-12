import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const jobs = new Map();

// Units are ordered from cheapest to most expensive so that the cheaper ones are not blocked by resources
const FACILITY_PRODUCTS = {
  Gateway: ["Zealot", "Stalker", "Sentry"],
  RoboticsFacility: ["Observer", "Immortal", "Colossus"],
};
const UNIT_PREREQUISITES = {
  Colossus: "RoboticsBay",
  Sentry: "CyberneticsCore",
  Stalker: "CyberneticsCore",
};

export default class BuildWarriorsMission extends Mission {

  run() {
    removeCompletedJobs();

    if (Resources.supplyUsed >= Resources.supplyLimit) return;

    for (const facility of Units.buildings().values()) {
      if (facility.isActive && FACILITY_PRODUCTS[facility.type.name] && !jobs.has(facility)) {
        createProduceJob(facility);
      }
    }
  }

}

function removeCompletedJobs() {
  for (const [tag, job] of jobs) {
    if (job.isDone || job.isFailed) {
      jobs.delete(tag);
    } else if (isObsolete(job)) {
      job.close(false);
      jobs.delete(tag);
    }
  }
}

// Check if limits have changes since the facility opened the job
function isObsolete(job) {
  return !job.order && (TotalCount[job.output.name] >= Limit[job.output.name]);
}

function createProduceJob(facility) {
  let job = jobs.get(facility);

  if (!job) {
    const product = selectProductType(facility);

    if (product) {
      job = new Produce(facility, Types.unit(product));

      jobs.set(facility, job);

      TotalCount[product]++;
    }
  }
}

function selectProductType(facility) {
  const products = FACILITY_PRODUCTS[facility.type.name];
  const available = [];

  for (const product of products) {
    if (TotalCount[product] >= Limit[product]) continue;

    const prerequisite = UNIT_PREREQUISITES[product];
    if (prerequisite && !ActiveCount[prerequisite]) continue;

    available.push(product);
  }

  if (!available.length) return;
  if (available.length === 1) return available[0];

  available.sort((a, b) => (Priority[b] - Priority[a]));

  for (let index = 0; index < available.length - 1; index++) {
    const first = available[index];
    const second = available[index + 1];

    if (Priority[first] > Priority[second]) {
      // Higher priority is produced first
      return first;
    } else if (TotalCount[first] * Limit[second] <= TotalCount[second] * Limit[first]) {
      // First in the list is produced first to reach ratio
      return first;
    }
  }

  return available[available.length - 1];
}
