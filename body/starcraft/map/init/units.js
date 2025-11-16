import Board from "../board.js";
import Units from "../../units.js";

export function adjustCellsToUnits() {
  for (const building of Units.buildings().values()) {
    const left = Math.round(building.body.x - building.body.r);
    const right = Math.round(building.body.x + building.body.r) - 1;
    const top = Math.round(building.body.y - building.body.r);
    const bottom = Math.round(building.body.y + building.body.r) - 1;

    markCells(left, top, right, bottom, true, true, false, false, false);
  }

  for (const building of Units.enemies().values()) {
    if (!building.type.isBuilding) continue;

    const left = Math.round(building.body.x - building.body.r);
    const right = Math.round(building.body.x + building.body.r) - 1;
    const top = Math.round(building.body.y - building.body.r);
    const bottom = Math.round(building.body.y + building.body.r) - 1;

    markCells(left, top, right, bottom, true, true, false, false, false);
  }

  for (const unit of Units.resources().values()) {
    const x = Math.floor(unit.body.x);
    const y = Math.floor(unit.body.y);

    if (unit.type.isMinerals) {
      markCells(x - 1, y, x, y, false, false, true, true, false);
    } else if (unit.type.isVespene) {
      markCells(x - 1, y - 1, x + 1, y + 1, false, false, true, false, true);
    }
  }

  // TODO: Move this into the sync logic. Only observed units should be marked as obstacles.
  // for (const obstacle of Units.obstacles().values()) {
  //   const left = Math.round(obstacle.body.x - obstacle.body.r);
  //   const right = Math.round(obstacle.body.x + obstacle.body.r) - 1;
  //   const top = Math.round(obstacle.body.y - obstacle.body.r);
  //   const bottom = Math.round(obstacle.body.y + obstacle.body.r) - 1;

  //   markCells(left, top, right, bottom, false, false, true, false, false);
  // }
}

function markCells(left, top, right, bottom, isPath, isPlot, isObstacle, isMinerals, isVespene) {
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const cell = Board.cell(x, y);

      if (cell.isOn) {
        cell.isPath = isPath;
        cell.isPlot = isPlot;
        cell.isObstacle = isObstacle;
        cell.isResource = isMinerals || isVespene;
        cell.isMinerals = isMinerals;
        cell.isVespene = isVespene;

        Board.ground.add(cell);
      }
    }
  }
}

export function getStartLocation() {
  const depots = [...Units.buildings().values()].filter(one => one.type.isDepot);

  if (depots.length === 1) {
    return depots[0].body;
  }
}
