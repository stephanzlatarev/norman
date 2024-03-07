
const types = new Map();

const IS_DEPOT = { Nexus: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };
const NEEDS_POWER = { Gateway: 1, Robotics: 1, Stargate: 1 };

class Types {

  [Symbol.iterator]() {
    return types[Symbol.iterator]();
  }

  get(id) {
    return types.get(id);
  }

  sync(units) {
    for (const unit of units) {
      if (!unit.available) continue;

      const type = {
        id: unit.unitId,
        name: unit.name,

        isDepot: IS_DEPOT[unit.name],
        isPylon: (unit.name === "Pylon"),
        isWorker: IS_WORKER[unit.name],
        isWarrior: !!unit.weapons.length,
        isBuilding: !unit.movementSpeed && !unit.hasMinerals && !unit.hasVespene,
        isMinerals: !!unit.hasMinerals,
        isVespene: !!unit.hasVespene,

        supplyProvided: unit.foodProvided,
        needsPower: NEEDS_POWER[unit.name],

        movementSpeed: unit.movementSpeed,
        sightRange: unit.sightRange,

        actionToBuild: unit.abilityId,
        buildTime: unit.buildTime,
        foodRequired: unit.foodRequired,
        mineralCost: unit.mineralCost,
        vespeneCost: unit.vespeneCost,
        techRequirement: unit.techRequirement,
      };

      types.set(unit.unitId, type);
      types.set(unit.name, type);
    }
  }

}

types.set("Building", { isBuilding: true });
types.set("Worker", { isWorker: true });

export default new Types();
