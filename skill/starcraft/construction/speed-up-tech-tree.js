import { Depot, Units, TotalCount } from "./imports.js";
import { findBuildingPlot } from "./utils-find-plot.js";
import WaitOnSite from "./job-wait-on-site.js";

let jobWaitOnPylonSite = null;
let jobWaitOnGatewaySite = null;
let jobWaitOnCyberCoreSite = null;
let probe = null;
let rally = null;

let pylon = null;
let gateway = null;
let cybercore = null;

export default function() {
  if (!Depot.home) return;

  if (jobWaitOnPylonSite && TotalCount.Pylon) cleanJobWaitOnPylonSite();
  if (jobWaitOnGatewaySite && TotalCount.Gateway) cleanJobWaitOnGatewaySite();
  if (jobWaitOnCyberCoreSite && TotalCount.CyberneticsCore) cleanJobWaitOnCyberCoreSite();

  if (!TotalCount.Pylon) {
    buildFirstPylon();
  } else if (!TotalCount.Gateway) {
    if (pylon && (pylon.buildProgress > 0.85)) {
      buildFirstGateway();
    }
  } else if (!TotalCount.CyberneticsCore) {
    if (gateway && (gateway.buildProgress > 0.85)) {
      buildCyberneticsCore();
    }
  }
}

function findPylon() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.isPylon) {
      return unit;
    }
  }
}

function findGateway() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.name === "Gateway") {
      return unit;
    }
  }
}

function findCyberCore() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.name === "CyberneticsCore") {
      return unit;
    }
  }
}

function cleanJobWaitOnPylonSite() {
  pylon = findPylon();

  if (pylon) {
    if (jobWaitOnPylonSite) {
      jobWaitOnPylonSite.close(true);
      jobWaitOnPylonSite = null;
    }

    probe = null;
    rally = null;
  }
}

function cleanJobWaitOnGatewaySite() {
  gateway = findGateway();

  if (gateway) {
    if (jobWaitOnGatewaySite) {
      jobWaitOnGatewaySite.close(true);
      jobWaitOnGatewaySite = null;
    }

    probe = null;
    rally = null;
  }
}

function cleanJobWaitOnCyberCoreSite() {
  cybercore = findCyberCore();

  if (cybercore) {
    if (jobWaitOnCyberCoreSite) {
      jobWaitOnCyberCoreSite.close(true);
      jobWaitOnCyberCoreSite = null;
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
    jobWaitOnPylonSite = new WaitOnSite(probe, rally);
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
  if (jobWaitOnGatewaySite) return;

  if (!probe) probe = selectProbeForFirstGateway();
  if (!rally) rally = selectRallyForFirstGateway();

  if (probe && rally) {
    jobWaitOnGatewaySite = new WaitOnSite(probe, rally);
  }
}

// Pick a worker that returns harvest
function selectProbeForFirstGateway() {
  for (const worker of Depot.home.workers) {
    if (worker.isCarryingHarvest) {
      return worker;
    }
  }
}

function selectRallyForFirstGateway() {
  const site = Depot.home.sites.find(s => s.isWall);

  if (site) {
    const gatewaypos = site.medium[0];

    return {
      x : gatewaypos.x + 0.5 + ((Depot.home.x >= gatewaypos.x) ? 0.8 : -0.8),
      y : gatewaypos.y + 0.5 + ((Depot.home.y >= gatewaypos.y) ? 0.8 : -0.8),
    };
  }
}

function buildCyberneticsCore() {
  if (jobWaitOnCyberCoreSite) return;

  if (!probe) probe = selectProbeForCyberneticsCore();
  if (!rally) rally = selectRallyForCyberneticsCore();

  if (probe && rally) {
    jobWaitOnCyberCoreSite = new WaitOnSite(probe, rally);
  }
}

function selectProbeForCyberneticsCore() {
  for (const worker of Depot.home.workers) {
    if (worker.isCarryingHarvest) {
      return worker;
    }
  }
}

function selectRallyForCyberneticsCore() {
  const plot = findBuildingPlot();

  if (plot) {
    return {
      x : plot.x + 0.5 + ((Depot.home.x >= plot.x) ? 0.8 : -0.8),
      y : plot.y + 0.5 + ((Depot.home.y >= plot.y) ? 0.8 : -0.8),
    };
  }
}
