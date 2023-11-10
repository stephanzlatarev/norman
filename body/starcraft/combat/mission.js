
export default class Mission {

  static Assault = Symbol("assault");
  static Diversion = Symbol("diversion");
  static Future = Symbol("future");
  static Scout = Symbol("scout");

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
      type: this.type.description,
      target: (this.target && this.target.tag) ? this.target.tag : null,
      warriors: this.warriors.map(warrior => warrior.tag),
    };
  }

}
