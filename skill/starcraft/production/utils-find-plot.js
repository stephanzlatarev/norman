import { Board, Depot, Resources, ALERT_WHITE } from "./imports.js";

const COOLDOWN_LOOPS = 500;

const cooldown = new Map();
let cooldownSite;

//TODO: Optimize by remembering found plots and re-using them when pylons are destroyed but otherwise continue the search from where last plot was found
export function findBuildingPlot() {
  for (const zone of Depot.list()) {
    if (!zone.depot) continue;
    if ((zone.alertLevel > ALERT_WHITE) && !zone.workers.size) continue;

    for (const site of zone.sites) {
      const lastAttempt = cooldown.get(site);

      if (lastAttempt && (Resources.loop - lastAttempt < COOLDOWN_LOOPS)) {
        // This site is on cooldown
        continue;
      }

      for (const plot of site.medium) {
        if (isPlotFree(plot) && isPowered(plot)) {
          cooldownSite = site;
          return plot;
        }
      }
    }
  }
}

function isPlotFree(plot) {
  for (let x = plot.x - 1; x <= plot.x + 1; x++) {
    for (let y = plot.y - 1; y <= plot.y + 1; y++) {
      const cell = Board.cell(x, y);

      if (cell.isObstructed()) {
        return false;
      }
    }
  }

  return true;
}

function isPowered(plot) {
  const zone = plot.zone;

  for (const pylon of zone.buildings) {
    if (!pylon.type.isPylon) continue;
    if (!pylon.isActive) continue;

    if ((Math.abs(pylon.body.x - plot.x) < 5) && (Math.abs(pylon.body.y - plot.y) < 5)) {
      return true;
    }
  }
}
