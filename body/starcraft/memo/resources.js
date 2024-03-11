import Units from "../units.js";

class Resources {

  loop = 0;
  minerals = 0;
  supplyLimit = 0;
  supplyUsed = 0;
  supplyWorkers = 0;

  sync(observation) {
    this.loop = observation.gameLoop;
    this.minerals = observation.playerCommon.minerals;
    this.supplyLimit = observation.playerCommon.foodCap;
    this.supplyUsed = observation.playerCommon.foodUsed;

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