
const types = new Map();
const races = [[], [], [], []];

const IS_DEPOT = { Nexus: 1 };
const IS_EXTRACTOR = { Assimilator: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };
const NEEDS_POWER = { Forge: 1, Gateway: 1, Robotics: 1, Stargate: 1 };

const ATTRIBUTE_STRUCTURE = 8;

class Types {

  [Symbol.iterator]() {
    return types[Symbol.iterator]();
  }

  get(key) {
    return types.get(key);
  }

  list(race) {
    return races[race];
  }

  sync(data) {
    for (const unit of data.units) {
      if (!unit.available) continue;
      if (!unit.attributes.length) continue;

      const isBuilding = (unit.attributes.indexOf(ATTRIBUTE_STRUCTURE) >= 0);

      const type = {
        id: unit.unitId,
        name: unit.name,

        isDepot: !!IS_DEPOT[unit.name],
        isPylon: (unit.name === "Pylon"),
        isWorker: !!IS_WORKER[unit.name],
        isWarrior: !isBuilding,
        isExtractor: !!IS_EXTRACTOR[unit.name],
        isBuilding: isBuilding,
        isMinerals: !!unit.hasMinerals,
        isVespene: !!unit.hasVespene && !unit.race,

        supplyProvided: unit.foodProvided,
        needsPower: !!NEEDS_POWER[unit.name],

        movementSpeed: unit.movementSpeed,
        sightRange: unit.sightRange,

        abilityId: unit.abilityId,
        buildTime: unit.buildTime,
        foodRequired: unit.foodRequired,
        mineralCost: unit.mineralCost,
        vespeneCost: unit.vespeneCost,
        techRequirement: unit.techRequirement,
      };

      types.set(unit.unitId, type);
      types.set(unit.name, type);

      races[unit.race].push(type);
    }

    for (const upgrade of data.upgrades) {
      if (upgrade.abilityId) {
        types.set(upgrade.name, upgrade);
      }
    }
  }

}

types.set("Building", { isBuilding: true });
types.set("Worker", { isWorker: true });

export default new Types();
