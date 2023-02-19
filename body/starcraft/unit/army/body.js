import Unit from "../body.js";

export default class Army extends Unit {

  constructor(node) {
    super(node);
  }

  observe(observation, owner, enemy) {
    this.observation = observation;
    this.owner = owner;
    this.enemy = enemy;
  }

  async tock() {
    if (this.node.get("rally")) {
      const location = this.node.get("rally");
      const locationX = location.get("x");
      const locationY = location.get("y");

      if (super.command(16, null, { x: locationX, y: locationY }, "move")) {
        this.node.set("orders", [{ unitTags: [...this.node.get("tag")], abilityId: 16, targetWorldSpacePos: { x: locationX, y: locationY } }]);
      }
    } else if (this.node.get("attack")) {
      const armyX = this.node.get("armyX");
      const armyY = this.node.get("armyY");
      const location = this.node.get("attack");
      const locationX = location.get("x");
      const locationY = location.get("y");
      const distanceToEnemy = (armyX - locationX) * (armyX - locationX) + (armyY - locationY) * (armyY - locationY);

      if (this.observation && (distanceToEnemy < 200)) {
        await micro(this, armyX, armyY);

        const fleetTags = this.observation.ownUnits.filter(unit => FLEET[unit.unitType]).map(unit => unit.tag);
        await super.directCommand(fleetTags, 3674, null, { x: locationX, y: locationY });
      } else {
        if (super.command(3674, null, { x: locationX, y: locationY }, "attack")) {
          this.node.set("orders", [{ unitTags: [...this.node.get("tag")], abilityId: 3674, targetWorldSpacePos: { x: locationX, y: locationY } }]);
        }
      }
    } else {
      this.node.set("orders", []);
    }

    await super.tock();
  }

}

const GANG = 3;

const WARRIORS = {
  73: "zealot",
  74: "stalker",
  77: "sentry",
};

const FLEET = {
  10: "mothership",
  79: "carrier",
  78: "phoenix",
  80: "voidray",
};

const SPEED_SQUARED = {
  73: (3.15 / 22.5) * (3.15 / 22.5), // zealot
  74: (3.15 / 22.5) * (3.15 / 22.5), // stalker
  77: (4.15 / 22.5) * (4.15 / 22.5), // sentry
};

const RANGE_SQUARED = {
  73: 0.1,   // zealot
  74: 6 * 6, // stalker
  77: 5 * 5, // sentry
};

const ownMode = {};
const ownLocked = {};
const ownToEnemy = {};
const ownToLocation = {};

function mapUnits(units) {
  const map = {};
  for (const unit of units) map[unit.tag] = unit;
  return map;
}

function isValidTarget(unit, enemy) {
  return (unit.owner === enemy) && (unit.displayType === 1);
}

