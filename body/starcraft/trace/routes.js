import Zone from "../map/zone.js";

const MODE_CENTERS = true;
const MODE_CORRIDORS = true;
const MODE_NEIGHBORS = false;
const MODE_ROUTES = true;

const warnings = new Set();
let drawn = new Set();

export default function(shapes) {
  drawn = new Set();

  if (MODE_NEIGHBORS) showNeighbors(shapes);
  if (MODE_CORRIDORS) showCorridors(shapes);
  if (MODE_ROUTES) showRoutes(shapes);
  if (MODE_CENTERS) showCenters(shapes);

  integrityChecks();
}

function showRoutes(shapes) {
  for (const zone of Zone.list()) {
    if (!zone.route || (zone.route.length <= 1)) continue;

    arrow(shapes, zone.route[1].cell, zone.cell);
  }
}

function showNeighbors(shapes) {
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    for (const neighbor of zone.neighbors) {
      line(shapes, zone.cell, neighbor.cell, true);
    }
  }
}

function showCorridors(shapes) {
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.via) {
        line(shapes, zone.cell, corridor.via.cell, corridor.isGroundPassable);
        line(shapes, neighbor.cell, corridor.via.cell, corridor.isGroundPassable);
      } else {
        line(shapes, zone.cell, neighbor.cell, corridor.isGroundPassable);
      }
    }
  }
}

function showCenters(shapes) {
  for (const zone of Zone.list()) {
    shapes.push({
      shape: "circle",
      x: zone.cell.x + 0.5,
      y: zone.cell.y + 0.5,
      r: (zone.isDepot || zone.isHall) ? 1.0 : 0.5,
      color: "#444444",
      filled: true,
      opacity: 0.8,
    });
  }
}

function integrityChecks() {
  const corridors = new Map();

  // Duplicates check
  for (const zone of Zone.list()) {
    for (const [neighbor, corridor] of zone.exits) {
      const key = [zone.name, neighbor.name].sort().join("-");
      const other = corridors.get(key);

      if (other && (corridor !== other)) {
        warn("Multiple", zone.name, "-", neighbor.name, "corridors!");
      }

      corridors.set(key, corridor);
    }
  }

  // Integrity checks on center zones
  for (const zone of Zone.list()) {
    if (!zone.isDepot && !zone.isHall) continue;

    const exits = new Set();

    for (const [neighbor, corridor] of zone.exits) {
      if (corridor.isGroundPassable) {
        exits.add(neighbor);
      }

      // Integrity checks on the corridor
      if (corridor.via === zone) {
        warn("Zone", zone.name, "is a via of a corridor!");
      }
    }

    // Integrity checks on the zone
    if (!same(exits, zone.neighbors)) {
      warn("Zone", zone.name, "has",
        "neighbors:", [...zone.neighbors].map(one => one.name).sort().join(" "),
        "exits:", [...exits].map(one => one.name).sort().join(" "),
      );
    }
  }

  // Integrity checks on corridor zones
  for (const zone of Zone.list()) {
    if (zone.isDepot || zone.isHall) continue;

    for (const [neighbor, corridor] of zone.exits) {
      if (!corridor.via) {
        warn("Zone", zone.name, "is not the via of a corridor!");
      } else if (corridor.via !== zone) {
        warn("Zone", zone.name, "is not the via of a corridor! It's", corridor.via.name);
      }
    }
  }

  // Integrity checks on routes and distances
  for (const zone of Zone.list()) {
    if (!zone.route || !zone.route.length) {
      warn("Zone", zone.name, "has no route!");
      continue;
    }

    if (zone.route.length === 1) {
      if (zone.distance !== 0) warn("Zone", zone.name, "has wrong distance!");
    } else {
      if (!(zone.distance > 0)) warn("Zone", zone.name, "has no distance!");
    }
  }
}

function arrow(shapes, a, b) {
  shapes.push({
    shape: "arrow",
    x1: a.x + 0.5, y1: a.y + 0.5,
    x2: b.x + 0.5, y2: b.y + 0.5,
    r: 0.5,
    color: "#ADFF2F",
    filled: true,
    opacity: 1,
  });
}

function line(shapes, a, b, solid) {
  if (drawn.has(a.id + "-" + b.id) || drawn.has(b.id + "-" + a.id)) return;

  const x1 = a.x + 0.5;
  const y1 = a.y + 0.5;
  const x2 = b.x + 0.5;
  const y2 = b.y + 0.5;

  shapes.push({ shape: "line", x1, y1, x2, y2, width: 1, color: "#444444", opacity: 0.6, dotted: !solid });

  drawn.add(a.id + "-" + b.id);
}

function same(a, b) {
  return (a.size === b.size) && (new Set([...a, ...b]).size === a.size);
}

function warn(...message) {
  const text = message.join(" ");

  if (!warnings.has(text)) {
    console.log("WARNING:", text);
    warnings.add(text);
  }
}
