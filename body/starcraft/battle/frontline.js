import Battle from "./battle.js";
import { getOrbCells, isCellInOrb } from "./orbs.js";
import Types from "../types.js";
import Resources from "../memo/resources.js";

const SMASH_RANGE = 4;

export default function(battle, threats) {
  const stations = new Set();
  const cellsInThreatRange = new Map();

  for (const threat of threats) {

    // If a SiegeTank is in the fog of war then assume it is already sieged
    if ((threat.lastSeen < Resources.loop) && (threat.type.name === "SiegeTank")) {
      threat.type = Types.unit("SiegeTankSieged");
    }

    if (threat.type.damageGround || (battle.mode === Battle.MODE_SMASH)) {
      const orb = threat.type.damageGround ? threat.weapon.orbGround : SMASH_RANGE;

      for (const cell of getOrbCells(threat.body, orb)) {
        if (battle.zones.has(cell.zone) && !isCellInThreatsRange(cell, threats, cellsInThreatRange)) {
          stations.add(cell);
        }
      }
    }
  }

  return stations;
}

function isCellInThreatsRange(cell, threats, cellsInThreatRange) {
  if (!cell.isPath || cell.isObstacle) return true;

  const status = cellsInThreatRange.get(cell);

  if (status === true) return true;
  if (status === false) return false;

  for (const threat of threats) {
    if (!threat.type.damageGround) continue;

    if (isCellInOrb(threat.body, threat.weapon.orbGround, cell)) {
      cellsInThreatRange.set(cell, true);
      return true;
    }
  }

  cellsInThreatRange.set(cell, false);
  return false;
}
