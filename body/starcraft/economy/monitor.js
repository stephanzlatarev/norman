import { LOOPS_PER_STEP, LOOPS_PER_SECOND } from "../units.js";

const PERIOD = Math.floor(60 * LOOPS_PER_SECOND / LOOPS_PER_STEP);

const monitors = new Map();
const objects = new Map();
let tick = 0;

export default {

  Mines: "Mines",
  Workers: "Workers",

  Blocked: "blocked",
  Idle: "idle",
  Slowing: "slowing",
  Used: "used",

  add: function(group, object, metric, value) {
    let ids = objects.get(group);
    let data = monitors.get(group);

    if (!ids) {
      monitors.set(group, data = {});
      objects.set(group, ids = new Set());
    }

    ids.add(object);

    if (value > 0) {
      if (data[metric]) {
        data[metric] += value;
      } else {
        data[metric] = value;
      }
    }
  },

  show: function() {
    if (((tick++) % PERIOD) === 0) {
      // Show monitored data
      for (const [group, data] of monitors) {
        const count = objects.get(group).size;
        const line = [];

        for (const key in data) {
          line.push((data[key] * 100 / count / PERIOD).toFixed(2) + "% " + key);
        }

        if (count > 1) {
          console.log(group, "(" + count + ")", line.join(", "));
          // TODO: Show object with highest and object with lowest value for each metric
        } else {
          console.log(group, line.join(", "));
        } 
      }

      // Reset monitors
      monitors.clear();
      objects.clear();
    }
  }

}
