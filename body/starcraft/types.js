
const units = new Map();
const upgrades = new Map();
const races = [[], [], [], []];

const IS_DEPOT = { Nexus: 1 };
const IS_EXTRACTOR = { Assimilator: 1 };
const IS_PYLON = { Pylon: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };

const RACE_PROTOSS = 3;

const ATTRIBUTE_STRUCTURE = 8;

class Types {

  unit(key) {
    let type = units.get(key);

    if (!type) {
      type = { name: "Other" };

      units.set(key, type);
    }

    return type;
  }

  upgrade(key) {
    let type = upgrades.get(key);

    if (!type) {
      type = { name: "Other" };

      upgrades.set(key, type);
    }

    return type;
  }

  list(race) {
    return races[race];
  }

  sync(data) {
    for (const unit of data.units) {
      if (!unit.available) continue;
      if (!unit.attributes.length) continue;

      const isBuilding = (unit.attributes.indexOf(ATTRIBUTE_STRUCTURE) >= 0);

      const type = this.unit(unit.name);

      type.id = unit.unitId;
      type.name = unit.name;

      type.isDepot = !!IS_DEPOT[unit.name];
      type.isPylon = !!IS_PYLON[unit.name];
      type.isWorker = !!IS_WORKER[unit.name];
      type.isWarrior = !isBuilding;
      type.isExtractor = !!IS_EXTRACTOR[unit.name];
      type.isBuilding = isBuilding;
      type.isMinerals = !!unit.hasMinerals;
      type.isVespene = !!unit.hasVespene && !unit.race;

      type.supplyProvided = unit.foodProvided;
      type.needsPower = (unit.race === RACE_PROTOSS) && !IS_DEPOT[unit.name] && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name];

      type.movementSpeed = unit.movementSpeed;
      type.sightRange = unit.sightRange;

      type.abilityId = unit.abilityId;
      type.buildTime = unit.buildTime;
      type.foodRequired = unit.foodRequired;
      type.mineralCost = unit.mineralCost;
      type.vespeneCost = unit.vespeneCost;
      type.techRequirement = unit.techRequirement;

      // TODO: Calculate the time needed to produce the fastest building unit
      type.produceTime = (isBuilding && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name]) ? 10 : 0;

      units.set(unit.unitId, type);
      units.set(unit.name, type);

      races[unit.race].push(type);
    }

    for (const upgrade of data.upgrades) {
      if (upgrade.abilityId) {
        upgrades.set(upgrade.upgradeId, upgrade);
        upgrades.set(upgrade.name, upgrade);
      }
    }
  }

}

units.set("Building", { isBuilding: true });
units.set("Worker", { isWorker: true });

export default new Types();
