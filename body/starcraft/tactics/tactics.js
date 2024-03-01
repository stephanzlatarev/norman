import DelayFirstEnemyExpansionMission from "./delay-first-enemy-expansion-mission.js";

const mission1 = new DelayFirstEnemyExpansionMission();

export default class Tactics {

  run() {
    return mission1.complete ? [] : [mission1];
  }

}
