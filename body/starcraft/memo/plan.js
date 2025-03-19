import { ActiveCount } from "./count.js";

const owners = new Map();

class Plan {

  static WALL_NATURAL_OFF = 0;
  static WALL_NATURAL_DEFEND = 1;
  static WALL_NATURAL_READY = 2;
  static WallNatural = Plan.WALL_NATURAL_OFF;

  static MULTI_BASE = 0;
  static ONE_BASE = 1;
  static TWO_BASE = 2;
  static BaseLimit = Plan.MULTI_BASE;

  static setBaseLimit(owner, value) {
    owners.set(owner, value);

    let limit = Infinity;

    for (const value of owners.values()) {
      if (value > 0) {
        limit = Math.min(limit, value);
      }
    }

    Plan.BaseLimit = (limit < Infinity) ? limit : 0;
  }

  static isBaseEstablished() {
    if (Plan.BaseLimit === Plan.ONE_BASE) {
      if (ActiveCount.Probe < 26) return false;
    } else {
      if (ActiveCount.Nexus < 2) return false;
      if (ActiveCount.Probe < 52) return false;
    }

    if (!ActiveCount.Gateway) return false;
    if (!ActiveCount.CyberneticsCore) return false;
    if (ActiveCount.Assimilator < 4) return false;
    if (ActiveCount.Stalker < 4) return false;
    if (!ActiveCount.Observer) return false;

    return true;
  }

}

export default Plan;
