import { RANGE } from "../units.js";

export default async function(client, hotspot) {
  const enemy = findCenterOfEnemies(hotspot.enemies);

  for (const warrior of hotspot.warriors) {
    const target = findTargetInRange(warrior, hotspot.enemies);

    if (target) {
      await command(client, warrior.tag, 3674, target.tag);
    } else {
      await command(client, warrior.tag, 16, undefined, away(warrior, enemy));
    }
  }
}

async function command(client, unitTag, abilityId, targetUnitTag, targetWorldSpacePos) {
  const command = { unitTags: [unitTag], abilityId: abilityId, targetUnitTag: targetUnitTag, targetWorldSpacePos: targetWorldSpacePos, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log("defend:", JSON.stringify(command), ">>", JSON.stringify(response));
}

function findCenterOfEnemies(enemies) {
  let sumX = 0;
  let sumY = 0;

  for (const enemy of enemies) {
    sumX += enemy.pos.x;
    sumY += enemy.pos.y;
  }

  return { pos: { x: sumX / enemies.length, y: sumY / enemies.length } };
}

function findTargetInRange(unit, targets) {
  if (unit.weaponCooldown > 0) return;

  const range = RANGE[unit.unitType];

  for (const target of targets) {
    if (distance(unit, target) < range) {
      return target;
    }
  }
}

function distance(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  return Math.sqrt(dx * dx + dy * dy) - a.radius - b.radius;
}

function away(unit, enemy) {
  let dx = unit.pos.x - enemy.pos.x;
  let dy = unit.pos.y - enemy.pos.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    dy /= Math.abs(dx);
    dx = Math.sign(dx);
  } else {
    dx /= Math.abs(dy);
    dy = Math.sign(dy);
  }

  return {
    x: unit.pos.x + dx,
    y: unit.pos.y + dy,
  };
}
