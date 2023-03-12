import Unit from "../body.js";
import { DUMMY_TARGETS } from "../../units.js";

export default class Army extends Unit {

  constructor(node) {
    super(node);

    this.lastCommandToLeader;
    this.lastCommandToSupport;
    this.lastCommandToSupportWorkers;
  }

  observe(observation, enemy) {
    this.observation = observation;
    this.enemy = enemy;
  }

  async tock() {
    if (!this.node.get("tag")) return;

    if (this.node.get("rally")) {
      const location = this.node.get("rally");
      const locationX = location.get("x");
      const locationY = location.get("y");

      this.instruct(16, { x: locationX, y: locationY });
    } else if (this.node.get("attack")) {
      const armyX = this.node.get("armyX");
      const armyY = this.node.get("armyY");
      const location = this.node.get("attack");
      const locationX = location.get("x");
      const locationY = location.get("y");
      const squaredDistanceToEnemy = (armyX - locationX) * (armyX - locationX) + (armyY - locationY) * (armyY - locationY);

      if (this.observation && (squaredDistanceToEnemy < 200) && (await micro(this, armyX, armyY))) {
        const fleetTags = this.observation.ownUnits.filter(unit => FLEET[unit.unitType]).map(unit => unit.tag);
        if (fleetTags.length) {
          await super.directCommand(fleetTags, 3674, null, { x: locationX, y: locationY });
        }

        this.lastCommandToLeader = null;
        this.lastCommandToSupport = null;
        this.lastCommandToSupportWorkers = null;
      } else {
        this.instruct(3674, { x: locationX, y: locationY });
      }
    }

    await super.tock();
  }

  async instruct(command, position) {
    const leaderTag = this.node.get("tag");
    const supportTags = this.node.get("support");
    const supportWorkersTags = this.node.get("supportWorkers");
    const supportCount = (supportTags ? supportTags.length : 0) + (supportWorkersTags ? supportWorkersTags.length : 0);

    const digest = leaderTag + "-" + command + "-" + Math.floor(position.x) + ":" + Math.floor(position.y);
    if (digest !== this.lastCommandToLeader) {
      await super.directCommand([leaderTag], command, null, position);
      this.lastCommandToLeader = digest;
    }

    if (supportCount) {
      if (command === 3674) {
        if (supportTags && supportTags.length) {
          const digestSupport = digest + JSON.stringify(supportTags);
          if (digestSupport !== this.lastCommandToSupport) {
            await super.directCommand(supportTags, 3674, null, position);
            this.lastCommandToSupport = digestSupport;
          }
        }
        if (supportWorkersTags && supportWorkersTags.length) {
          const digestSupportWorkers = digest + JSON.stringify(supportWorkersTags);
          if (digestSupportWorkers !== this.lastCommandToSupportWorkers) {
            await super.directCommand(supportWorkersTags, 3674, null, position);
            this.lastCommandToSupportWorkers = digestSupportWorkers;
          }
        }
      } else if (supportTags && supportTags.length) {
        const digestSupport = leaderTag + "-" + command + "-" + JSON.stringify(supportTags);
        if (digestSupport !== this.lastCommandToSupport) {
          await super.directCommand(supportTags, 1, leaderTag);
          this.lastCommandToSupport = digestSupport;
        }
      }
    } else {
      this.lastCommandToSupport = null;
      this.lastCommandToSupportWorkers = null;
    }
  }

}

const GANG = 4;

const WARRIORS = {
  73: "zealot",
  74: "stalker",
  77: "sentry",
};

const WORKERS = {
  84: "probe",
};

const IS_RANGED = {
  73: false, // zealot
  74: true,  // stalker
  77: true,  // sentry
  84: false, // probe
};

const FLEET = {
  10: "mothership",
  79: "carrier",
  78: "phoenix",
  80: "voidray",
};

const SPEED = {
  73: (3.15 / 22.5), // zealot
  74: (3.15 / 22.5), // stalker
  77: (4.15 / 22.5), // sentry
  84: (3.94 / 22.5), // probe
};

const RANGE = {
  73: 0.1, // zealot
  74: 6.0, // stalker
  77: 5.0, // sentry
  84: 0.1, // probe
};

const DAMAGE = {
  73:  8, // zealot
  74: 13, // stalker
  77:  6, // sentry
  84:  5, // probe
};

