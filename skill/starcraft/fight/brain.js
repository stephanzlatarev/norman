
const MIN_ENGAGE_RANGE = 2 * 2;

const HARD_MIN_STALK_RANGE = 21 * 21;
const SOFT_MIN_STALK_RANGE = 22 * 22;
const SOFT_MAX_STALK_RANGE = 23 * 23;
const HARD_MAX_STALK_RANGE = 24 * 24;

const MIN_GUARD_RANGE = 36*36;

const MIN_TOTAL_ATTACK = 165; // When unit limit is below this number, don't go for total attack
const MAX_TOTAL_ATTACK = 195; // When unit limit is over this number, go for total attack

const MIN_WARRIOR_TOTAL_ATTACK = 30; // When own units are below this number, don't go for total attack
const MAX_WARRIOR_TOTAL_ATTACK = 40; // When own units are over this number, go for total attack

const ENEMY_COUNT_CAP = 22;   // Even if enemies are more than this, we'll consider them as many to ensure we eventually attack
const RATIO_TO_ATTACK = 1.0;  // Have this ratio of own vs enemy units to launch an attack
const RATIO_TO_RETREAT = 0.7; // Have this ratio of own vs enemy units to stop an ongoing attack
const ENERGY_TO_ATTACK = 10;  // Accumulate this much energy before launching an attack

const TROUBLESHOOTING = false;

export default class Brain {

  react(...input) {
    // When regrouping army will react to enemy alert but will not start attack until energy level and army count are at good levels
    const isRegrouping = input[0];

    const enemyAlert = input[1];
    const baseX = input[2];
    const baseY = input[3];
    const guardX = input[4];
    const guardY = input[5];
    const armyLeaderPack = input[6];
    const armyExtendedPack = input[7];
    const engagedCount = input[8];
    const armyEnergy = input[9];
    const armyX = input[10];
    const armyY = input[11];
    const enemyWarriorCount = input[12];
    const enemyWarriorX = input[13];
    const enemyWarriorY = input[14];
    const enemyDummyX = input[15];
    const enemyDummyY = input[16];
    const warriorCount = input[17];
    const totalCount = input[18];

    if (!armyX || !armyY) return;

    if (enemyWarriorX && enemyWarriorY) {
      if (enemyAlert || distanceBetween(enemyWarriorX, enemyWarriorY, baseX, baseY) < 10*10) {
        // Defend base
        trace(this.mode, "defend", input, enemyWarriorX, enemyWarriorY);
        this.mode = "defend";
        return [0, 0, 1, enemyWarriorX, enemyWarriorY];
      } else if (this.mode === "defend") {
        trace(this.mode, "disbanded", input, enemyWarriorX, enemyWarriorY);
        this.mode = "disbanded";
        return [0, 0, 0];
      }

      if ((totalCount >= MAX_TOTAL_ATTACK) || ((this.mode === "kill") && (totalCount >= MIN_TOTAL_ATTACK))) {
        // Total attack
        trace(this.mode, "kill", input, enemyWarriorX, enemyWarriorY);
        this.mode = "kill";
        return [0, 0, 1, enemyWarriorX, enemyWarriorY];
      }

      if ((warriorCount >= MAX_WARRIOR_TOTAL_ATTACK) || ((this.mode === "kill") && (warriorCount >= MIN_WARRIOR_TOTAL_ATTACK))) {
        // Total attack
        trace(this.mode, "kill", input, enemyWarriorX, enemyWarriorY);
        this.mode = "kill";
        return [0, 0, 1, enemyWarriorX, enemyWarriorY];
      }

      const armyIsEngaged = (engagedCount || (distanceBetween(armyX, armyY, enemyWarriorX, enemyWarriorY) <= MIN_ENGAGE_RANGE));
      if (armyIsEngaged) {
        this.engagement = 22.5 * 5; // Start five seconds engagement inertia
      } else if (this.engagement > 0) {
        this.engagement--;
      } else {
        this.engagement = 0;
      }

      if (shouldRegroup(isRegrouping, armyLeaderPack, armyExtendedPack, (this.engagement > 0), armyEnergy, enemyWarriorCount)) {
        // Rally army when energy levels are below 50% (only when regrouping) or when the army is smaller than enemy
        const location = stalkingLocation(armyX, armyY, enemyWarriorX, enemyWarriorY, guardX, guardY, baseX, baseY);

        trace(this.mode, "stalk", input, location.x, location.y);
        this.mode = "stalk";
        this.inertia = 22.5 * 3; // 3 seconds before switching from stalking to attacking
        return [1, 1, 0, location.x, location.y];
      }

      if ((this.mode === "stalk") && (this.inertia > 0)) {
        this.inertia--;
        trace(this.mode, "stalk", input);
        return;
      }

      // Attack enemy
      trace(this.mode, "attack", input, enemyWarriorX, enemyWarriorY);
      this.mode = "attack";
      return [0, 0, 1, enemyWarriorX, enemyWarriorY];
    } else if (enemyDummyX && enemyDummyY) {
      // Destroy dummy target
      trace(this.mode, "destroy dummies", input, enemyDummyX, enemyDummyY);
      this.mode = "destroy dummies";
      return [0, 0, 1, enemyDummyX, enemyDummyY];
    }
  }

}

function shouldRegroup(isRegrouping, armyLeaderPack, armyExtendedPack, armyIsEngaged, armyEnergy, enemyCount) {
  const cappedEnemyCount = Math.min(enemyCount, ENEMY_COUNT_CAP);

  if (isRegrouping) {
    // We are retreating

    // If we don't have enough energy we won't launch an attack
    if (armyEnergy < ENERGY_TO_ATTACK) return true;

    // If we haven't gathered enough own units we won't launch an attack
    return (armyLeaderPack < cappedEnemyCount * RATIO_TO_ATTACK);
  } else {
    // We are advancing
    if (armyIsEngaged) {
      // We already fight. We should stop only if we see we are losing units
      return (armyExtendedPack < cappedEnemyCount * RATIO_TO_RETREAT);
    } else {
      // We haven't started yet. We can still go back if we see there are too many enemy units
      return (armyLeaderPack < cappedEnemyCount * RATIO_TO_ATTACK);
    }
  }
}

// Try to keep the enemy in sight 
function stalkingLocation(armyX, armyY, enemyX, enemyY, guardX, guardY, baseX, baseY) {
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const distance = distx * distx + disty * disty;

  if (distance <= HARD_MIN_STALK_RANGE) {
    if (guardX && guardY) {
      if (distanceBetween(guardX, guardY, baseX, baseY) < MIN_GUARD_RANGE) {
        return step(guardX, guardY, enemyX, enemyY);
      } else {
        return { x: guardX, y: guardY };
      }
    }

    return { x: baseX, y: baseY };
  } else if (distance <= SOFT_MIN_STALK_RANGE) {
    return step(armyX, armyY, baseX, baseY);
  } else if (distance >= HARD_MAX_STALK_RANGE) {
    return { x: enemyX, y: enemyY };
  } else if (distance >= SOFT_MAX_STALK_RANGE) {
    return step(armyX, armyY, enemyX, enemyY);
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
  if (modeNow !== modeBefore) console.log("Army", modeNow, input[6], "/", input[7], "vs", input[12], JSON.stringify(input));

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

  const armyX = input[10];
  const armyY = input[11];
  const enemyX = input[13];
  const enemyY = input[14];
  const distx = enemyX - armyX;
  const disty = enemyY - armyY;
  const distance = Math.sqrt(distx * distx + disty * disty);
  line.push("|");
  line.push(distance ? distance.toFixed(1) : "???");

  console.log(line.join(" "));
}