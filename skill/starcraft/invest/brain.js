
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

const PREORDER_MINERALS = {
  nexuses: 300,
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

const CONDITION = {
  pylons: (situation) => (
    (situation.total.pylons < 1)                                      // Power the first base
    || ((situation.resources.food < 10) && situation.total.gateways)  // Build for food (after first gateway)
    || (situation.progress.bases && (situation.complete.nexuses >= 2))   // Power new bases (after the second complete nexus)
  ),
  assimilators: (situation) => (situation.total.gateways && (!situation.total.assimilators || situation.total.cybernetics)),
  gateways: (situation) => (situation.total.nexuses > 1),
  forges: (situation) => (situation.total.zealots + situation.total.sentries + situation.total.stalkers > 10),
  beacons: (situation) => (situation.complete.stargates),
  stargates: (situation) => (situation.complete.cybernetics && (situation.total.stalkers > 10)),
  cybernetics: (situation) => (situation.complete.zealots),
  robotics: (situation) => (situation.complete.cybernetics),
  motherships: (situation) => (situation.complete.stargates && situation.complete.beacons),
  stalkers: (situation) => (situation.complete.cybernetics && situation.complete.assimilators && (situation.total.sentries >= 2)),
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

const LIMIT = {
  nexuses: (situation) => (situation.total.probes / 12),
  pylons: (situation) => (situation.total.nexuses * 6),
  assimilators: (situation) => (situation.complete.nexuses * 2),
  gateways: (situation) => (situation.total.bases * 2 - situation.total.stargates),
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
  gateways: 1,
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
  zealots: 2,
  stalkers: 6,
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

        // Check if available resources are sufficient
        if (PREORDER_MINERALS[one]) {
          if (situation.resources.minerals < PREORDER_MINERALS[one]) break;
        } else if (MINERALS[one] && (situation.resources.minerals < MINERALS[one])) break;
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
