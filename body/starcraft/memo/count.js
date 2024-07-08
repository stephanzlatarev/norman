import Types from "../types.js";
import Order from "../order.js";
import Units from "../units.js";
import Depot from "../map/depot.js";

const active = new Map();
const total = new Map();

export const ActiveCount = {
  Assimilator: 0,
  CyberneticsCore: 0,
  Gateway: 0,
  Immortal: 0,
  Nexus: 0,
  Observer: 0,
  Probe: 0,
  Pylon: 0,
  RoboticsFacility: 0,
  ShieldBattery: 0,
  Sentry: 0,
  Stalker: 0,
  TwilightCouncil: 0,
  Zealot: 0,

  HarvesterCapacity: 0,
};

export const TotalCount = { ...ActiveCount };

export default function(observation, race) {
  // Count units by type
  for (const type of Types.list(race)) {
    active.set(type.name, 0);
    total.set(type.name, 0);
  }

  countUnits(Units.buildings().values());
  countUnits(Units.warriors().values());
  countUnits(Units.workers().values());
  countProduction(Units.buildings().values());
  countOrders();

  for (const [type, count] of active) {
    ActiveCount[type] = count;
  }

  for (const [type, count] of total) {
    TotalCount[type] = count;
  }
  
  // Set count of upgrades by type
  for (const id of observation.rawData.player.upgradeIds) {
    const upgradeName = Types.upgrade(id).name;

    ActiveCount[upgradeName] = 1;
    TotalCount[upgradeName] = 1;
  }

  // Count capacity
  TotalCount.HarvesterCapacity = 0;
  ActiveCount.HarvesterCapacity = 0;
  for (const depot of Depot.list()) {
    TotalCount.HarvesterCapacity += depot.capacity;

    if (depot.isActive) {
      ActiveCount.HarvesterCapacity += depot.capacity;
    }
  }
}

function countUnits(units) {
  for (const unit of units) {
    increment(total, unit.type.name);

    if (unit.isActive) {
      increment(active, unit.type.name);
    }
  }
}

function countProduction(facilities) {
  for (const facility of facilities) {
    if (!facility.order.abilityId) continue;

    increment(total, Types.product(facility.order.abilityId).name);
  }
}

function countOrders() {
  for (const order of Order.list()) {
    if (!order.output) continue;

    increment(total, order.output.name);
  }
}

function increment(map, key) {
  const count = map.get(key);

  map.set(key, count ? count + 1 : 1);
}
