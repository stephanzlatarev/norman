import Zone from "../map/zone.js";

let drawn = new Set();

export default function(shapes) {
  drawn = new Set();

  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    const neighbors = new Set();

    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.via === neighbor) {
        line(shapes, zone.cell, neighbor.cell);
        neighbors.add(neighbor);
      } else if (corridor.via.isPassage) {
        line(shapes, zone.cell, corridor.via.cell);
        line(shapes, neighbor.cell, corridor.via.cell);
        neighbors.add(neighbor);
      } else {
        line(shapes, zone.cell, corridor.via.cell, "dotted");
        line(shapes, neighbor.cell, corridor.via.cell, "dotted");
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

    shapes.push({
      shape: "circle",
      x: zone.cell.x + 0.5,
      y: zone.cell.y + 0.5,
      r: 1,
      color: "#444444",
      filled: true,
      opacity: 0.8,
    });
  }
}

function line(shapes, a, b, dotted) {
  if (drawn.has(a.id + "-" + b.id) || drawn.has(b.id + "-" + a.id)) return;

  const x1 = a.x + 0.5;
  const y1 = a.y + 0.5;
  const x2 = b.x + 0.5;
  const y2 = b.y + 0.5;

  shapes.push({ shape: "line", x1, y1, x2, y2, width: 1, color: "#444444", opacity: 0.6, dotted: !!dotted });

  drawn.add(a.id + "-" + b.id);
}

function same(a, b) {
  return (a.size === b.size) && (new Set([...a, ...b]).size === a.size);
}
