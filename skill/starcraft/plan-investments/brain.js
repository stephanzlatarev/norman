import InitialStrategy from "./strategy-initial.js";
import StandardStrategy from "./strategy-standard.js";
import SingleBaseStrategy from "./strategy-single-base.js";
import CounterReapersRush from "./strategy-vs-reapers.js";
import CounterZerglingsStrategy from "./strategy-vs-zerglings.js";
import ZealotsOnlyStrategy from "./strategy-zealots-only.js";
import CounterQueensRush from "./strategy-vs-queens.js";

const STRATEGY = [
  new StandardStrategy(),
  new SingleBaseStrategy(),
  new CounterZerglingsStrategy(),
  new CounterReapersRush(),
  new ZealotsOnlyStrategy(),
  new CounterQueensRush(),
];

const UNITS = [
  "nexuses", "bases", "pylons", "assimilators", "gateways", "forges", "beacons", "stargates", "cybernetics", "councils", "shrines", "robotics",
  "motherships", "zealots", "stalkers", "sentries", "templars", "phoenixes", "carriers", "voidrays", "observers", "probes",
  "airWeapons", "airArmor", "groundWeapons", "groundArmor", "shields"
];

const FACTORY = {
  motherships: "nexuses",
  probes: "nexuses",
  zealots: "gateways",
  stalkers: "gateways",
  sentries: "gateways",
  templars: "gateways",
  observers: "robotics",
  phoenixes: "stargates",
  carriers: "stargates",
  voidrays: "stargates",
  groundWeapons: "forges",
  groundArmor: "forges",
  shields: "forges",
  airWeapons: "cybernetics",
  airArmor: "cybernetics",
};

const MINERALS = {
  nexuses: 400,
  bases: 100,
  pylons: 100,
  assimilators: 75,
  gateways: 150,
  forges: 150,
  beacons: 300,
  stargates: 150,
  cybernetics: 200,
  councils: 150,
  shrines: 150,
  robotics: 150,
  motherships: 400,
  zealots: 100,
  stalkers: 125,
  sentries: 50,
  templars: 125,
  phoenixes: 150,
  carriers: 350,
  voidrays: 250,
  observers: 25,
  probes: 50,
  airWeapons: 100,
  airArmor: 100,
  groundWeapons: 100,
  groundArmor: 100,
  shields: 100,
};

const VESPENE = {
  beacons: 200,
  stargates: 150,
  councils: 100,
  shrines: 150,
  robotics: 100,
  motherships: 400,
  stalkers: 50,
  sentries: 100,
  templars: 125,
  phoenixes: 100,
  carriers: 250,
  voidrays: 150,
  observers: 75,
  airWeapons: 100,
  airArmor: 100,
  groundWeapons: 100,
  groundArmor: 100,
  shields: 100,
};

const FOOD = {
  motherships: 8,
  zealots: 2,
  stalkers: 2,
  sentries: 2,
  templars: 2,
  phoenixes: 2,
  carriers: 6,
  voidrays: 4,
  observers: 1,
  probes: 1,
};

const POWERED = {
  gateways: true,
  forges: true,
  beacons: true,
  stargates: true,
  cybernetics: true,
  councils: true,
  shrines: true,
  robotics: true,
};

const PREREQUISITE = {
  beacons: (situation) => (situation.complete.stargates),
  stargates: (situation) => (situation.complete.cybernetics),
  cybernetics: (situation) => (situation.complete.gateways),
  councils: (situation) => (situation.complete.cybernetics),
  shrines: (situation) => (situation.complete.councils),
  robotics: (situation) => (situation.complete.cybernetics),
  motherships: (situation) => (!situation.total.motherships && situation.complete.beacons),
  stalkers: (situation) => (situation.complete.cybernetics && situation.complete.assimilators),
  sentries: (situation) => (situation.complete.cybernetics && situation.complete.assimilators),
  templars: (situation) => (situation.complete.shrines),
  phoenixes: (situation) => (situation.complete.stargates),
  carriers: (situation) => (situation.complete.stargates && situation.complete.beacons),
  voidrays: (situation) => (situation.complete.stargates),
  observers: (situation) => (situation.complete.robotics),
  airWeapons: (situation) => (situation.complete.cybernetics && situation.complete.stargates),
  airArmor: (situation) => (situation.complete.cybernetics && situation.complete.stargates),
  groundWeapons: (situation) => (situation.complete.forges),
  groundArmor: (situation) => (situation.complete.forges),
  shields: (situation) => (situation.complete.forges),
};

export default class Brain {

  constructor() {
    this.strategy = new InitialStrategy();
    this.strategyCode = 0;
  }

  useStrategy(code) {
    const strategyCode = (code > 0) ? code : 0;

    if ((strategyCode >= 0) && (this.strategyCode !== strategyCode)) {
      this.strategy = STRATEGY[strategyCode];
      this.strategyCode = strategyCode;
      console.log("Investing switched to", this.strategy.constructor.name, "strategy");
    }

    if (!this.strategy.units().length) {
      this.strategy = STRATEGY[0];
      this.strategyCode = 0;
      console.log("Investing switched to", this.strategy.constructor.name, "strategy");
    }
  }

