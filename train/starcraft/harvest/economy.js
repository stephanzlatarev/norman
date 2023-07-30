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

  async run(time, observation, units, resources, enemies) {
    this.sync(units, resources);

    await this.expand(time, observation);
    // TODO: Equip. Build assimilators
    await this.mine(time);
    await this.hire(observation);

    for (const worker of this.workers) {
      if (worker.isActive && worker.job) {
        await worker.job.perform(this.client, time, worker);
      }
    }

    Monitor.show();
  }

  sync(units, resources) {
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

      if (!depot.sync(units, resources)) {
        this.depots.splice(i, 1);
      }
    }
  }

  async expand(time, observation) {
    if (observation.playerCommon.minerals >= 400) {
      const expansionSite = findClosestExpansionSite(this.depots);
      const builder = expansionSite ? findClosestAvailableWorker(this.workers, expansionSite) : null;

      if (builder) {
        expansionSite.build(builder);
        await builder.job.perform(this.client, time, builder);

        observation.playerCommon.minerals -= 400;
      }
    }
  }

  async mine(time) {
    const miningOpportunities = findMiningOpportunities(this.depots, this.workers);

    for (const worker of this.workers) {
      if (worker.isActive && !worker.isWorking() && miningOpportunities.size) {
        if (worker.depot && shouldDepotKeepWorker(miningOpportunities, worker.depot)) {
          worker.depot.hire(time, worker);
          takeMiningOpportunity(miningOpportunities, worker.depot);
        } else {
          const opportunity = getClosestMiningOpportunity(miningOpportunities, worker);

          if (opportunity) {
            opportunity.depot.hire(time, worker);
            takeMiningOpportunity(miningOpportunities, opportunity.depot);
          }
        }
      }
    }
  }

  async hire(observation) {
    if (this.workers.length < LIMIT_WORKERS) {
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

function findClosestAvailableWorker(workers, site) {
  const depots = new Set();
  for (const worker of workers) {
    if (worker.depot && worker.isActive && worker.depot.isActive) {
      depots.add(worker.depot);
    }
  }

  let closestDepot;
  let closestDistance = Infinity;
  for (const depot of depots) {
    const distance = squareDistance(depot.pos, site.pos);

    if (distance < closestDistance) {
      closestDepot = depot;
      closestDistance = distance;
    }
  }

  for (const worker of workers) {
    if ((worker.depot === closestDepot) && worker.isActive && !worker.isWorking()) {
      return worker;
    }
  }
}

function findMiningOpportunities(depots, workers) {
  const opportunities = new Map();

  for (const depot of depots) {
    if (depot.isActive) {
      opportunities.set(depot, { depot: depot, busy: 0, idle: 0 });
    }
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
