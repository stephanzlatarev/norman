import { Depot, Units, TotalCount } from "./imports.js";
import WaitOnSite from "./job-wait-on-site.js";

let jobWaitOnShieldBatterySite = null;
let probe = null;
let rally = null;
let cybercore = null;
let battery = null;

export default function() {
  if (!Depot.home) return;

  if (jobWaitOnShieldBatterySite && TotalCount.ShieldBattery) cleanJobWaitOnShieldBatterySite();
  if (TotalCount.CyberneticsCore && !cybercore) cybercore = findCyberCore();

  if (!TotalCount.ShieldBattery && cybercore && (cybercore.buildProgress > 0.82)) {
    buildShieldBattery();
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

    return {
      x : batterypos.x + ((wallpos.x >= batterypos.x) ? 0.8 : -0.8),
      y : batterypos.y + ((wallpos.y >= batterypos.y) ? -0.8 : 0.8),
    };
  }
}
