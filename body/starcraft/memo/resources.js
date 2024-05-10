import Units from "../units.js";

class Resources {

  loop = 0;
  minerals = 0;
  vespene = 0;
  supply = 0;
  supplyLimit = 0;
  supplyUsed = 0;
  supplyWorkers = 0;

  sync(observation) {
    this.loop = observation.gameLoop;
    this.minerals = observation.playerCommon.minerals;
    this.vespene = observation.playerCommon.vespene;
    this.supplyLimit = observation.playerCommon.foodCap;
    this.supplyUsed = observation.playerCommon.foodUsed;
    this.supply = (this.supplyLimit > this.supplyUsed) ? this.supplyLimit - this.supplyUsed : 0;

    // TODO: Obsoleted by Count
    this.supplyWorkers = Units.workers().size + countWorkersInTraining();
  }

}

function countWorkersInTraining() {
  let count = 0;

  for (const [_, nexus] of Units.buildings()) {
    if (nexus.order.abilityId === 1006) {
      count++;
    }
  }

  return count;
}

export default new Resources();
