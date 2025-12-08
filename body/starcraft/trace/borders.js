import Board from "../map/board.js";
import Zone from "../map/zone.js";

const Colors = {
  Cluster: new Map(),
  Curtain: ["#FF00AA", "#FF44AA", "#AA00AA"],
  Depot: ["#00AAFF", "#AAAAFF", "#0044AA"],
  Hall: ["#00FFAA", "#AAFFAA", "#00AA44"],
  Ramp: ["#FFAA00", "#FFAA44", "#AA4400"],
}
const Zones = new Map();

export default function(shapes) {
  if (!Zones.size) {
    for (const zone of Zone.list()) {
      Zones.set(zone.cell.cluster, zone);
    }
  }

  for (const cell of Board.board) {
    const cluster = cell.cluster;
    const zone = cell.zone;
    const color = getColor(cluster);
    const opacity = (zone && zone.border.has(cell)) ? 0.8 : 0.2;

    shapes.push({ shape: "cell", x: cell.x, y: cell.y, color, opacity });

    const expect = Zones.get(cluster);
    if ((zone || expect) && (zone !== expect)) {
      console.log("WARNING: Cell", cell.x, ":", cell.y, "is in zone", zone?.name, "instead of", expect?.name);
    }
  }
}

function getColor(cluster) {
  let color = Colors.Cluster.get(cluster);
  if (color) return color;

  let colors;
  if (cluster.isDepot) {
    colors = Colors.Depot;
  } else if (cluster.isGround) {
    colors = Colors.Hall;
  } else if (cluster.isCurtain) {
    colors = Colors.Curtain;
  } else if (cluster.isRamp) {
    colors = Colors.Ramp;
  }

  if (colors) {
    const set = new Set(colors);

    for (const neighbor of cluster.neighbors) {
      set.delete(Colors.Cluster.get(neighbor));
    }

    if (set.size) {
      color = [...set][0];
    } else {
      color = colors[0];
    }
  } else {
    color = "gray";
  }

  Colors.Cluster.set(cluster, color);

  return color;
}