const SENTRY_COOLDOWN = 0.71 * 22.5;
const ZEALOT_COOLDOWN = 14;

function isValidTarget(unit, enemy) {
  return (unit.owner === enemy) && !DUMMY_TARGETS[unit.unitType] && (unit.displayType === 1) && !unit.isHallucination;
}

function weaponTime(unit) {
  if (unit.unitType === 73) {
    // Zealots have two hits
    return (unit.weaponCooldown >= ZEALOT_COOLDOWN) ? 0 : unit.weaponCooldown;
  } else if (unit.unitType === 77) {
    // Sentries lock on target with negative weapon cooldown
    return (unit.weaponCooldown < 0) ? SENTRY_COOLDOWN : unit.weaponCooldown;
  }
  return unit.weaponCooldown;
}

function walkTime(unit, distance) {
  return (distance - RANGE[unit.unitType]) / SPEED[unit.unitType];
}

function engageTime(unit, distance) {
  return Math.max(walkTime(unit, distance), weaponTime(unit));
}

function distance(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return Math.sqrt(dx * dx + dy * dy) - a.radius - b.radius;
}

function stepback(army, unit, enemy) {
  let dx = unit.pos.x - enemy.pos.x;
  let dy = unit.pos.y - enemy.pos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const adx = Math.abs(dx);
    dy += Math.sign(unit.pos.y - army.y) * adx;
    dy /= adx;
    dx = Math.sign(dx);
  } else {
    const ady = Math.abs(dx);
    dx += Math.sign(unit.pos.x - army.x) * ady;
    dx /= ady;
    dy = Math.sign(dy);
  }

  return {
    x: unit.pos.x + dx,
    y: unit.pos.y + dy,
  };
}

function calculateMatrix(units, enemies) {
  const matrix = {
    distance: {},
    time: {},
    unitEngaged: [],
    unitDamage: [],
    unitIsRanged: [],
    enemyEngaged: [],
    enemyHealth: [],
    enemyPotentialDamage: [],
    enemyMeleeAttackers: [],
    enemyRangedAttackers: [],
  };

  for (const enemyIndex in enemies) {
    const enemy = enemies[enemyIndex];
    matrix.enemyEngaged[enemyIndex] = false;
    matrix.enemyHealth[enemyIndex] = enemy.health + enemy.shield;
    matrix.enemyPotentialDamage[enemyIndex] = 0;
    matrix.enemyMeleeAttackers[enemyIndex] = 0;
    matrix.enemyRangedAttackers[enemyIndex] = 0;
  }

  for (const unitIndex in units) {
    const unit = units[unitIndex];
    const unitDamage = DAMAGE[unit.unitType];
    const unitIsRanged = IS_RANGED[unit.unitType];

    matrix.unitEngaged[unitIndex] = false;
    matrix.unitDamage[unitIndex] = unitDamage;
    matrix.unitIsRanged[unitIndex] = unitIsRanged;

    const distanceRow = [];
    const timeRow = [];
    for (const enemyIndex in enemies) {
      const d = distance(unit, enemies[enemyIndex]);
      const t = engageTime(unit, d);
      distanceRow.push(d);
      timeRow.push(t);

      if (unitIsRanged) {
        if (t < 1) matrix.enemyPotentialDamage[enemyIndex] += unitDamage;
      } else {
        if (t <= 0) matrix.enemyPotentialDamage[enemyIndex] += unitDamage;
      }
    }
    matrix.distance[unitIndex] = distanceRow;
    matrix.time[unitIndex] = timeRow;
  }

  return matrix;
}

function updateMatrix(matrix, pair) {
  matrix.unitEngaged[pair.unitIndex] = true;
  matrix.enemyHealth[pair.enemyIndex] -= matrix.unitDamage[pair.unitIndex];
  matrix.enemyEngaged[pair.enemyIndex] = (matrix.enemyHealth[pair.enemyIndex] <= 0);

  if (matrix.unitIsRanged[pair.unitIndex]) {
    matrix.enemyRangedAttackers[pair.enemyIndex]++;
  } else {
    matrix.enemyMeleeAttackers[pair.enemyIndex]++;
  }
}

