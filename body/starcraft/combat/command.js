import Brain from "./brain.js";
import Mission from "./mission.js";

const brain = new Brain();

export default async function(missions, commands, units) {
  for (const mission of missions) {
    if (mission.type === Mission.Scout) {
      commandScoutMission(commands, mission);
    } else {
      await commandAssaultMission(commands, mission, units);
    }
  }
}

async function commandAssaultMission(commands, mission, units) {
  const warriors = [];
  const inputs = [];

  for (const warrior of mission.warriors) {
    const situation = createSituation(warrior, units);

    if (situation) {
      warriors.push(warrior);
      inputs.push(situation);
    } else {
      // TODO: Change this to a move command to avoid targeting warriors to units they cannot attack, e.g. phoenix vs marine
      createAttackCommand(commands, warrior, mission.target);
    }
  }

  if (warriors.length) {
    const outputs = await brain.react(inputs);

    for (let i = 0; i < warriors.length; i++) {
      const warrior = warriors[i];
      const target = findTarget(warrior, outputs[i], units);

      createAttackCommand(commands, warrior, target);
    }
  }
}

function commandScoutMission(commands, mission) {
  for (const warrior of mission.warriors) {
    createMoveCommand(commands, warrior, mission.target);
  }
}

function createAttackCommand(commands, warrior, targetUnit) {
  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== targetUnit.tag)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 3674, targetUnitTag: targetUnit.tag, queueCommand: false });
  }
}

function createMoveCommand(commands, warrior, pos) {
  if ((warrior.order.abilityId !== 16) || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [warrior.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function isSamePosition(a, b) {
  return ((a.x >= b.x - 0.1) && (a.x <= b.x + 0.1) && (a.y >= b.y - 0.1) && (a.y <= b.y + 0.1));
}

function createSituation(warrior, units) {
  const situation = array(156);
  const byApproximateDistanceToWarrior = (a, b) => byApproximateDistance(warrior.body, a.body, b.body);
  const warriors = [];
  const enemyWarriors = [];
  const enemyStructures = [];

  for (const unit of units.values()) {
    if (unit === warrior) continue;

    if (unit.isWarrior && unit.weapon.damage) {
      warriors.push(unit);
    } else if (unit.isEnemy) {
      if (unit.weapon.damage) {
        enemyWarriors.push(unit);
      } else {
        enemyStructures.push(unit);
      }
    }
  }

  const enemies = enemyWarriors.length ? enemyWarriors : enemyStructures;
  enemies.sort(byApproximateDistanceToWarrior);
  warriors.sort(byApproximateDistanceToWarrior);

  situation[0] = warrior.body.radius;
  situation[1] = warrior.body.speed;
  situation[2] = warrior.armor.health;
  situation[3] = warrior.weapon.damage;
  situation[4] = warrior.weapon.range;
  situation[5] = warrior.weapon.cooldown;

  for (let i = 0; (i < warriors.length) && (i < 10); i++) {
    const support = warriors[i];
    const offset = 6 + i * 8;

    situation[offset] = support.body.x - warrior.body.x;
    situation[offset + 1] = support.body.y - warrior.body.y;
    situation[offset + 2] = support.body.radius;
    situation[offset + 3] = support.body.speed;
    situation[offset + 4] = support.armor.health;
    situation[offset + 5] = support.weapon.damage;
    situation[offset + 6] = support.weapon.range;
    situation[offset + 7] = support.weapon.cooldown;
  }

  for (let i = 0; (i < enemies.length) && (i < 10); i++) {
    const enemy = enemies[i];
    const offset = 86 + i * 7;

    situation[offset] = enemy.body.x - warrior.body.x;
    situation[offset + 1] = enemy.body.y - warrior.body.y;
    situation[offset + 2] = enemy.body.radius;
    situation[offset + 3] = enemy.body.speed;
    situation[offset + 4] = enemy.armor.health;
    situation[offset + 5] = enemy.weapon.damage;
    situation[offset + 6] = enemy.weapon.range;
  }
  
  return enemies.length ? situation : null;
}

function byApproximateDistance(center, a, b) {
  const da = Math.max(Math.abs(a.x - center.x), Math.abs(a.y - center.y));
  const db = Math.max(Math.abs(b.x - center.x), Math.abs(b.y - center.y));

  return da - db;
}

function findTarget(warrior, direction, units) {
  const pos = { x: warrior.body.x + direction[0], y: warrior.body.y + direction[1] };

  let bestDistance = Infinity;
  let bestTarget;

  // TODO: When warrior's weapon is loaded and there are enemy units within range, then prefer one with lowest health as target.
  for (const unit of units.values()) {
    // TODO: If warrior cannot attack this enemy unit, e.g. phoenix vs marine, then skip it and find another
    if (unit.isEnemy) {
      const distance = calculateDistance(unit.body, pos);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = unit;
      }
    }
  }

  return bestTarget;
}

function array(size) {
  const array = [];

  for (let i = 0; i < size; i++) {
    array.push(0);
  }

  return array;
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
