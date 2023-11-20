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
  if ((warrior.order.abilityId !== 3674) || (warrior.order.targetUnitTag !== targetUnit.tag)) {
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
  const grid = array(882);
  let isEnemyInSight = false;

  for (const unit of units.values()) {
    if (unit === warrior) continue;

    const c = cell(unit.body.x - warrior.body.x, unit.body.y - warrior.body.y);
    if ((c < 0) || (c >= grid.length)) continue;

    if (unit.isWarrior) {
      grid[c + 441] += unit.armor.health;
    } else if (unit.isEnemy) {
      grid[c] += unit.armor.health;
      isEnemyInSight = true;
    }
  }
  
  return isEnemyInSight ? grid : null;
}

function findTarget(warrior, direction, units) {
  const pos = { x: warrior.body.x + direction[0], y: warrior.body.y + direction[1] };

  let bestDistance = Infinity;
  let bestTarget;

  // TODO: When warrior's weapon is loaded and there are enemy units within range, then prefer one with lowest health as target.
  for (const unit of units.values()) {
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

function cell(x, y) {
  if ((x < -10) || (x > 10) || (y < -10) || (y > 10)) return -1;
  return Math.round(21 * (10 + Math.round(y)) + (10 + Math.round(x)));
}

function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
