import Types from "../types.js";
import Units from "../units.js";

const visible = new Map();
const Warrior = "Warrior";
const Worker = "Worker";

export const VisibleCount = {
  Marine: 0,
  Queen: 0,
  SpawningPool: 0,
  Zergling: 0,

  Warrior: 0,
  Worker: 0,
};

export default function() {
  // Clear count
  for (let race = 1; race <= 3; race++) {
    for (const type of Types.list(race)) {
      visible.set(type.name, 0);
    }
  }
  visible.set(Warrior, 0);
  visible.set(Worker, 0);

  // Count units by type
  countUnits(Units.enemies().values());

  for (const [type, count] of visible) {
    VisibleCount[type] = count;
  }
}

function countUnits(units) {
  for (const unit of units) {
    if (unit.type.isNeutral) continue;

    increment(visible, unit.type.name);

    if (unit.type.isWorker) {
      increment(visible, Worker);
    } else if (unit.type.isWarrior) {
      increment(visible, Warrior);
    }
  }
}

function increment(map, key) {
  const count = map.get(key);

  map.set(key, count ? count + 1 : 1);
}