function getFightPair(matrix, units, unitIndex, enemies, enemyIndex) {
  return {
    unitIndex: unitIndex,
    unit: units[unitIndex],
    enemyIndex: enemyIndex,
    enemy: enemies[enemyIndex],
    time: matrix.time[unitIndex][enemyIndex],
    distance: matrix.distance[unitIndex][enemyIndex],
  };
}

function chooseFightPair(matrix, units, enemies) {
  let bestUnitIndex;
  let bestEnemyIndex;

  // Find the unit which is ready to hit
  let bestEnemyRemainingHealth = Infinity;
  for (const unitIndex in matrix.unitEngaged) {
    if (matrix.unitEngaged[unitIndex]) continue;

    for (const enemyIndex in matrix.enemyEngaged) {
      if (matrix.enemyEngaged[enemyIndex]) continue;

      const enemyRemainingHealth = matrix.enemyHealth[enemyIndex] - matrix.enemyPotentialDamage[enemyIndex];
      if (enemyRemainingHealth < bestEnemyRemainingHealth) continue;

      if (matrix.unitIsRanged[unitIndex]) {
        // This is a ranged unit. It must be close enough to the enemy
        if (matrix.time[unitIndex][enemyIndex] < 1) {
          bestUnitIndex = unitIndex;
          bestEnemyIndex = enemyIndex;
          bestEnemyRemainingHealth = enemyRemainingHealth;
        }
      } else {
        // This is a melee unit. It must be next to the enemy
        if (matrix.time[unitIndex][enemyIndex] <= 0) {
          bestUnitIndex = unitIndex;
          bestEnemyIndex = enemyIndex;
          bestEnemyRemainingHealth = enemyRemainingHealth;
        }
      }
    }
  }
  if ((bestUnitIndex >= 0) && (bestEnemyIndex >= 0)) {
    return getFightPair(matrix, units, bestUnitIndex, enemies, bestEnemyIndex);
  }

  // Find the unit which is closest to enemy
  let bestDistance = Infinity;
  let bestTime = Infinity;
  for (const unitIndex in matrix.unitEngaged) {
    if (matrix.unitEngaged[unitIndex]) continue;

    for (const enemyIndex in matrix.enemyEngaged) {
      if (matrix.enemyEngaged[enemyIndex]) continue;
      if (matrix.time[unitIndex][enemyIndex] > bestTime) continue;
      if (!matrix.unitIsRanged[unitIndex] && (matrix.enemyMeleeAttackers[enemyIndex] >= GANG)) continue;

      if ((matrix.time[unitIndex][enemyIndex] < bestTime) || (matrix.distance[unitIndex][enemyIndex] < bestDistance)) {
        bestDistance = matrix.distance[unitIndex][enemyIndex];
        bestTime = matrix.time[unitIndex][enemyIndex];
        bestUnitIndex = unitIndex;
        bestEnemyIndex = enemyIndex;
      }
    }
  }
  if ((bestUnitIndex >= 0) && (bestEnemyIndex >= 0)) {
    return getFightPair(matrix, units, bestUnitIndex, enemies, bestEnemyIndex);
  }
}

async function fight(army, pair) {
  if (pair.time < 1) {
    await army.directCommand([pair.unit.tag], 3674, pair.enemy.tag);
  } else {
    const walk = walkTime(pair.unit, pair.distance) + 6;
    const range = weaponTime(pair.unit);

    if (walk > range) {
      await army.directCommand([pair.unit.tag], 3674, pair.enemy.tag);
    } else {
      await army.directCommand([pair.unit.tag], 16, null, stepback(army, pair.unit, pair.enemy));
    }
  }
}

async function micro(army, armyX, armyY) {
  const enemies = army.observation.rawData.units.filter(unit => isValidTarget(unit, army.enemy));
  if (!enemies.length) return false;

  const units = army.node.get("mobilization")
    ? army.observation.ownUnits.filter(unit => (WARRIORS[unit.unitType] || WORKERS[unit.unitType]))
    : army.observation.ownUnits.filter(unit => WARRIORS[unit.unitType]);
  if (!units.length) return false;

  army.x = armyX;
  army.y = armyY;

  const matrix = calculateMatrix(units, enemies);

  let pair;
  while (pair = chooseFightPair(matrix, units, enemies)) {
    await fight(army, pair);
    updateMatrix(matrix, pair);
  }

  return true;
}
