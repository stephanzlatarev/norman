import { Depot, Resources } from "./imports.js";

// True, when the delay is known
let initialized = false;
let initialRallyTarget;

class Delay {

  loops = 0;

  // Returns the estimated 
  pos(unit) {
    if (!this.loops) return unit.body;

    const current = unit.body;
    const lastpos = unit.lastPos || unit.body;
    const dx = current.x - lastpos.x;
    const dy = current.y - lastpos.y;

    return {
      x: current.x + dx * this.loops,
      y: current.y + dy * this.loops,
    };
  }

  sync() {
    if (initialized) return;

    if (!Depot.home) return;
    if (!Depot.home.depot) return;

    const rally = Depot.home.depot.rally;

    if (Resources.loop === 0) {
      initialRallyTarget = { ...rally };
    } else if (Resources.loop > 4) {
      // If not initialized until loop 4, assume game runs locally without delay
      initialized = true;
    } else if ((rally.x !== initialRallyTarget.x) || (rally.y !== initialRallyTarget.y)) {
      // We issue the rally target command on loop 0, and change should be observed on loop 1
      this.loops = Resources.loop - 1;

      console.log("Delay is", this.loops, "game loops");
      initialized = true;
    }
  }

}

export default new Delay();
