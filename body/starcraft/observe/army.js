import { WARRIORS, LEADER_RANK, USES_ENERGY } from "../units.js";

const ENEMY_ALERT_SQUARED = 40*40; // Squared distance which raises alert for enemies
const STALK_RANGE_SQUARED = 14*14; // Squared range for stalking enemies - just outside range of tanks in siege mode

export function observeArmy(model, observation) {
  const army = model.add("Army");
  const armyUnits = observation.ownUnits.filter(unit => WARRIORS[unit.unitType]);
  const potentialLeadersUnits = armyUnits.length ? armyUnits : observation.ownUnits;
  const leaderUnits = potentialLeadersUnits.filter(unit => LEADER_RANK[unit.unitType]);

  if (!leaderUnits.length) return;

  army.set("warriorCount", armyUnits.length);
  army.set("totalCount", observation.playerCommon.foodUsed);

  selectBase(model, army, observation);
  selectLeader(model, army, leaderUnits);
  selectGuard(model, army, leaderUnits);

  const leader = army.get("leader");
  const pack = getPack(armyUnits, leader, 5);
  promoteLeader(model, army, pack);

  army.set("engagedCount", pack.filter(unit => (unit.engagedTargetTag !== "0")).length);
  army.set("leaderPack", pack.length);
  army.set("extendedPack", getPack(armyUnits, leader, 10).length);

  // We want to know the max energy level a unit in the army pack has
  let energy = 0;
  let energyUnitsCount = 0;
  for (const unit of pack) {
    if (USES_ENERGY[unit.unitType]) {
      energyUnitsCount++;
      energy = Math.max(energy, unit.energyMax ? Math.floor(100 * unit.energy / unit.energyMax) : 100);
    }
  }
  army.set("energy", energyUnitsCount ? energy : 100);
}

function getPack(units, leader, distance) {
  const x = leader.get("x");
  const y = leader.get("y");

  return units.filter(unit => near(unit, x, y, distance));
}

function selectBase(model, army, observation) {
  if (!army.get("base")) {
    const nexus = observation.ownUnits.find(unit => (unit.unitType === 59));
    const base = model.get(nexus.tag);

    army.set("base", base.set("army:base", true).set("flag:fight", true));
  }
}

function selectLeader(model, army, leaderUnits) {
  if (army.get("leader")) return;

  const enemy = model.get("Enemy");
  const enemyX = enemy.get("warriorX");
  const enemyY = enemy.get("warriorY");

  let leader;

  if (enemyX && enemyY) {
    const base = army.get("base");
    const baseTangence = tangence(base.get("x"), base.get("y"), enemyX, enemyY);

    for (const unit of leaderUnits) {
      unit.squareDistanceToEnemy = squareDistanceInLine(unit.pos.x, unit.pos.y, enemyX, enemyY, baseTangence);
    }

    const order = leaderUnits.sort((a, b) => (a.squareDistanceToEnemy - b.squareDistanceToEnemy));

    for (const unit of order) {
      if (unit.squareDistanceToEnemy <= STALK_RANGE_SQUARED) {
        leader = unit;
      } else {
        break;
      }
    }
  }

  if (!leader) {
    leader = leaderUnits[0];
  }

  army.set("leader", model.get(leader.tag).set("army:leader", true).set("flag:fight", true));
}

function promoteLeader(model, army, pack) {
  const leader = army.get("leader");
  let bestLeader = leader.label;
  let bestRank = leader.get("rank");

  for (const unit of pack) {
    const unitRank = LEADER_RANK[unit.unitType];

    if (unitRank > bestRank) {
      bestLeader = unit.tag;
      bestRank = unitRank;
    }
  }

  if (bestLeader !== leader.label) {
    army.set("leader", model.get(bestLeader).set("rank", bestRank).set("army:leader", true).set("flag:fight", true));
    leader.clear("army:leader").clear("flag:fight");
  }
}

function selectGuard(model, army, units) {
  const base = army.get("base");
  const baseX = base.get("x");
  const baseY = base.get("y");

  let guard = army.get("guard");

  if (!guard || (distance(guard.get("x"), guard.get("y"), baseX, baseY) > ENEMY_ALERT_SQUARED)) {
    const unit = units.find(unit => (distance(unit.pos.x, unit.pos.y, baseX, baseY) < ENEMY_ALERT_SQUARED));

    if (unit && (!guard || (unit.tag !== guard.label))) {
      if (guard && (guard !== base)) {
        guard.clear("army:guard").clear("flag:fight");
      }

      guard = model.get(unit.tag).set("army:guard", true).set("flag:fight", true);
      army.set("guard", guard);
    }
  }

  if (!guard) {
    army.set("guard", base.set("army:guard", true).set("flag:fight", true));
  }
}

function near(unit, x, y, distance) {
  return (Math.abs(unit.pos.x - x) <= distance) && (Math.abs(unit.pos.y - y) <= distance);
}

function tangence(baseX, baseY, enemyX, enemyY) {
  return Math.atan2(baseY - enemyY, baseX - enemyX);
}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

function squareDistanceInLine(unitX, unitY, enemyX, enemyY, baseTangence) {
  const uex = (unitX - enemyX);
  const uey = (unitY - enemyY);
  const ued = uex * uex + uey * uey;
  const uec = Math.cos(Math.atan2(uey, uex) - baseTangence);
  return ued * uec * uec * Math.sign(uec);
}
