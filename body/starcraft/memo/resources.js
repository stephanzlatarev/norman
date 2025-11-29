import Memory from "../../../code/memory.js";

class Resources {

  loop = 0;
  minerals = 0;
  vespene = 0;
  supply = 0;
  supplyLimit = 0;
  supplyUsed = 0;

  sync(observation) {
    this.loop = observation.gameLoop;
    this.minerals = observation.playerCommon.minerals;
    this.vespene = observation.playerCommon.vespene;
    this.supplyLimit = observation.playerCommon.foodCap;
    this.supplyUsed = observation.playerCommon.foodUsed;
    this.supply = (this.supplyLimit > this.supplyUsed) ? this.supplyLimit - this.supplyUsed : 0;

    Memory.Loop = this.loop;
  }

}

export default new Resources();
