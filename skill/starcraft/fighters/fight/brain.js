
const RED_LINE_SQUARED = 40 * 40; // This is the closest an enemy can go to homebase before being attacked with everything

const TOO_CLOSE_SQUARED = 7 * 7;
const STALK_RANGE_SQUARED = 13 * 13; // Squared range for stalking enemies
const FAR_SQUARED = 15 * 15;
const TOO_FAR_SQUARED = 17 * 17;

export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const armyCount = input[2];
    const armyX = input[3];
    const armyY = input[4];
    const enemyCount = input[5];
    const enemyX = input[6];
    const enemyY = input[7];

    if (enemyX && enemyY && (squareDistance(enemyX, enemyY, baseX, baseY) <= RED_LINE_SQUARED)) {
      return [-1, 1, enemyX, enemyY];
    } else if (armyX && armyY && (armyCount <= enemyCount) && (armyCount < 12)) {
      // Rally army
      const location = stalkingLocation(armyX, armyY, enemyX, enemyY, baseX, baseY);
      return [1, -1, location.x, location.y];
    } else if (enemyX && enemyY) {
      // Attack enemy
      return [-1, 1, enemyX, enemyY];
    }

    return [-1, -1];
  }

}

function squareDistance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

// Try to keep the enemy in sight 
function stalkingLocation(armyX, armyY, enemyX, enemyY, baseX, baseY) {
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const squareDistance = distx * distx + disty * disty;

  if (squareDistance <= TOO_CLOSE_SQUARED) {
    return { x: baseX, y: baseY };
  } else if (squareDistance <= STALK_RANGE_SQUARED) {
    // Get farther away
    const distx = baseX - armyX;
    const disty = baseY - armyY;
    const deltax = (Math.abs(distx) >= Math.abs(disty)) ? Math.sign(distx) : distx / Math.abs(distx + disty);
    const deltay = (Math.abs(distx) < Math.abs(disty)) ?  Math.sign(disty) : disty / Math.abs(distx + disty);

    return { x: armyX + deltax, y: armyY + deltay };
  } else if (squareDistance >= TOO_FAR_SQUARED) {
    return { x: enemyX, y: enemyY };
  } else if (squareDistance >= FAR_SQUARED) {
    // Get closer
    const deltax = (Math.abs(distx) >= Math.abs(disty)) ? Math.sign(distx) : distx / Math.abs(distx + disty);
    const deltay = (Math.abs(distx) < Math.abs(disty)) ?  Math.sign(disty) : disty / Math.abs(distx + disty);

    return { x: armyX + deltax, y: armyY + deltay };
  }

  return { x: armyX, y: armyY };
}
