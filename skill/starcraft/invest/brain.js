import InitialStrategy from "./strategy-initial.js";
import StandardStrategy from "./strategy-standard.js";
import SingleBaseStrategy from "./strategy-single-base.js";
import CounterReapersRush from "./strategy-vs-reapers.js";
import CounterZerglingsStrategy from "./strategy-vs-zerglings.js";
import ZealotsOnlyStrategy from "./strategy-zealots-only.js";

const STRATEGY = [
  new StandardStrategy(),
  new SingleBaseStrategy(),
  new CounterZerglingsStrategy(),
  new CounterReapersRush(),
  new ZealotsOnlyStrategy(),
];

const UNITS = [
  "nexuses", "bases", "pylons", "assimilators", "gateways", "forges", "beacons", "stargates", "cybernetics", "councils", "shrines", "robotics",
  "motherships", "zealots", "stalkers", "sentries", "phoenixes", "carriers", "voidrays", "observers", "probes",
  "upgradeAirWeapons", "upgradeAirArmor", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const FACTORY = {
  motherships: "nexuses",
  probes: "nexuses",
  zealots: "gateways",
  stalkers: "gateways",
  sentries: "gateways",
  observers: "robotics",
  phoenixes: "stargates",
  carriers: "stargates",
  voidrays: "stargates",
  upgradeGroundWeapons: "forges",
  upgradeGroundArmor: "forges",
  upgradeShields: "forges",
  upgradeAirWeapons: "cybernetics",
  upgradeAirArmor: "cybernetics",
};

const MINERALS = {
  nexuses: 400,
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
  phoenixes: 150,
  carriers: 350,
  voidrays: 250,
  observers: 25,
  probes: 50,
  upgradeAirWeapons: 100,
  upgradeAirArmor: 100,
  upgradeGroundWeapons: 100,
  upgradeGroundArmor: 100,
  upgradeShields: 100,
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
  phoenixes: 100,
  carriers: 250,
  voidrays: 150,
  observers: 75,
  upgradeAirWeapons: 100,
  upgradeAirArmor: 100,
  upgradeGroundWeapons: 100,
  upgradeGroundArmor: 100,
  upgradeShields: 100,
};

const FOOD = {
  motherships: 8,
  zealots: 2,
  stalkers: 2,
  sentries: 2,
  phoenixes: 2,
  carriers: 6,
  voidrays: 4,
  observers: 1,
  probes: 1,
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
  phoenixes: (situation) => (situation.complete.stargates),
  carriers: (situation) => (situation.complete.stargates && situation.complete.beacons),
  voidrays: (situation) => (situation.complete.stargates),
  observers: (situation) => (situation.complete.robotics),
  upgradeAirWeapons: (situation) => (situation.complete.cybernetics && situation.complete.stargates),
  upgradeAirArmor: (situation) => (situation.complete.cybernetics && situation.complete.stargates),
  upgradeGroundWeapons: (situation) => (situation.complete.forges),
  upgradeGroundArmor: (situation) => (situation.complete.forges),
  upgradeShields: (situation) => (situation.complete.forges),
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

  react(input) {
    const situation = {
      strategy: input[0],
      resources: { minerals: 0, vespene: 0, psi: 0, food: 0 },
      complete: { nexuses: 0, pylons: 0 },
      factories: {},
      progress: {},
      inventory: {},
      ordered: {},
      total: {},
      order: {},
    }

    let index = 4;
    for (const i of UNITS) {
      situation.complete[i] = input[index];
      situation.progress[i] = input[index + 1];
      situation.inventory[i] = situation.complete[i] + situation.progress[i];
      situation.ordered[i] = input[index + 2];
      situation.total[i] = situation.inventory[i] + situation.ordered[i];
      situation.order[i] = -1;
      index += 3;
    }

    situation.resources.minerals = input[1];
    situation.resources.vespene = input[2];
    situation.resources.psi = input[3];
    situation.resources.food = situation.complete.nexuses * 15 + situation.complete.pylons * 8 - situation.resources.psi;

    this.useStrategy(situation.strategy);
    this.strategy.set(situation);

    const units = this.strategy.units();

    determineFreeFactories(situation, units);

    for (const one of units) {
      const factory = FACTORY[one];
      let order = 0;

      while (true) {
        // Check if pre-requisites are not met
        if (PREREQUISITE[one] && !PREREQUISITE[one](situation)) break;

        // Check if available resources are sufficient
        if (MINERALS[one] && (situation.resources.minerals < MINERALS[one])) break;
        if (VESPENE[one] && (situation.resources.vespene < VESPENE[one])) break;
        if (FOOD[one] && (situation.resources.food < FOOD[one])) break;

        // Check if capped by factory capacity
        if (factory && !situation.factories[one]) break;

        // Check if limit of instances is reached
        if (situation.total[one] >= this.strategy.limit(one)) break;

        // Check if limit of parallel builds is reached
        if (situation.progress[one] >= this.strategy.parallel(one)) break;

        // Check if other conditions are not met
        if (!this.strategy.isAllowed(one)) break;

        // Check if capped by ratio
        if (this.strategy.isCapped(one)) break;

        // Add one instance to order
        order++;
        situation.progress[one]++;
        situation.resources.minerals -= MINERALS[one] ? MINERALS[one] : 0;
        situation.resources.vespene -= VESPENE[one] ? VESPENE[one] : 0;
        situation.resources.food -= FOOD[one] ? FOOD[one] : 0;

        if (factory) {
          for (const another of units) {
            if (FACTORY[another] === factory) situation.factories[another]--;
          }
        }
      }

      if (order > 0) {
        situation.order[one] = order;
      }
    }

    const output = [1, 1];
    for (const one of UNITS) {
      output.push(situation.order[one]);
      output.push(situation.order[one]);
    }

    log(this.strategy, situation);

    return output;
  }

}

function determineFreeFactories(situation, units) {
  const factories = {};
  for (const one of units) {
    const factory = FACTORY[one];

    if (factory && !(factories[factory] >= 0)) {
      factories[factory] = countFreeFactories(situation, factory);
    }
  }
  for (const one of units) {
    if (FACTORY[one]) {
      const arePrerequisitesMet = PREREQUISITE[one] ? PREREQUISITE[one](situation) : true;
      situation.factories[one] = arePrerequisitesMet ? factories[FACTORY[one]] : 0;
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
