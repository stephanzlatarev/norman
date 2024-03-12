import Types from "../types.js";
import Units from "../units.js";

const counting = new Map();

// TODO: Split into CountActive and CountTotal to differentiate active units from ordered or building 

class Count {

  sync(race) {
    // Zero all counting
    for (const type of Types.list(race)) {
      counting.set(type.name, 0);
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

export default new Count();
