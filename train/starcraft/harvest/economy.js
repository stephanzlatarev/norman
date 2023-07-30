import Depot from "./depot.js";
import Worker from "./worker.js";
import Monitor from "./monitor.js";

const WORKERS = { 84: "probe" };

const LIMIT_WORKERS = 200;

export default class Economy {

  constructor(client, map, base) {
    this.client = client;
    this.depots = [];
    this.workers = [];

    for (const cluster of map.clusters.filter(cluster => !!cluster.nexus)) {
      const pos = cluster.nexus;
      const mineralFields = cluster.resources.filter(resource => (resource.type === "mineral"));

      this.depots.push(new Depot(base, pos, mineralFields));
    }
  }

  async run(time, observation, units) {
    this.sync(units);

    await this.manage(time, observation);

    Monitor.show();
  }

  sync(units) {
    if (!this.workers.length) {
      for (const [_, unit] of units) {
        if (WORKERS[unit.unitType]) {
          this.workers.push(new Worker(unit));
        }
      }
    }

    for (let i = this.workers.length - 1; i >= 0; i--) {
      const worker = this.workers[i];

      if (!worker.sync(units)) {
        this.workers.splice(i, 1);
      }
    }

    for (let i = this.depots.length - 1; i >= 0; i--) {
      const depot = this.depots[i];

      if (!depot.sync(units)) {
        this.depots.splice(i, 1);
      }
    }
  }

  async manage(time, observation) {
    let miningOpportunities;

    for (const worker of this.workers) {
      if (!worker.isActive) continue;

      if (!worker.isWorking()) {
        miningOpportunities = this.assignWorker(time, worker, observation, miningOpportunities);
      }

      if (worker.job) {
        await worker.job.perform(this.client, time, worker);
      }
    }

    if (this.workers.length < LIMIT_WORKERS) {
      await this.createWorker(observation);
    }
  }

  assignWorker(time, worker, observation, miningOpportunities) {
    if (!miningOpportunities) {
      // First priority: Build a new depot at an expansion location
      if (observation.playerCommon.minerals >= 400) {
        const expansionSite = findClosestExpansionSite(this.depots);

        if (expansionSite) {
          expansionSite.build(worker);
          observation.playerCommon.minerals -= 400;
          return;
        }
      }

      // Next priority: Build an assimilator at an existing depot

      // The following options depend on opportunities for mining
      miningOpportunities = findMiningOpportunities(this.depots, this.workers);
    }

    // Next priority: Mine at the same depot
    if (worker.depot && shouldDepotKeepWorker(miningOpportunities, worker.depot)) {
      worker.depot.hire(time, worker);
      takeMiningOpportunity(miningOpportunities, worker.depot);
      return miningOpportunities;
    }

    // Next priority: Transfer to the closest depot which needs workers
    const opportunity = getClosestMiningOpportunity(miningOpportunities, worker);
    if (opportunity) {
      opportunity.depot.hire(time, worker);
      takeMiningOpportunity(miningOpportunities, opportunity.depot);
      return miningOpportunities;
    } else {
      return miningOpportunities;
    }
  }

  async createWorker(observation) {
    const hasMinerals = (observation.playerCommon.minerals >= 50);
    const hasFood = ((observation.playerCommon.foodCap - observation.playerCommon.foodUsed) >= 1);

    if (hasMinerals && hasFood) {
      for (const depot of this.depots) {
        const ok = await depot.produce(this.client);

        if (ok) {
          this.workers.push(new Worker(null, depot));

          observation.playerCommon.minerals -= 50;
          observation.playerCommon.foodUsed += 1;
        }
      }
    }
  }

}

function findClosestExpansionSite(depots) {
  let closestDepot;
  let closestDistance = Infinity;

  for (const depot of depots) {
    if (!depot.isActive && !depot.isBuilding && (depot.distance < closestDistance)) {
      closestDepot = depot;
      closestDistance = depot.distance;
    }
  }

  return closestDepot;
}

function findMiningOpportunities(depots, workers) {
  const opportunities = new Map();

  for (const depot of depots) {
    opportunities.set(depot, { depot: depot, busy: 0, idle: 0 });
  }

  for (const worker of workers) {
    if (worker.depot && worker.job) {
      const opportunity = opportunities.get(worker.depot);

      if (opportunity) {
        if (worker.isWorking()) {
          opportunity.busy++;
        } else {
          opportunity.idle++;
        }
      }
    }
  }

  for (const [depot, opportunity] of opportunities) {
    if ((opportunity.busy + opportunity.idle) >= depot.workerLimit) {
      opportunities.delete(depot);
    }
  }

  return opportunities;
}

function takeMiningOpportunity(opportunities, depot) {
  const opportunity = opportunities.get(depot);

  if (opportunity) {
    opportunity.busy++;

    if ((opportunity.busy + opportunity.idle) >= depot.workerLimit) {
      opportunities.delete(depot);
    }
  }
}

function shouldDepotKeepWorker(opportunities, depot) {
  const opportunity = opportunities.get(depot);
  return (depot.workerLimit > (opportunity ? opportunity.busy : 0));
}

function getClosestMiningOpportunity(opportunities, worker) {
  let closestOpportunity;
  let closestDistance = Infinity;

  for (const [depot, opportunity] of opportunities) {
    const distance = squareDistance(depot.pos, worker.pos);

    if (distance < closestDistance) {
      closestOpportunity = opportunity;
      closestDistance = distance;
    }
  }

  return closestOpportunity;
}

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
