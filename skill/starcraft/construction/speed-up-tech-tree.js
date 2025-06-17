import { Depot, Job, Order, Units, ActiveCount, TotalCount } from "./imports.js";

let jobWaitOnPylonSite = null;
let probe = null;
let rally = null;

export default function() {
  if (!Depot.home) return;

  if (jobWaitOnPylonSite && TotalCount.Pylon) cleanJobWaitOnPylonSite();

  if (!TotalCount.Pylon) {
    buildFirstPylon();
  } else if (ActiveCount.Pylon && !TotalCount.Gateway) {
    buildFirstGateway();
  }
}

class WaitOnSite extends Job {

  constructor(rally) {
    super("Probe", null, rally);

    this.priority = 70;  // Higher than harvest jobs and lower than build jobs
    this.isBusy = false; // Allows to re-assign the probe to the build job
  }

  accepts(unit) {
    return (unit === probe);
  }

  execute() {
    Order.move(this.assignee, this.target);
  }

}

function findPylon() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.isPylon) {
      return unit;
    }
  }
}

function cleanJobWaitOnPylonSite() {
  if (findPylon()) {
    if (jobWaitOnPylonSite) {
      jobWaitOnPylonSite.close(true);
      jobWaitOnPylonSite = null;
    }

    probe = null;
    rally = null;
  }
}

function buildFirstPylon() {
  if (jobWaitOnPylonSite) return;

  if (!probe) probe = selectProbeForFirstPylon();
  if (!rally) rally = selectRallyForFirstPylon();

  if (probe && rally) {
    jobWaitOnPylonSite = new WaitOnSite(rally);
  }
}

// Pick one of a pair of probes assigned to harvest the same mineral field.
// Instead of waiting for the its pair to finish harvesting, it will go to build the first pylon.
function selectProbeForFirstPylon() {
  const targets = new Set();

  for (const worker of Depot.home.workers) {
    if (worker.job && worker.job.target) {
      if (targets.has(worker.job.target)) {
        return worker;
      }

      targets.add(worker.job.target);
    }
  }
}

// Rally point for the first pylon is at the wall site of the home base, a step from the pylon plot.
function selectRallyForFirstPylon() {
  const site = Depot.home.sites.find(s => s.isWall);

  if (site) {
    const pylonpos = site.pylon[0];
    const wallpos = site.wall[0];

    return {
      x : pylonpos.x + ((wallpos.x >= pylonpos.x) ? 0.8 : -0.8),
      y : pylonpos.y + ((wallpos.y >= pylonpos.y) ? 0.8 : -0.8),
    };
  }
}

function buildFirstGateway() {
}
