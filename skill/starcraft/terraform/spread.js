import { Board, Zone } from "./imports.js";

export const PSIONIC_MATRIX = {
  group: "buildings",
  type: "Pylon",

  // Pylons provide the Psionic Matrix over a 6.5 radius
  radius: 6.5,

  bonusAir: false,
  bonusGround: true,
  coversHarvest: false,

  // Pylons are build on the gound and require at least one cell around them for pathing
  accepts: cell => (cell.zone && cell.zone.cells.has(cell) && Board.accepts(cell.x, cell.y, 4)),

};

export const STATIC_DETECTION = {
  group: "warriors",
  type: "PhotonCannon",

  // Photon cannons provide detection of their sight range beyond their body radius
  // but we want to use it for static defense too so we use fire range plus body radius
  radius: 7 + 1.125,

  bonusAir: true,
  bonusGround: true,
  coversHarvest: true,

  // Photon cannons are build in the psionic matrix and require at least one cell around them for pathing
  accepts: cell => (cell.zone && cell.zone.cells.has(cell) && Board.accepts(cell.x, cell.y, 4) && isInPsionicMatrix(cell)),

};

export function getBestSpreadLocation(spread) {
  const zones = [...Zone.list()].sort((a, b) => (a.perimeterLevel - b.perimeterLevel));

  for (const zone of zones) {
    const location = getBestSpreadLocationInZone(spread, zone);

    if (location) {
      return location;
    }
  }
}

function getBestSpreadLocationInZone(spread, zone) {
  const coverage = getCoverageArea(spread, zone);
  const harvest = (spread.coversHarvest && zone.isDepot) ? getHarvestArea(zone) : null;

  let bestLocation = null;
  let bestScore = 0;
  let bestBonus = 0;
  let bestX = 0;
  let bestY = 0;

  for (const location of zone.cells) {
    const x = location.x;
    const y = location.y;

    if (harvest && harvest.has(location)) continue;
    if (!spread.accepts(location)) continue;

    let score = 0;
    let bonus = 0;

    for (const cell of Board.radius(x, y, spread.radius)) {
      // Check if can cover harvest area
      if (harvest && harvest.has(cell)) continue;

      const isGroundCell = cell.z && zone.cells.has(cell);

      const isScore = isGroundCell && !coverage.has(cell);
      let isBonus = !isScore;

      if (!isBonus && spread.bonusGround && isGroundCell) isBonus = true;
      if (!isBonus && spread.bonusAir && !isGroundCell) isBonus = true;

      if (isScore) score++;
      if (isBonus) bonus++;
    }

    let isBetter = false;

    if (score > bestScore) {
      isBetter = true;
    } else if (score && (score === bestScore) && bonus) {
      if (bonus > bestBonus) {
        isBetter = true;
      } else if (bonus === bestBonus) {
        if (y > bestY) {
          isBetter = true;
        } else if (y === bestY) {
          if (x > bestX) {
            isBetter = true;
          }
        }
      }
    }

    if (isBetter) {
      bestLocation = location;
      bestScore = score;
      bestBonus = bonus;
      bestX = x;
      bestY = y;
    }
  }

  return bestLocation;
}

// Set the area around the depot structure and path to minerals
// plus one cell more so that it can be used for placement checks
function getHarvestArea(depot) {
  const area = new Set();

  const cx = Math.floor(depot.x);
  const cy = Math.floor(depot.y);
  const rx = Math.floor(depot.harvestRally.x);
  const ry = Math.floor(depot.harvestRally.y);

  const minx = (rx <= cx) ? cx - 6 : cx - 3;
  const maxx = (rx >= cx) ? cx + 6 : cx + 3;
  const miny = (ry <= cy) ? cy - 6 : cy - 3;
  const maxy = (ry <= cy) ? cy + 6 : cy + 3;

  for (let x = minx; x <= maxx; x++) {
    for (let y = miny; y <= maxy; y++) {
      area.add(Board.cell(x, y));
    }
  }

  return area;
}

function getCoverageArea(spread, zone) {
  const area = new Set();

  for (const unit of zone[spread.group]) {
    if (unit.type.name !== spread.type) continue;

    // TODO: Handle units placed at the center of cell
    for (const cell of Board.radius(unit.body.x, unit.body.y, spread.radius)) {
      area.add(cell);
    }
 }

  return area;
}

function isInPsionicMatrix(cell) {
  const zone = cell.zone;
  const radius = PSIONIC_MATRIX.radius;

  for (const pylon of zone.buildings) {
    if (!pylon.type.isPylon) continue;
    if (!pylon.isActive) continue;

    const dx = pylon.body.x - cell.x;
    const dy = pylon.body.y - cell.y;

    if ((dx < -radius) || (dx > radius)) continue;
    if ((dy < -radius) || (dy > radius)) continue;

    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
}
