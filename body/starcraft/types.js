
const types = new Map();
const races = [[], [], [], []];

const IS_DEPOT = { Nexus: 1 };
const IS_EXTRACTOR = { Assimilator: 1 };
const IS_PYLON = { Pylon: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };

const RACE_PROTOSS = 3;

const ATTRIBUTE_STRUCTURE = 8;

const TYPE_OTHER = { name: "Other" };

class Types {

  [Symbol.iterator]() {
    return types[Symbol.iterator]();
  }

  get(key) {
    const type = types.get(key);

    return type ? type : TYPE_OTHER;
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
        isPylon: !!IS_PYLON[unit.name],
        isWorker: !!IS_WORKER[unit.name],
        isWarrior: !isBuilding,
        isExtractor: !!IS_EXTRACTOR[unit.name],
        isBuilding: isBuilding,
        isMinerals: !!unit.hasMinerals,
        isVespene: !!unit.hasVespene && !unit.race,

        supplyProvided: unit.foodProvided,
        needsPower: (unit.race === RACE_PROTOSS) && !IS_DEPOT[unit.name] && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name],

        movementSpeed: unit.movementSpeed,
        sightRange: unit.sightRange,

        abilityId: unit.abilityId,
        buildTime: unit.buildTime,
        foodRequired: unit.foodRequired,
        mineralCost: unit.mineralCost,
        vespeneCost: unit.vespeneCost,
        techRequirement: unit.techRequirement,

        // TODO: Calculate the time needed to produce the fastest building unit
        produceTime: (isBuilding && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name]) ? 10 : 0,
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
