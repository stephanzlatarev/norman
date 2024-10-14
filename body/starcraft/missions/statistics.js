import Mission from "../mission.js";
import Units from "../units.js";
import { TotalCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = Math.round(LOOPS_PER_SECOND * 60);

let timeTotal = 0;
let timeSupplyBlocked = 0;

const harvestersMinerals = new Set();
const harvestersVespene = new Set();

let minerals = 0;
let vespene = 0;

const workerProduction = new Set();
let workerProductionUsed = 0;
let workerProductionTotal = 0;

const gatewayProduction = new Set();
let gatewayProductionUsed = 0;
let gatewayProductionTotal = 0;

export default class Statistics extends Mission {

  run() {
    if (Resources.loop > 0) {
      trackSupply();
      trackHarvest();
      trackWorkerProduction();
      trackGatewayProduction();

      if ((Resources.loop % LOOPS_PER_MINUTE) === 0) {
        show();
        clear();
      }
    }
  }

}

function clear() {
  timeTotal = 0;
  timeSupplyBlocked = 0;

  harvestersMinerals.clear();
  harvestersVespene.clear();

  minerals = 0;
  vespene = 0;

  workerProduction.clear();
  workerProductionUsed = 0;
  workerProductionTotal = 0;

  gatewayProduction.clear();
  gatewayProductionUsed = 0;
  gatewayProductionTotal = 0;
}

function trackSupply() {
  timeTotal++;

  if ((Resources.supplyLimit < 200) && (Resources.supplyUsed >= Resources.supplyLimit)) {
    timeSupplyBlocked++;
  }
}

function trackHarvest() {
  for (const worker of Units.workers().values()) {
    if (!worker.isCarryingHarvest) {
      if (harvestersMinerals.has(worker)) {
        minerals += 5;

        harvestersMinerals.delete(worker);
      } else if (harvestersVespene.has(worker)) {
        vespene += 4;

        harvestersVespene.delete(worker);
      }
    } else if (worker.job && worker.job.target && worker.job.target.type) {
      if (worker.job.target.type.isMinerals) {
        harvestersMinerals.add(worker);
      } else if (worker.job.target.type.isExtractor) {
        harvestersVespene.add(worker);
      }
    }
  }
}

function trackWorkerProduction() {
  for (const nexus of Units.buildings().values()) {
    if (!nexus.isActive) continue;
    if (nexus.type.name !== "Nexus") continue;

    workerProduction.add(nexus);
    workerProductionTotal++;

    if (nexus.order.abilityId) {
      workerProductionUsed++
    }
  }
}

function trackGatewayProduction() {
  for (const gateway of Units.buildings().values()) {
    if (!gateway.isActive) continue;
    if (gateway.type.name !== "Gateway") continue;

    gatewayProduction.add(gateway);
    gatewayProductionTotal++;

    if (gateway.order.abilityId) {
      gatewayProductionUsed++
    }
  }
}

function show() {
  const text = ["[stats]"];

  text.push("Supply:", (Resources.supplyUsed - TotalCount.Probe), "+", TotalCount.Probe, "/", Resources.supplyLimit, percentage(timeTotal - timeSupplyBlocked, timeTotal));
  text.push("|");
  text.push("Minerals:", minerals);
  text.push("|");
  text.push("Vespene:", vespene);
  text.push("|");
  text.push("Nexuses:", workerProduction.size, percentage(workerProductionUsed, workerProductionTotal));
  text.push("|");
  text.push("Gateways:", gatewayProduction.size, percentage(gatewayProductionUsed, gatewayProductionTotal));

  console.log(text.join(" "));
}

function percentage(used, total) {
  return total ? Math.round(used * 100 / total) + "%" : "-";
}
