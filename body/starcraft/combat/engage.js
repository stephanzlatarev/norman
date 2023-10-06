import Fight from "./fight.js";

export default function(units) {
  const engagements = [];
  const warriors = [];
  const enemies = [];

  for (const unit of units.values()) {
    if (unit.combat.isWarrior) {
      warriors.push(unit);
    } else if (unit.combat.isEnemy) {
      enemies.push(unit);
    }
  }

  if (!warriors.length) return [];

  assessStrength(enemies, warriors);

  enemies.sort((a, b) => (a.combat.strength - b.combat.strength));

  for (const target of enemies) {
    const attackers = warriors.slice(0, 2);
    engagements.push(new Fight(target, attackers));

    warriors.splice(0, 2);
    if (!warriors.length) break;
  }

  return engagements;
}

function assessStrength(enemies, warriors) {
  for (const one of enemies) {
    one.combat.strength = 0;

    for (const another of enemies) {
      if (one !== another) {
        one.combat.strength += support(one, another);
      }
    }
  }

  for (const enemy of enemies) {
    for (const warrior of warriors) {
      enemy.combat.strength += distance(enemy, warrior) / 3;
    }
  }
}

function support(a, b) {
  const d = distance(a, b);
  return (d < 10) ? (10 - d) : 0;
}

function distance(a, b) {
  return Math.sqrt((a.pos.x - b.pos.x) * (a.pos.x - b.pos.x) + (a.pos.y - b.pos.y) * (a.pos.y - b.pos.y));
}