function distance(a, b) {
  return (a.pos.x - b.pos.x) * (a.pos.x - b.pos.x) + (a.pos.y - b.pos.y) * (a.pos.y - b.pos.y);
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

function findMostVulnerableTarget(units, ownLocked, ownToEnemy, targets) {
  let bestTargetTag;
  let bestAttackerTags = [];

  for (const targetTag in targets) {
    const target = targets[targetTag];
    const attackerTags = [];

    // First, find if some of my units are locked on this target
    for (const unitTag in units) {
      if (ownLocked[unitTag] && (ownToEnemy[unitTag] === targetTag)) {
        attackerTags.push(unitTag);
      }
    }
    if (attackerTags.length >= GANG) {
      return { targetTag: targetTag, attackerTags: attackerTags };
    }

    // Then, check for additional attackers
    for (const unitTag in units) {
      if (ownLocked[unitTag]) continue;

      const unit = units[unitTag];
      const range = RANGE_SQUARED[unit.unitType];
      const walk = SPEED_SQUARED[unit.unitType] * unit.weaponCooldown * unit.weaponCooldown;

      if (distance(unit, target) <= range + walk) {
        attackerTags.push(unitTag);

        if (attackerTags.length >= GANG) {
          return { targetTag: targetTag, attackerTags: attackerTags };
        }
      }
    }

    if (attackerTags.length > bestAttackerTags.length) {
      bestTargetTag = targetTag;
      bestAttackerTags = attackerTags;
    }
  }

  return (bestAttackerTags.length > 1) ? { targetTag: bestTargetTag, attackerTags: bestAttackerTags } : null;
}

function findClosestTarget(unit, targets) {
  let closestTarget;
  let closestDistance = Infinity;

  for (const tag in targets) {
    let thisTarget = targets[tag];
    let thisDistance = distance(unit, thisTarget);

    if (thisDistance < closestDistance) {
      closestTarget = thisTarget;
      closestDistance = thisDistance;
    }
  }

  return closestTarget;
}

async function micro(army, armyX, armyY) {
  const units = mapUnits(army.observation.ownUnits.filter(unit => WARRIORS[unit.unitType]));
  const enemies = mapUnits(army.observation.rawData.units.filter(unit => isValidTarget(unit, army.enemy)));
  const nonLockedUnitTags = [];

  army.x = armyX;
  army.y = armyY;

  // Keep attacking units on target
  for (const unitTag in units) {
    const unit = units[unitTag];

    // Check expected attacked unit
    let enemy = enemies[ownToEnemy[unit.tag]];

    // Check actual attacked unit
    if (!enemy && unit.orders.length) {
      const enemyTag = unit.orders[0].targetUnitTag;
      if (enemyTag && enemies[enemyTag]) {
        enemy = enemies[enemyTag];
      }
    }

    ownToEnemy[unitTag] = enemy ? enemy.tag : null;
    ownLocked[unitTag] = (enemy && (unit.weaponCooldown < 1));

    if (!ownLocked[unitTag]) nonLockedUnitTags.push(unitTag);
  }

  // Assign non-locked units to vulnerable enemy targets
  const targets = {...enemies};
  while (nonLockedUnitTags.length) {
    const lock = findMostVulnerableTarget(units, ownLocked, ownToEnemy, targets);

    if (lock) {
      delete targets[lock.targetTag];
      for (const attackerTag of lock.attackerTags) {
        ownToEnemy[attackerTag] = lock.targetTag;
        ownLocked[attackerTag] = true;

        const index = nonLockedUnitTags.indexOf(attackerTag);
        if (index >= 0) nonLockedUnitTags.splice(index, 1);
      }
    } else {
      break;
    }
  }

  // Assign idle units
  for (const unitTag in units) {
    const unit = units[unitTag];

    if (!ownToEnemy[unitTag]) {
      const enemy = findClosestTarget(unit, enemies);
      ownToEnemy[unitTag] = enemy.tag;
    }
  }

  // Attack or step back
  for (const unitTag in units) {
    const unit = units[unitTag];
    const range = RANGE_SQUARED[unit.unitType];
    const walk = SPEED_SQUARED[unit.unitType] * unit.weaponCooldown * unit.weaponCooldown;
    const enemyTag = ownToEnemy[unitTag];
    const enemy = enemies[enemyTag];
    const distanceToEnemy = distance(unit, enemy);

    if ((unit.weaponCooldown < 1) || (distanceToEnemy >= range + walk)) {
      ownMode[unitTag] = "attack";
      ownToEnemy[unitTag] = enemy.tag;
    } else {
      ownMode[unitTag] = "move";
      ownToLocation[unitTag] = stepback(army, unit, enemy);
    }
  }

  // Issue commands
  const attackCommands = {};
  for (const unitTag in units) {
    if (ownMode[unitTag] === "attack") {
      const enemyTag = ownToEnemy[unitTag];
      if (!attackCommands[enemyTag]) attackCommands[enemyTag] = [];
      attackCommands[enemyTag].push(unitTag);
    } else if (ownMode[unitTag] === "move") {
      await army.directCommand([unitTag], 16, null, ownToLocation[unitTag]);
    }
  }
  for (const enemyTag in attackCommands) {
    await army.directCommand(attackCommands[enemyTag], 3674, enemyTag);
  }
}
