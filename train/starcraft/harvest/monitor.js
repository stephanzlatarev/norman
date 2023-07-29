
const PERIOD = Math.floor(60 * 22.4);

const monitors = new Map();
const objects = new Map();
let tick = 0;

export default {

  Mines: "Mines",
  Workers: "Workers",

  Blocked: "blocked",
  Idle: "idle",
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
        const line = [group];

        const count = objects.get(group).size;
        if (count > 1) {
          line.push("(" + count + ")");
        }

        for (const key in data) {
          line.push((data[key] * 100 / count / PERIOD).toFixed(2) + "%", key);
        }

        console.log(line.join(" "));
      }

      // Reset monitors
      monitors.clear();
      objects.clear();
    }
  }

}
