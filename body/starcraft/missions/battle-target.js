import Mission from "../mission.js";
import Zone from "../map/zone.js";
import Resources from "../memo/resources.js";

export default class BattleTargetMission extends Mission {

  run() {
    for (const zone of Zone.list()) {
      const battle = zone.battle;

      if (!battle) continue;

      if (battle.frontline.groundToGround.size) {
        const fightersGround = battle.fighters.filter(fighter => (fighter.agent.type.attackGround > 0));

        setTargets(fightersGround, battle.frontline.groundToGround);
      }

      if (battle.frontline.groundToAir.size) {
        const fightersAir = battle.fighters.filter(fighter => (fighter.agent.type.attackAir > 0));

        setTargets(fightersAir, battle.frontline.groundToAir);
      }
    }
  }

}

// Assign targets with focus fire
// Swap fighters when needed. For example, a melee unit should be closer to the target than a ranged unit
// TODO: Make sure fighters do not change targets unless necessary
// TODO: Group warriors on targets for focused fire
// TODO: Don't group more warriors on targets than needed for a single shot kill
// TODO: Prefer instant kills (damage >= health)
// TODO: Prefer lower health (min health)
// TODO: Prefer enemy with higher DPS
// TODO: Prefer attack which concentrates higher warrior DPS
// TODO: Prefer cast spellers with large impact
function setTargets(fighters, frontlinePositions) {
  const targetPositions = new Set(frontlinePositions);

//  focusOnVisibleTargets(fighters, targetPositions);

  excludeOccupiedPositions(fighters, targetPositions);
  redirectDeployedFighters(fighters, targetPositions);

  redirectRallyingFighters(fighters, targetPositions, frontlinePositions);
  assignNewlyHiredFighters(fighters, targetPositions, frontlinePositions);
}

function focusOnVisibleTargets(fighters, positions) {
  for (const fighter of fighters) {
    if (fighter.position) {
      const target = fighter.position.target;

      if (!target || (target.lastSeen < Resources.loop)) {
        positions.delete(fighter.position);
        fighter.direct(null);
      }
    }
  }

  for (const position of positions) {
    if (!position.target || (position.target.lastSeen < Resources.loop)) {
      positions.delete(position);
    }
  }
}

function excludeOccupiedPositions(fighters, positions) {
  for (const fighter of fighters) {
    if (fighter.position && fighter.position.isValid) {
      positions.delete(fighter.position);
    }
  }
}

function redirectDeployedFighters(fighters, positions) {
  for (const fighter of fighters) {
    // Check if there are available positions
    if (!positions.size) break;

    // Check if this is a deployed fighter
    if (!fighter.isDeployed || !fighter.position || !fighter.position.isValid) continue;

    const position = findBestNeighborPosition(fighter.agent, positions, fighter.position);

    if (position) {
      const oldScore = fighter.position.score(fighter.agent);
      const newScore = position.score(fighter.agent);
  
      if (newScore > oldScore) {
        positions.add(fighter.position);
        positions.delete(position);

        fighter.direct(position);
      }
    }
  }
}

function redirectRallyingFighters(fighters, remainingPositions, frontlinePositions) {
  let availablePositions = new Set(remainingPositions);

  for (const fighter of fighters) {
    // Check if this is a rallying fighter that needs to be redirected
    if (!fighter.assignee || !fighter.position || (fighter.position && fighter.position.isValid)) continue;

    // Check if there are available positions
    if (!availablePositions.size) {
      availablePositions = new Set(frontlinePositions);
    }

    const position = findClosestPosition(fighter.assignee, availablePositions);

    if (position) {
      availablePositions.delete(position);

      fighter.direct(position);
    }
  }
}

function assignNewlyHiredFighters(fighters, remainingPositions, frontlinePositions) {
  let availablePositions = new Set(remainingPositions);

  for (const fighter of fighters) {
    // Check if this is a new hire
    if (fighter.position && fighter.position.isValid) continue;

    // Check if there are available positions
    if (!availablePositions.size) {
      availablePositions = new Set(frontlinePositions);
    }

    const position = findBestScorePosition(fighter.agent, availablePositions);

    if (position) {
      availablePositions.delete(position);

      fighter.direct(position);
    }
  }
}

function findBestScorePosition(warrior, positions) {
  let bestPosition;
  let bestScore = -Infinity;

  for (const position of positions) {
    const score = position.score(warrior);

    if (score > bestScore) {
      bestPosition = position;
      bestScore = score;
    }
  }

  return bestPosition;
}

function findBestNeighborPosition(warrior, positions, position) {
  let bestPosition;
  let bestScore = -Infinity;

  for (const neighbor of positions) {
    if ((Math.abs(neighbor.x - position.x) <= 3) && (Math.abs(neighbor.y - position.y) <= 3)) {
      const score = position.score(warrior);

      if (score > bestScore) {
        bestPosition = position;
        bestScore = score;
      }
    }
  }

  return bestPosition;
}

function findClosestPosition(warrior, positions) {
  let bestPosition;
  let bestDistance = Infinity;

  for (const position of positions) {
    const distance = Math.abs(warrior.body.x - position.x) + Math.abs(warrior.body.y - position.y);

    if (distance < bestDistance) {
      bestPosition = position;
      bestDistance = distance;
    }
  }

  return bestPosition;
}
