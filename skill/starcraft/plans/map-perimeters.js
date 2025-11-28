import { Depot, Zone } from "./imports.js";

const PERIMETER_BLUE = 1;    // The zone is within the defendable perimeter
const PERIMETER_WHITE = 3;   // The zone is outside our perimeter
const PERIMETER_RED = 5;     // The zone is within enemy perimeter

const PERIMETER_WAVE_STEP = 0.01;
const PERIMETER_LEVEL_STEP = 0.0001;
const PERIMETER_LEVEL_STEPS = [];
for (let i = 0; i < 100; i++) PERIMETER_LEVEL_STEPS.push(0);

let scan = {
  inner: { zones: new Set(), depots: new Set(), depotsChanged: false, production: new Set(), productionChanged: false },
  enemy: { zones: new Set(), depots: new Set(), depotsChanged: false, production: new Set(), productionChanged: false },
  outer: { zones: new Set() },
};

export default function() {
  scanZones();

  const innerChanged = scan.inner.productionChanged || scan.inner.depotsChanged;
  const enemyChanged = scan.enemy.productionChanged || scan.enemy.depotsChanged;

  if (innerChanged) recalculateInner();
  if (enemyChanged) recalculateEnemy();

  if (innerChanged || enemyChanged) {
    // Ensure perimeter levels between own and enemy zones
    recalculateOuter();

    // Ensure perimeter levels for all corridors in the perimeter
    for (const zone of Zone.list()) {
      if (!zone.perimeterLevel) continue;

      for (const [neighbor, corridor] of zone.exits) {
        if (!neighbor.perimeterLevel) continue;
        if (corridor.via === zone) continue;
        if (corridor.via === neighbor) continue;

        corridor.via.perimeterLevel = neighbor.perimeterLevel;
      }
    }
  }
}

function scanZones() {
  const now = {
    inner: { zones: new Set(), depots: new Set(), depotsChanged: false, production: new Set(), productionChanged: false },
    enemy: { zones: new Set(), depots: new Set(), depotsChanged: false, production: new Set(), productionChanged: false },
    outer: { zones: new Set() },
  };

  for (const zone of Zone.list()) {
    if (zone.isDepot) {
      if (zone.buildings.size) {
        if (!scan.inner.depots.has(zone)) now.inner.depotsChanged = true;
        now.inner.depots.add(zone);
      } else if (zone.threats.size && hasEnemyBuildings(zone)) {
        if (!scan.enemy.depots.has(zone)) now.enemy.depotsChanged = true;
        now.enemy.depots.add(zone);
      }
    } else if (zone.isHall) {
      if (zone.buildings.size) {
        if (!scan.inner.production.has(zone)) now.inner.productionChanged = true;
        now.inner.production.add(zone);
      } else if (zone.threats.size && hasEnemyBuildings(zone)) {
        if (!scan.enemy.production.has(zone)) now.enemy.productionChanged = true;
        now.enemy.production.add(zone);
      }
    }

    if (zone.perimeterLevel >= PERIMETER_RED) {
      now.enemy.zones.add(zone);
    } else if (zone.perimeterLevel >= PERIMETER_WHITE) {
      now.outer.zones.add(zone);
    } else if (zone.perimeterLevel >= PERIMETER_BLUE) {
      now.inner.zones.add(zone);
    } else if (zone.perimeterLevel) {
      zone.perimeterLevel = undefined;
    }
  }

  scan = now;
}

function hasEnemyBuildings(zone) {
  for (const unit of zone.threats) {
    // TODO: Exclude offensive unit types like photon cannons and bunkers
    if (unit.type.isBuilding) {
      return true;
    }
  }
}

