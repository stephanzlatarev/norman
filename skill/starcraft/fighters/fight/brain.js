
const MIN_STALK_RANGE = 20 * 20;
const MAX_STALK_RANGE = 25 * 25;
const MIN_GUARD_RANGE = 36*36;

const MIN_TOTAL_ATTACK = 30; // When own units are below this number, don't go for total attack
const MAX_TOTAL_ATTACK = 40; // When own units are over this number, go for total attack

const ENEMY_COUNT_CAP = 22;  // Even if enemies are more than this, we'll consider them as many to ensure we eventually attack
const RATIO_TO_ATTACK = 1.5; // Have this ratio of own vs enemy units to launch an attack
const ENERGY_TO_ATTACK = 10; // Accumulate this much energy before launching an attack

const TROUBLESHOOTING = false;

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
    const engagedCount = input[7];
    const armyEnergy = input[8];
    const armyX = input[9];
    const armyY = input[10];
    const enemyCount = input[11];
    const enemyX = input[12];
    const enemyY = input[13];
    const moveX = input[14];
    const moveY = input[15];
    const warriorCount = input[16];

    if (!enemyX || !enemyY || !armyX || !armyY) return;

    if (enemyAlert) {
      // Defend base
      trace(this.mode, "defend", input, enemyX, enemyY);
      this.mode = "defend";
      return [0, -1, 1, enemyX, enemyY];
    }

    if ((warriorCount >= MAX_TOTAL_ATTACK) || ((this.mode === "kill") && (warriorCount >= MIN_TOTAL_ATTACK))) {
      // Total attack
      trace(this.mode, "kill", input, enemyX, enemyY);
      this.mode = "kill";
      return [0, -1, 1, enemyX, enemyY];
    }

    if (shouldRegroup(isRegrouping, armyCount, engagedCount, armyEnergy, enemyCount)) {
      // Rally army when energy levels are below 50% (only when regrouping) or when the army is smaller than enemy
      const location = stalkingLocation(armyX, armyY, enemyX, enemyY, guardX, guardY, baseX, baseY, moveX, moveY);

      trace(this.mode, "stalk", input, location.x, location.y);
      this.mode = "stalk";
      this.inertia = 10;
      return [1, 1, -1, location.x, location.y];
    }

    if ((this.mode === "stalk") && (this.inertia > 0)) {
      this.inertia--;
      trace(this.mode, "stalking " + this.inertia, input);
      return;
    }

    // Attack enemy
    trace(this.mode, "attack", input, enemyX, enemyY);
    this.mode = "attack";
    return [0, -1, 1, enemyX, enemyY];
  }

}

function shouldRegroup(isRegrouping, armyCount, engagedCount, armyEnergy, enemyCount) {
  const cappedEnemyCount = Math.min(enemyCount, ENEMY_COUNT_CAP);

  if (isRegrouping) {
    // We are retreating

    // If we don't have enough energy we won't launch an attack
    if (armyEnergy < ENERGY_TO_ATTACK) return true;

    // If we haven't gathered enough own units we won't launch an attack
    return (armyCount <= cappedEnemyCount * RATIO_TO_ATTACK);
  } else {
    // We are advancing
    if (engagedCount) {
      // We already fight. We should stop only if we see we are losing units
      return (armyCount * RATIO_TO_ATTACK <= cappedEnemyCount);
    } else {
      // We haven't started yet. We can still go back if we see there are too many enemy units
      return (armyCount <= cappedEnemyCount * RATIO_TO_ATTACK);
    }
  }
}

// Try to keep the enemy in sight 
function stalkingLocation(armyX, armyY, enemyX, enemyY, guardX, guardY, baseX, baseY, moveX, moveY) {
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const distance = distx * distx + disty * disty;

  if (distance <= MIN_STALK_RANGE) {
    if (guardX && guardY) {
      if (distanceBetween(guardX, guardY, baseX, baseY) < MIN_GUARD_RANGE) {
        return step(guardX, guardY, enemyX, enemyY);
      } else {
        return { x: guardX, y: guardY };
      }
    }

    return { x: baseX, y: baseY };
  } else if (distance >= MAX_STALK_RANGE) {
    return { x: enemyX, y: enemyY };
  }

  if (moveX && moveY && (Math.abs(moveX - armyX) > 2) && (Math.abs(moveY - armyY) > 2)) {
    return step(armyX, armyY, moveX, moveY);
  }

  return { x: armyX, y: armyY };
}

function distanceBetween(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
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

function trace(modeBefore, modeNow, input, x, y) {
  if (!TROUBLESHOOTING) return;

  const line = [modeBefore, ">>", modeNow];
  if (x && y) {
    line.push(x.toFixed(1));
    line.push(y.toFixed(1));
  }
  line.push("|");
  for (const i of input) {
    if (i) {
      line.push(i.toFixed(1));
    } else {
      line.push("-");
    }
  }

  const armyX = input[9];
  const armyY = input[10];
  const enemyX = input[12];
  const enemyY = input[13];
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const distance = Math.sqrt(distx * distx + disty * disty);
  line.push("|");
  line.push(distance ? distance.toFixed(1) : "???");

  console.log(line.join(" "));
}
