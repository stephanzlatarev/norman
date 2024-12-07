import { traceBattle } from "./trace.js";

const battles = [];

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";
  static MODE_MARCH = "march";
  static MODE_SMASH = "smash";
  static MODE_WATCH = "watch";

  recruitedBalance = 0;
  deployedBalance = 0;

  pastmode = Battle.MODE_WATCH;
  mode = Battle.MODE_WATCH;

  lines = [];

  detector;
  fighters;

  constructor(hotspot) {
    this.hotspot = hotspot;
    this.zones = hotspot.zones;

    this.zone = hotspot.center;
    this.priority = 100 - this.zone.tier.level;

    this.detector = null;
    this.fighters = [];

    battles.push(this);

    traceBattle(this, "begins");
  }

  setHotspot(hotspot) {
    this.hotspot = hotspot;
    this.zones = hotspot.zones;

    if (this.zone !== hotspot.center) {
      traceBattle(this, "moves to " + hotspot.center.name);

      this.zone = hotspot.center;
      this.priority = 100 - this.zone.tier.level;

      if (this.detector) {
        this.detector.updateBattle(this);
      }

      for (const fighter of this.fighters) {
        fighter.updateBattle(this);
      }
    }
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
