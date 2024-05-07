import Mission from "../mission.js";
import Types from "../types.js";
import Units from "../units.js";
import Produce from "../jobs/produce.js";
import { ActiveCount, TotalCount } from "../memo/count.js";
import Limit from "../memo/limit.js";
import Priority from "../memo/priority.js";
import Resources from "../memo/resources.js";

const jobs = new Map();

const WARRIOR_PRODUCER = {
  Gateway: true,
  RoboticsFacility: true,
};

export default class BuildWarriorsMission extends Mission {

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

function createProduceWarriorJob(facility) {
  let job = jobs.get(facility);

  if (!job) {
    const warrior = selectWarriorType(facility);

    if (warrior && !hasReachedLimit(warrior)) {
      job = new Produce(facility, Types.unit(warrior));

      jobs.set(facility, job);

      TotalCount[warrior]++;
    }
  }
}

function hasReachedLimit(type) {
  const limit = Limit[type];

  return (limit >= 0) ? (TotalCount[type] >= limit) : false;
}

function selectWarriorType(facility) {
  if (facility.type.name === "Gateway") {
    if (ActiveCount.CyberneticsCore >= 1) {
      if (Priority.Zealot === Priority.Stalker) {
        // Keep ratio
        if ((TotalCount.Stalker <= TotalCount.Zealot * 4) && (TotalCount.Stalker <= TotalCount.Sentry * 4)) {
          return "Stalker";
        } else if ((TotalCount.Sentry * 4 <= TotalCount.Stalker) && (TotalCount.Sentry <= TotalCount.Zealot)) {
          return "Sentry";
        }
      } else {
        // Build highest priority
        if (Priority.Stalker > Priority.Zealot) {
          if (Priority.Stalker > Priority.Sentry) {
            return "Stalker";
          } else {
            return "Sentry";
          }
        }
      }
    }

    return "Zealot";
  } else if (facility.type.name === "RoboticsFacility") {
    if ((Limit.Observer >= 1) && (TotalCount.Observer < Limit.Observer)) {
      return "Observer";
    }

    return "Immortal";
  }
}
