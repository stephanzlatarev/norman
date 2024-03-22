import Types from "../types.js";
import Units from "../units.js";

const active = new Map();
const total = new Map();

export const ActiveCount = {
  CyberneticsCore: 0,
  Gateway: 0,
  Immortal: 0,
  Nexus: 0,
  Observer: 0,
  Probe: 0,
  Pylon: 0,
  RoboticsFacility: 0,
  Sentry: 0,
  Stalker: 0,
  Zealot: 0,
};

export const TotalCount = {
  CyberneticsCore: 0,
  Gateway: 0,
  Immortal: 0,
  Nexus: 0,
  Observer: 0,
  Probe: 0,
  Pylon: 0,
  RoboticsFacility: 0,
  Sentry: 0,
  Stalker: 0,
  Zealot: 0,
};

export default function(observation, race) {
  // Count units by type
  for (const type of Types.list(race)) {
    active.set(type.name, 0);
    total.set(type.name, 0);
  }

  count(Units.buildings().values());
  count(Units.warriors().values());
  count(Units.workers().values());

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
}

function count(units) {
  for (const unit of units) {
    increment(total, unit.type.name);

    if (unit.isActive) {
      increment(active, unit.type.name);
    }
  }
}

function increment(map, key) {
  const count = map.get(key);

  map.set(key, count ? count + 1 : 1);
}
