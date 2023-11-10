
export default class Mission {

  static Assault = "assault";
  static Diversion = "diversion";
  static Future = "future";
  static Scout = "scout";

  constructor(type, target) {
    this.type = type;
    this.target = target;
    this.warriors = [];
  }

  engage(warrior) {
    this.warriors.push(warrior);
  }

  describe() {
    return {
      type: this.type,
      target: describeTarget(this.target),
      warriors: this.warriors.map(warrior => warrior.tag),
    };
  }

}

function describeTarget(target) {
  if (!target) {
    return null;
  } else if (target.tag) {
    return target.tag;
  } else if (target.x && target.y) {
    return target.x.toFixed(2) + ":" + target.y.toFixed(2);
  }
}