  react(...input) {
    const situation = {
      strategy: input[0],
      resources: { minerals: 0, vespene: 0, psi: 0, food: 0 },
      complete: { nexuses: 0, bases: 0, pylons: 0 },
      factories: {},
      progress: { bases: 0 },
      inventory: {},
      ordered: {},
      total: { bases: 0, pylons: 0 },
    }

    let index = 4;
    let poweredBuildings = 0;
    for (const i of UNITS) {
      situation.complete[i] = input[index];
      situation.progress[i] = input[index + 1];
      situation.inventory[i] = situation.complete[i] + situation.progress[i];
      situation.ordered[i] = input[index + 2];
      situation.total[i] = situation.inventory[i] + situation.ordered[i];
      index += 3;

      if (POWERED[i]) {
        poweredBuildings += situation.total[i];
      }
    }

    situation.resources.minerals = input[1];
    situation.resources.vespene = input[2];
    situation.resources.psi = input[3];
    situation.resources.food = situation.complete.nexuses * 15 + situation.complete.bases * 8 + situation.complete.pylons * 8 - situation.resources.psi;

    for (const unit in situation.ordered) {
      const count = situation.ordered[unit];

      if (count) {
        if (MINERALS[unit]) situation.resources.minerals -= MINERALS[unit] * count;
        if (VESPENE[unit]) situation.resources.vespene -= VESPENE[unit] * count;
        if (FOOD[unit]) situation.resources.food -= FOOD[unit] * count;
      }
    }

    // Check if new bases are needed
    let isPowerAvailable = true;
    if ((situation.total.pylons >= situation.complete.bases * 3) || (poweredBuildings >= situation.complete.bases * 3)) {
      if (!situation.progress.bases) {
        if (situation.resources.minerals >= MINERALS.bases) {
          return order("bases");
        } else {
          // Don't build anything else
          return;
        }
      } else {
        isPowerAvailable = false;
      }
    }

    this.useStrategy(situation.strategy);
    this.strategy.set(situation);

    const units = this.strategy.units();

    determineFreeFactories(situation, units);

    for (const unit of units) {
      // Check if pre-requisites are not met
      if (PREREQUISITE[unit] && !PREREQUISITE[unit](situation)) continue;
      if (POWERED[unit] && !isPowerAvailable) continue;

      // Check if available resources are sufficient
      if (MINERALS[unit] && (situation.resources.minerals < MINERALS[unit])) continue;
      if (VESPENE[unit] && (situation.resources.vespene < VESPENE[unit])) continue;
      if (FOOD[unit] && (situation.resources.food < FOOD[unit])) continue;

      // Check if capped by factory capacity
      if (FACTORY[unit] && !situation.factories[unit]) continue;

      // Check if limit of instances is reached
      if (situation.total[unit] >= this.strategy.limit(unit)) continue;

      // Check if limit of parallel builds is reached
      if (situation.progress[unit] >= this.strategy.parallel(unit)) continue;

      // Check if other conditions are not met
      if (!this.strategy.isAllowed(unit)) continue;

      // Check if capped by ratio
      if (this.strategy.isCapped(unit)) continue;

      // Place order
      log(this.strategy, situation);
      return order(unit);
    }
  }

}

function order(unit) {
  const output = [];

  for (const one of UNITS) {
    output.push((unit === one) ? 1 : 0);
  }

  return output;
}

function determineFreeFactories(situation, units) {
  const factories = {};
  for (const unit of units) {
    const factory = FACTORY[unit];

    if (factory && !(factories[factory] >= 0)) {
      factories[factory] = countFreeFactories(situation, factory);
    }
  }
  for (const unit of units) {
    if (FACTORY[unit]) {
      const arePrerequisitesMet = PREREQUISITE[unit] ? PREREQUISITE[unit](situation) : true;
      situation.factories[unit] = arePrerequisitesMet ? factories[FACTORY[unit]] : 0;
    }
  }
}

function countFreeFactories(situation, factory) {
  let wip = 0;
  for (const unit in FACTORY) {
    if (FACTORY[unit] === factory) wip += situation.progress[unit];
  }

  return situation.complete[factory] - wip;
}

///////////////////////////////////////////

const TROUBLESHOOTING = false;
const previously = {};
const logs = [];
let time = -1;

function log(strategy, situation) {
  if (!TROUBLESHOOTING) return;

  time++;

  if (logs.length) {
    logs[0] = strategy.constructor.name;
  } else {
    logs.push(strategy.constructor.name);
  }

  const seconds = time / 22.4;
  let neworders = false;
  for (const unit in situation.inventory) {
    const count = situation.inventory[unit];

    if (!count) continue;

    if (!previously[unit]) {
      logs.push(count + " " + unit + " (" + Math.floor(seconds / 60) + ":" + twodigits(seconds % 60) + ")");
      neworders = true;
    } else if (count > previously[unit]) {
      logs.push((count - previously[unit]) + " " + unit + " (" + Math.floor(seconds / 60) + ":" + twodigits(seconds % 60) + ")");
      neworders = true;
    }

    previously[unit] = count;
  }

  if (neworders) {
    console.log(logs.join(", "));
  }
}

function twodigits(number) {
  return (number >= 10) ? Math.floor(number) : "0" + Math.floor(number);
}
