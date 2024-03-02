import DelayFirstEnemyExpansionMission from "./delay-first-enemy-expansion-mission.js";

export default class Tactics {

  mission1

  // TODO: Move map to memory and remove the constructor
  constructor(map, model) {
    this.mission1 = new DelayFirstEnemyExpansionMission(map, model);
  }

  run() {
    return this.mission1.isComplete() ? [] : [this.mission1];
  }

}
