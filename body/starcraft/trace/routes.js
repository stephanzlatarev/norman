import Zone from "../map/zone.js";

let show = false;

let drawn = new Set();

export default function(shapes) {
  if (!show) return;

  drawn = new Set();

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    const neighbors = new Set();

    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.via === neighbor) {
        line(shapes, zone.cell, neighbor.cell);
        neighbors.add(neighbor);
      } else if (corridor.via.isPassage) {
        line(shapes, zone.cell, corridor.via.cell, "black");
        line(shapes, corridor.via.cell, neighbor.cell, "black");
        neighbors.add(neighbor);
      } else {
        line(shapes, zone.cell, corridor.via.cell, "red");
        line(shapes, corridor.via.cell, neighbor.cell, "red");
      }
    }

    if (!same(neighbors, zone.neighbors)) {
      console.log("WARNING: Zone", zone.name, "has",
        "neighbors:", [...zone.neighbors].map(one => one.name).sort().join(" "),
        "exits:", [...neighbors].map(one => one.name).sort().join(" "),
      );
    }
  }

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    shapes.push({ shape: "circle", x: zone.cell.x + 0.5, y: zone.cell.y + 0.5, r: 1.5, color: "black" });
  }
}

function line(shapes, a, b, color) {
  if (drawn.has(a.id + "-" + b.id) || drawn.has(b.id + "-" + a.id)) return;

  const x1 = a.x + 0.5;
  const y1 = a.y + 0.5;
  const x2 = b.x + 0.5;
  const y2 = b.y + 0.5;

  shapes.push({ shape: "line", x1, y1, x2, y2, width: 3, color: "white" });
  shapes.push({ shape: "line", x1, y1, x2, y2, width: 1, color: color || "black" });

  drawn.add(a.id + "-" + b.id);
}

function same(a, b) {
  return (a.size === b.size) && (new Set([...a, ...b]).size === a.size);
}
