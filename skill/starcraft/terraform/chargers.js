import { Board, Build, Zone } from "./imports.js";

let job = null;

export default function() {
  if (job) {
    if (job.isFailed) {
      job = null;
    } else if (job.isDone) {
      job = null;
    } else {
      return;
    }
  }

  const target = findTarget();

  if (target) {
    job = new Build(target.type, target.plot);
    job.priority = 80;
  }
}

function findTarget() {
  for (const zone of Zone.list()) {
    if (!zone.depot) continue;
    if (hasShieldBattery(zone)) continue;

    const exit = findExit(zone);
    if (!exit) continue;

    const site = findClosestSite(zone, exit);
    if (!site) continue;

    if (!hasPylonInSite(zone, site)) {
      const plot = findFreePlot(site.pylon);
      if (plot) return { type: "Pylon", plot };
    } else {
      const plot = findBatteryPlot(site);
      if (plot) return { type: "ShieldBattery", plot };
    }
  }
}

function hasShieldBattery(zone) {
  for (const building of zone.buildings) {
    if (building.type.name === "ShieldBattery") return true;
  }

  return false;
}

function findExit(zone) {
  let best = null;

  for (const [neighbor, corridor] of zone.exits) {
    if (!corridor.isGroundPassable) continue;

    const exit = corridor.via || neighbor;

    if (!best || (exit.perimeterLevel > best.perimeterLevel)) {
      best = exit;
    }
  }

  return best;
}

function findClosestSite(zone, exit) {
  let bestDistance = Infinity;
  let bestSite = null;

  for (const site of zone.sites) {
    const distance = calculateSquareDistance(site, exit);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestSite = site;
    }
  }

  return bestSite;
}

function hasPylonInSite(zone, site) {
  for (const building of zone.buildings) {
    if (!building.type.isPylon) continue;
    if (Math.abs(building.body.x - site.x) < 5 && Math.abs(building.body.y - site.y) < 5) return true;
  }

  return false;
}

function findBatteryPlot(site) {
  return findFreePlot(site.battery) || findFreePlot(site.small);
}

function findFreePlot(plots) {
  for (const plot of plots) {
    if (isPlotFree(plot)) return plot;
  }
}

function isPlotFree(plot) {
  for (let x = plot.x - 1; x <= plot.x; x++) {
    for (let y = plot.y - 1; y <= plot.y; y++) {
      const cell = Board.cell(x, y);

      if (cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
