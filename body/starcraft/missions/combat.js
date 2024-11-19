import Mission from "../mission.js";
import combat from "../battle/combat.js";

export default class CombatMission extends Mission {

  run() {
    combat();
  }

}
