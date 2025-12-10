import { traceBattle } from "./trace.js";

const battles = [];

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";
  static MODE_MARCH = "march";
  static MODE_SMASH = "smash";
  static MODE_STAND = "stand";
  static MODE_WATCH = "watch";
  static MODE_WEAR = "wear";

  front; // The target zone of the battle
  rally; // The rally zone of the battle

  enemyHealth = 0;
  enemyStrength = 0;
  recruitedStrength = 0;
  deployedStrength = 0;
  recruitedBalance = 0;
  deployedBalance = 0;

  pastmode = Battle.MODE_WATCH;
  mode = Battle.MODE_WATCH;

  sectors = new Set();
  stations = [];

  detector;
  fighters;

  constructor(priority, front, rally) {
    this.detector = null;
    this.fighters = [];

    this.move(priority, front, rally);

    battles.push(this);
    traceBattle(this, "begins");
  }

  move(priority, front, rally) {
    rally = rally || front;

    if ((this.front !== front) || (this.rally !== rally)) {
      if (this.front) traceBattle(this, "moves to " + rally.name + " -> " + front.name);

      this.front = front;
      this.rally = rally;

      if (this.detector) {
        this.detector.updateBattle(this);
      }

      for (const fighter of this.fighters) {
        fighter.updateBattle(this);
      }
    }

    this.priority = priority;

    return this;
  }

  go(mode) {
    this.mode = mode;

    if (this.mode !== this.pastmode) {
      traceBattle(this, "mode: " + this.pastmode + " > " + this.mode);
      this.pastmode = this.mode;
    }
  }

  close() {
    const index = battles.indexOf(this);

    if (index >= 0) {
      traceBattle(this, "ends");

      if (this.detector) this.detector.close(true);

      for (const job of [...this.fighters]) {
        job.close(true);
      }

      battles.splice(index, 1);
    }
  }

  static list() {
    return [...battles];
  }

}
