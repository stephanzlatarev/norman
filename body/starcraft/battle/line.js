
export default class Line {

  static TYPE_AIR = "air";
  static TYPE_GROUND = "ground";

  fighters = [];
  stations = [];

  constructor(battle, zone) {
    this.battle = battle;
    this.zone = zone;
  }

}
