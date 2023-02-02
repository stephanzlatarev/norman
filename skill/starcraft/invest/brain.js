
const INPUT = [
  "nexuses", "bases", "pylons", "assimilators", "gateways", "forges", "beacons", "stargates", "cybernetics", "robotics",
  "motherships", "zealots", "stalkers", "sentries", "phoenixes", "carriers", "voidrays", "observers", "probes",
  "upgradeAirWeapons", "upgradeAirArmor", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const PRIO = [
  "pylons", "nexuses", "assimilators", "probes",
  "gateways", "cybernetics", "stalkers", "sentries", "zealots", "upgradeAirWeapons", "upgradeAirArmor",
  "robotics", "observers",
  "stargates", "beacons", "motherships", "carriers", "voidrays", "phoenixes",
  "forges", "upgradeGroundWeapons", "upgradeGroundArmor", "upgradeShields"
];

const MINERALS = {
  nexuses: 400,
  pylons: 100,
  assimilators: 75,
  gateways: 150,
  forges: 150,
  beacons: 300,
  stargates: 150,
  cybernetics: 200,
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
  cybernetics: (situation) => (situation.complete.gateways),
  robotics: (situation) => (situation.complete.cybernetics),
  motherships: (situation) => (!situation.total.motherships && situation.complete.beacons),
  stalkers: (situation) => (situation.complete.cybernetics && situation.complete.assimilators),
  sentries: (situation) => (situation.complete.cybernetics && situation.complete.assimilators),
  phoenixes: (situation) => (situation.complete.stargates),
  carriers: (situation) => (situation.complete.stargates && situation.complete.beacons),
  voidrays: (situation) => (situation.complete.stargates),
  observers: (situation) => (situation.complete.robotics),
  upgradeAirWeapons: (situation) => (situation.complete.cybernetics),
  upgradeAirArmor: (situation) => (situation.complete.cybernetics),
  upgradeGroundWeapons: (situation) => (situation.complete.forges),
  upgradeGroundArmor: (situation) => (situation.complete.forges),
  upgradeShields: (situation) => (situation.complete.forges),
};

const CONDITION = {
  pylons: (situation) => ((situation.progress.bases) || (situation.total.gateways && (situation.resources.food < 10))),
  gateways: (situation) => ((situation.total.gateways < 2) || situation.total.cybernetics),
  assimilators: (situation) => (situation.total.gateways && (!situation.total.assimilators || situation.total.cybernetics)),
  forges: (situation) => (situation.total.zealots + situation.total.sentries + situation.total.stalkers > 10),
  stargates: (situation) => (situation.complete.cybernetics && (situation.complete.gateways >= 6)),
  probes: (situation) => (situation.total.pylons || (situation.total.probes <= 12)),
};

const LIMIT = {
  nexuses: (situation) => (situation.total.probes / 12),
  pylons: (situation) => (situation.total.bases * 4),
  assimilators: (situation) => (situation.complete.nexuses * 2),
  gateways: 6,
  forges: 1,
  beacons: 1,
  stargates: (situation) => (situation.total.bases * 2 - situation.total.gateways),
  cybernetics: 1,
  robotics: 1,
  motherships: 1,
  observers: 3,
  probes: 82,
  upgradeAirWeapons: 1,
  upgradeAirArmor: 1,
  upgradeGroundWeapons: 1,
  upgradeGroundArmor: 1,
  upgradeShields: 1,
};

const PARALLEL = {
  nexuses: 1,
  pylons: 1,
  assimilators: 1,
  gateways: 2,
  stargates: 1,
  zealots: (situation) => (situation.complete.gateways - situation.progress.zealots - situation.progress.stalkers - situation.progress.sentries),
  stalkers: (situation) => (situation.complete.gateways - situation.progress.zealots - situation.progress.stalkers - situation.progress.sentries),
  sentries: (situation) => (situation.complete.gateways - situation.progress.zealots - situation.progress.stalkers - situation.progress.sentries),
  phoenixes: (situation) => (situation.complete.stargates - situation.progress.phoenixes - situation.progress.voidrays - situation.progress.carriers),
  carriers: (situation) => (situation.complete.stargates - situation.progress.phoenixes - situation.progress.voidrays - situation.progress.carriers),
  voidrays: (situation) => (situation.complete.stargates - situation.progress.phoenixes - situation.progress.voidrays - situation.progress.carriers),
  observers: (situation) => (situation.complete.robotics - situation.progress.observers),
  probes: (situation) => (situation.complete.nexuses - situation.progress.probes),
  upgradeAirWeapons: (situation) => (situation.complete.cybernetics - situation.progress.upgradeAirWeapons - situation.progress.upgradeAirArmor),
  upgradeAirArmor: (situation) => (situation.complete.cybernetics - situation.progress.upgradeAirWeapons - situation.progress.upgradeAirArmor),
  upgradeGroundWeapons: (situation) => (situation.complete.forges - situation.progress.upgradeGroundWeapons - situation.progress.upgradeGroundArmor - situation.progress.upgradeShields),
  upgradeGroundArmor: (situation) => (situation.complete.forges - situation.progress.upgradeGroundWeapons - situation.progress.upgradeGroundArmor - situation.progress.upgradeShields),
  upgradeShields: (situation) => (situation.complete.forges - situation.progress.upgradeGroundWeapons - situation.progress.upgradeGroundArmor - situation.progress.upgradeShields),
};

const RATIO = {
  zealots: 1,
  stalkers: 4,
  sentries: 1,
  phoenixes: 2,
  carriers: 6,
  voidrays: 2,
};

export default class Brain {

  react(input) {
    const situation = {
      resources: { minerals: 0, vespene: 0, food: 0 },
      complete: { nexuses: 0, pylons: 0 },
      progress: {},
      total: {},
      ratio: {},
      order: {},
    }

    let index = 3;
    for (const i of INPUT) {
      situation.complete[i] = input[index];
      situation.progress[i] = input[index + 1];
      situation.total[i] = situation.complete[i] + situation.progress[i];
      situation.order[i] = -1;
      index += 2;
    }

    situation.resources.minerals = input[0];
    situation.resources.vespene = input[1];
    situation.resources.food = situation.complete.nexuses * 15 + situation.complete.pylons * 8 - input[2];

    for (const one of PRIO) {
      if (CONDITION[one] && !CONDITION[one](situation)) continue;
      if (RATIO[one]) situation.ratio[one] = RATIO[one];
    }

    for (const one of PRIO) {
      let order = 0;

      while (true) {
        // Check if limit of instances is reached
        if (situation.total[one] >= threshold(LIMIT, one, situation)) break;

        // Check if limit of parallel builds is reached
        if (situation.progress[one] >= threshold(PARALLEL, one, situation)) break;

        // Check if pre-requisites are not met
        if (PREREQUISITE[one] && !PREREQUISITE[one](situation)) break;

        // Check if available resources are sufficient
        if (MINERALS[one] && (situation.resources.minerals < MINERALS[one])) break;
        if (VESPENE[one] && (situation.resources.vespene < VESPENE[one])) break;
        if (FOOD[one] && (situation.resources.food < FOOD[one])) break;

        // Check if other conditions are not met
        if (CONDITION[one] && !CONDITION[one](situation)) break;

        // Check if capped by ratio
        if (RATIO[one] && isCappedByRatio(one, situation)) break;

        // Add one instance to order
        order++;
        situation.progress[one]++;
        situation.resources.minerals -= MINERALS[one] ? MINERALS[one] : 0;
        situation.resources.vespene -= VESPENE[one] ? VESPENE[one] : 0;
        situation.resources.food -= FOOD[one] ? FOOD[one] : 0;
      }

      if (order > 0) {
        situation.order[one] = order;
      }
    }

    const output = [1, 1];
    for (const one of INPUT) {
      output.push(situation.order[one]);
      output.push(situation.order[one]);
    }

    log(situation);

    return output;
  }

}

function threshold(data, unit, situation) {
  const threshold = data[unit];

  if (typeof(threshold) === "number") {
    return threshold;
  } else if (typeof(threshold) === "function") {
    return threshold(situation);
  }

  return Infinity;
}

function isCappedByRatio(unit, situation) {
  for (const other in situation.ratio) {
    if (other !== unit) {
      if (situation.total[other] >= threshold(LIMIT, other, situation)) continue; // The other unit reached its limit, so it cannot cap others
      if (situation.progress[other] >= threshold(PARALLEL, other, situation)) continue; // The other unit is producing at its limit, so it cannot cap others
      if (situation.total[unit] * situation.ratio[other] > situation.total[other] * situation.ratio[unit]) return true;
    }
  }

  return false;
}

///////////////////////////////////////////

const TROUBLESHOOTING = false;
const previously = {};
const buildorder = [];
let time = -1;

function log(situation) {
  if (!TROUBLESHOOTING) return;

  time++;

  const seconds = time / 22.4;
  let neworders = false;
  for (const unit in situation.total) {
    const count = situation.total[unit];

    if (!count) continue;

    if (!previously[unit]) {
      buildorder.push(count + " " + unit + " (" + Math.floor(seconds / 60) + ":" + twodigits(seconds % 60) + ")");
      neworders = true;
    } else if (count > previously[unit]) {
      buildorder.push((count - previously[unit]) + " " + unit + " (" + Math.floor(seconds / 60) + ":" + twodigits(seconds % 60) + ")");
      neworders = true;
    }

    previously[unit] = count;
  }

  if (neworders) {
    console.log(buildorder.join(", "));
  }
}

function twodigits(number) {
  return (number >= 10) ? Math.floor(number) : "0" + Math.floor(number);
}
