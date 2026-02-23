import { Depot, Job, Limit, Memory, Priority, Units, TotalCount } from "./imports.js";
import WaitOnSite from "./job-wait-on-site.js";

let jobWaitOnShieldBatterySite = null;
let probe = null;
let rally = null;
let cybercore = null;
let battery = null;

export default function() {
  if (!Depot.home) return;

  if (jobWaitOnShieldBatterySite && !shouldBuildShieldBattery()) return jobWaitOnShieldBatterySite.close(false);

  if (jobWaitOnShieldBatterySite && TotalCount.ShieldBattery) cleanJobWaitOnShieldBatterySite();
  if (TotalCount.CyberneticsCore && !cybercore) {
    cybercore = findCyberCore();

    if ((Memory.LevelEnemyRush >= 3) && !probe) queueProbeToBuildCoreAndBattery();
  }

  if (shouldBuildShieldBattery() && isTimeToBuildShieldBattery()) {
    buildShieldBattery();
  }
}

function shouldBuildShieldBattery() {
  return Priority.ShieldBattery && Limit.ShieldBattery && !TotalCount.ShieldBattery;
}

function queueProbeToBuildCoreAndBattery() {
  for (const job of Job.list()) {
    if (job.assignee && job.output && (job.output.name === "CyberneticsCore")) {
      console.log("Designate", job.assignee.type.name, job.assignee.nick, "to build Shield Battery");
      probe = job.assignee;
      return;
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

function findShieldBattery() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.name === "ShieldBattery") {
      return unit;
    }
  }
}

function cleanJobWaitOnShieldBatterySite() {
  battery = findShieldBattery();

  if (battery) {
    if (jobWaitOnShieldBatterySite) {
      jobWaitOnShieldBatterySite.close(true);
      jobWaitOnShieldBatterySite = null;
    }

    probe = null;
    rally = null;
  }
}

function isTimeToBuildShieldBattery() {
  if (!cybercore) return false;

  if (Memory.LevelEnemyRush >= 3) {
    // When preparing for potential enemy zealot rush, body block the shield battery plot immediately to prevent enemy from blocking our wall
    return true;
  } else {
    return (cybercore.buildProgress > 0.82);
  }
}

function buildShieldBattery() {
  if (jobWaitOnShieldBatterySite) return;

  if (!probe) probe = selectProbe();
  if (!rally) rally = selectRally();

  if (probe && rally) {
    jobWaitOnShieldBatterySite = new WaitOnSite(probe, rally);
  }
}

function selectProbe() {
  for (const worker of Depot.home.workers) {
    if (worker.isCarryingMinerals) {
      return worker;
    }
  }
}

function selectRally() {
  const site = Depot.home.sites.find(s => s.isWall);

  if (site) {
    const batterypos = site.battery[0];
    const wallpos = site.wall[0];
    const step = (Memory.LevelEnemyRush >= 3) ? 0.2 : 0.8;

    return {
      x : batterypos.x + ((wallpos.x >= batterypos.x) ? step : -step),
      y : batterypos.y + ((wallpos.y >= batterypos.y) ? -step : step),
    };
  }
}
