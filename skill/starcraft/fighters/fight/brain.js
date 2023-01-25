
const TOO_CLOSE_SQUARED = 7 * 7;
const STALK_RANGE_SQUARED = 13 * 13; // Squared range for stalking enemies
const FAR_SQUARED = 15 * 15;
const TOO_FAR_SQUARED = 17 * 17;

export default class Brain {

  react(input) {
    // When regrouping army will react to enemy alert but will not start attack until energy level and army count are at good levels
    const isRegrouping = input[0];

    const enemyAlert = input[1];
    const baseX = input[2];
    const baseY = input[3];
    const guardX = input[4];
    const guardY = input[5];
    const armyCount = input[6];
    const armyEnergy = input[7];
    const armyX = input[8];
    const armyY = input[9];
    const enemyCount = input[10];
    const enemyX = input[11];
    const enemyY = input[12];

    if (!enemyX || !enemyY || !armyX || !armyY) return;

    if (enemyAlert) {
      // Defend base
      return [0, -1, 1, enemyX, enemyY];
    }

    if ((isRegrouping && (armyEnergy < 50)) || ((armyCount <= enemyCount) && (armyCount < 12))) {
      // Rally army when energy levels are below 50% (only when regrouping) or when the army is smaller than enemy
      const location = stalkingLocation(armyX, armyY, enemyX, enemyY, guardX, guardY, baseX, baseY);
      return [1, 1, -1, location.x, location.y];
    }

    // Attack enemy
    return [0, -1, 1, enemyX, enemyY];
  }

}

// Try to keep the enemy in sight 
function stalkingLocation(armyX, armyY, enemyX, enemyY, guardX, guardY, baseX, baseY) {
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const squareDistance = distx * distx + disty * disty;

  if (squareDistance <= TOO_CLOSE_SQUARED) {
    return (guardX && guardY) ? step(guardX, guardY, enemyX, enemyY) : { x: baseX, y: baseY };
  } else if (squareDistance <= STALK_RANGE_SQUARED) {
    // Step away from enemy towards base
    return step(armyX, armyY, guardX, guardY);
  } else if (squareDistance >= TOO_FAR_SQUARED) {
    return { x: enemyX, y: enemyY };
  } else if (squareDistance >= FAR_SQUARED) {
    // Step closer to enemy
    return step(armyX, armyY, enemyX, enemyY);
  }

  return { x: armyX, y: armyY };
}

function step(fromX, fromY, toX, toY) {
  const distx = toX - fromX;
  const absdistx = Math.abs(distx);
  const disty = toY - fromY;
  const absdisty = Math.abs(disty);
  const deltax = (absdistx >= absdisty) ? Math.sign(distx) : distx / (absdistx + absdisty);
  const deltay = (absdistx < absdisty) ?  Math.sign(disty) : disty / (absdistx + absdisty);

  return { x: fromX + deltax, y: fromY + deltay };
}
