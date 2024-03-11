import Units from "../units.js";

const counting = new Map();

// TODO: Split into CountActive and CountTotal to differentiate active units from ordered or building 

class Count {

  sync() {
    // Zero all counting but keep all seen types in the map so that if all units of a type disappear the old count is replaced with 0
    for (const type of counting.keys()) {
      counting.set(type, 0);
    }

    count(Units.buildings().values());
    count(Units.warriors().values());
    count(Units.workers().values());

    for (const [type, count] of counting) {
      this[type] = count;
    }
  }

}

function count(units) {
  for (const unit of units) {
    const count = counting.get(unit.type.name);

    counting.set(unit.type.name, count ? count + 1 : 1);
  }
}

// TODO: Find a better way to ensure count returns a number for all known types
counting.set("Assimilator", 0);
counting.set("Forge", 0);
counting.set("Gateway", 0);
counting.set("Pylon", 0);
counting.set("Nexus", 0);

export default new Count();