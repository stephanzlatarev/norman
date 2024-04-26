import Types from "../types.js";
import Units from "../units.js";

const visible = new Map();

export const VisibleCount = {
  Zergling: 0,
};

export default function() {
  // Count units by type
  for (let race = 1; race <= 3; race++) {
    for (const type of Types.list(race)) {
      visible.set(type.name, 0);
    }
  }

  countUnits(Units.enemies().values());

  for (const [type, count] of visible) {
    VisibleCount[type] = count;
  }
}

function countUnits(units) {
  for (const unit of units) {
    increment(visible, unit.type.name);
  }
}

function increment(map, key) {
  const count = map.get(key);

  map.set(key, count ? count + 1 : 1);
}
