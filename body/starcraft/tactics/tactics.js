import DelayFirstEnemyExpansionMission from "./delay-first-enemy-expansion-mission.js";

export default class Tactics {

  // TODO: Move map to memory and remove the constructor
  constructor(map, model) {
    new DelayFirstEnemyExpansionMission(map, model);
  }

}