// Recalculate inner perimeter levels by traversing from our home base outwards
// connecting all zones that have our buildings into one continous area.
function recalculateInner() {
  const total = new Set([...scan.inner.depots, ...scan.inner.production]);
  const perimeter = new Set();

  if (total.size) {
    const home = total.has(Depot.home) ? Depot.home : total.values().next().value;
    const covered = new Set([home]);
    const traversed = new Set([home]);
    const paths = new Map();

    let wave = new Set([home]);

    paths.set(home, new Set());

    while (wave.size && (covered.size < total.size)) {
      const next = new Set();

      for (const zone of wave) traversed.add(zone);

      for (const zone of wave) {
        const root = paths.get(zone);

        for (const [neighbor, corridor] of zone.exits) {
          if (!corridor.via.isPassage) continue;
          if (traversed.has(neighbor)) continue;

          const path = paths.get(neighbor);
          const withCorridor = (corridor.via !== neighbor);

          if (path) {
            const length = withCorridor ? root.length + 2 : root.length + 1;

            if (path.length === length) {
              for (let i = 0; i < root.length; i++) path[i].add(...root[i]);
              if (withCorridor) path[root.length + 1].add(corridor.via);
              path[root.length].add(zone);
            }
          } else {
            if (withCorridor) {
              paths.set(neighbor, [...root, new Set([corridor.via]), new Set([zone])]);
            } else {
              paths.set(neighbor, [...root, new Set([zone])]);
            }
          }

          next.add(neighbor);

          if (total.has(neighbor)) covered.add(neighbor);
        }
      }

      wave = next;
    }

    // Sort the paths by length
    const lines = [];
    let maxlength = 0;
    for (const zone of total) {
      const line = [...paths.get(zone), new Set([zone])];
      lines.push(line);

      if (line.length > maxlength) maxlength = line.length;
    }
    lines.sort((a, b) => a.length - b.length);

    // Set perimeter levels along the paths
    const levels = [...PERIMETER_LEVEL_STEPS];
    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        const wave = line[i];

        for (const zone of wave) {
          if (perimeter.has(zone)) continue;

          const level = i * PERIMETER_WAVE_STEP + levels[i];
          zone.perimeterLevel = PERIMETER_BLUE + level;
          perimeter.add(zone);
          levels[i] += PERIMETER_LEVEL_STEP;
        }
      }
    }
  }

  // Clear blue perimeter levels that are no longer connected
  for (const zone of scan.inner.zones) {
    if ((zone.perimeterLevel < PERIMETER_WHITE) && !perimeter.has(zone)) {
      zone.perimeterLevel = undefined;
    }
  }

  scan.inner.zones = perimeter;
}

// Recalculate outer perimeter levels by traversing from inner to enemy perimeter
function recalculateOuter() {
  const inner = scan.inner.zones;
  const enemy = scan.enemy.zones;
  const perimeter = new Set();

  let level = PERIMETER_WHITE;
  let wave = new Set(scan.inner.zones);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      for (const [neighbor, corridor] of zone.exits) {
        if (!corridor.via.isPassage) continue;

        if (!inner.has(neighbor) && !enemy.has(neighbor) && !perimeter.has(neighbor)) {
          corridor.via.perimeterLevel = level;
          neighbor.perimeterLevel = level;
          level += PERIMETER_WAVE_STEP;

          perimeter.add(neighbor);
          next.add(neighbor);
        }
      }
    }

    wave = next;
  }

  // Clear old white perimeter levels
  for (const zone of scan.outer.zones) {
    if ((zone.perimeterLevel >= PERIMETER_WHITE) && (zone.perimeterLevel < PERIMETER_RED) && !perimeter.has(zone)) {
      zone.perimeterLevel = undefined;
    }
  }

  scan.outer.zones = perimeter;
}

function recalculateEnemy() {
  const total = new Set([...scan.enemy.depots, ...scan.enemy.production]);
  const perimeter = new Set();

  for (const zone of total) {
    if (scan.inner.zones.has(zone)) continue;

    perimeter.add(zone);
    zone.perimeterLevel = PERIMETER_RED;
  }

  // Clear old red perimeter levels
  for (const zone of scan.enemy.zones) {
    if ((zone.perimeterLevel >= PERIMETER_RED) && !perimeter.has(zone)) {
      zone.perimeterLevel = undefined;
    }
  }

  scan.enemy.zones = perimeter;
}
