
const units = new Map();
const upgrades = new Map();
const products = new Map();
const races = [[], [], [], []];

const IS_DEPOT = { Nexus: 1 };
const IS_EXTRACTOR = { Assimilator: 1 };
const IS_PYLON = { Pylon: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };

const RACE_PROTOSS = 3;

const ATTRIBUTE_STRUCTURE = 8;

class Types {

  product(abilityId) {
    return get(products, abilityId);
  }

  unit(key) {
    return get(units, key);
  }

  upgrade(key) {
    return get(upgrades, key);
  }

  list(race) {
    return races[race];
  }

  sync(data) {
    for (const unit of data.units) {
      if (!unit.available) continue;
      if (!unit.attributes.length) continue;

      const isNeutral = !unit.race;
      const isBuilding = (unit.attributes.indexOf(ATTRIBUTE_STRUCTURE) >= 0);

      const type = this.unit(unit.name);

      type.id = unit.unitId;
      type.name = unit.name;

      type.isNeutral = isNeutral;
      type.isDepot = !!IS_DEPOT[unit.name];
      type.isPylon = !!IS_PYLON[unit.name];
      type.isWorker = !!IS_WORKER[unit.name];
      type.isWarrior = !isBuilding && !isNeutral;
      type.isExtractor = !!IS_EXTRACTOR[unit.name];
      type.isBuilding = isBuilding && !isNeutral;
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

      // Assume average of 10 seconds for 1 supply of production
      type.supplyConsumptionRate = (isBuilding && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name]) ? 1 / 10 / 22.4 : 0;

      units.set(unit.unitId, type);
      units.set(unit.name, type);

      races[unit.race].push(type);

      if (type.abilityId) {
        products.set(type.abilityId, type);
      }
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

function get(collection, key) {
  let type = collection.get(key);

  if (!type) {
    type = { name: "Other" };

    collection.set(key, type);
  }

  return type;
}

export default new Types();
