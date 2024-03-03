import { BASES, WORKERS } from "../units.js";

export default class DelayFirstEnemyExpansionMission {

  agentTag = null;
  enemyBasePos = null;
  enemyExpansionsPos = null;
  enemyWorkerTag = null;

  pendingEnemyExpansionsPos = null;
  pendingPylonPos = null;
  enemyExpansionExists = false;
  isBuildingPylons = false;
  isMissionComplete = false;

  constructor(map, model) {
    this.map = map;
    this.model = model;
  }

  run(commands, model, units, enemies) {
    if (this.isMissionComplete) return;

    const agent = findAgent(units, this.agentTag);
    if (!agent) {
      console.log("Agent died. Mission stopped.");
      this.isMissionComplete = true;
      return;
    }
    this.agentTag = agent.tag;

    if (!this.enemyBasePos || !this.enemyExpansionsPos) {
      this.enemyBasePos = findEnemyBase(model);
      this.enemyExpansionsPos = findEnemyExpansions(this.map.nexuses, this.enemyBasePos);
      this.pendingEnemyExpansionsPos = [...this.enemyExpansionsPos];
    }

    setAgentBusy(agent, this.model, true);

    if (this.pendingEnemyExpansionsPos.length) {
      const enemyExpansionPos = getClosest(agent.pos, this.pendingEnemyExpansionsPos);

      if (isInSightRange(agent.pos, enemyExpansionPos)) {
        this.enemyExpansionExists = doesEnemyExpansionExist(enemies, agent);

        if (this.enemyExpansionExists) {
          this.pendingEnemyExpansionsPos.length = 0;
        } else {
          this.pendingEnemyExpansionsPos.splice(this.pendingEnemyExpansionsPos.indexOf(enemyExpansionPos), 1);
          this.pendingPylonPos = enemyExpansionPos;
        }
      } else {
        createMoveCommand(commands, agent, enemyExpansionPos);
      }
    } else if (this.isBuildingPylons) {
      if (this.pendingPylonPos) {
        if (doesPylonExist(units, this.pendingPylonPos)) {
          this.pendingPylonPos = null;
        } else if (this.model.observation.playerCommon.minerals >= 100) {
          if (createPylonCommand(commands, agent, this.pendingPylonPos)) {
            this.model.observation.playerCommon.minerals -= 100;
          }
        } else {
          createMoveCommand(commands, agent, this.pendingPylonPos);
        }
      } else {
        setAgentBusy(agent, this.model, false);

        this.isMissionComplete = true;
      }
    } else if (agent.shield < agent.shieldMax) {
      // If enemy worker fights back then back off
      this.isBuildingPylons = true;

      if (this.pendingPylonPos) {
        createMoveCommand(commands, agent, this.pendingPylonPos);
      }
    } else {
      // Currently, the agent locks on the closest enemy worker it sees first and attacks it.
      // TODO: Check if enemy worker fights back:
      //         - If we lose shield too quickly, back off but keep watching for workers going for an expansion.
      //         - Otherwise, kill enemy unit and then restore shield.
      // TODO: During weapon cooldown, position agent closer to path to expansion. Use "facing" to detect pos of last turn before seeing first enemy worker. Step back towards it.
      // TODO: (only if not expansion exists) If enemy worker goes towards the expansion, reserve minerals for a pylon and create the pylon at first position to block expansion.
      //       The assumption is that the agent reaches the 5x5 plot before the enemy worker reaches the center.

      const enemyWorker = findClosestEnemyWorker(enemies, this.enemyWorkerTag, agent);

      if (enemyWorker) {
        this.enemyWorkerTag = enemyWorker.tag;

        createAttackCommand(commands, agent, enemyWorker);
      } else {
        createMoveCommand(commands, agent, this.enemyBasePos);
      }
    }
  }

  isComplete() {
    return this.isMissionComplete;
  }
}

// TODO: Use a memory node so that you don't have to search for it eery time. Replace the function with query inside the constructor.
function findAgent(units, tag) {
  for (const [_, unit] of units) {
    if (WORKERS[unit.unitType] && (!tag || (unit.tag === tag))) {
      return unit;
    }
  }
}

function setAgentBusy(agent, model, isBusy) {
  const image = model.get(agent.tag);

  if (image) {
    image.set("isWorker", isBusy);
  }

  agent.isBusy = isBusy;
}

function findClosestEnemyWorker(enemies, enemyWorkerTag, agent) {
  const enemyWorkers = [];

  for (const [_, enemy] of enemies) {
    if (WORKERS[enemy.unitType]) {
      if (enemy.tag === enemyWorkerTag) {
        return enemy;
      } else {
        enemyWorkers.push(enemy);
      }
    }
  }

  let closestSquareDistance = Infinity;
  let closestEnemyWorker = null;

  for (const enemyWorker of enemyWorkers) {
    const sd = squareDistance(enemyWorker.pos, agent.pos);

    if (sd < closestSquareDistance) {
      closestSquareDistance = sd;
      closestEnemyWorker = enemyWorker;
    }
  }

  return closestEnemyWorker;
}

// TODO: Use a memory node so that you can find it with a selector right from the start and you don't have to create a pos object. Replace the function with query inside the constructor.
function findEnemyBase(model) {
  const enemy = model.get("Enemy");

  return {
    x: enemy.get("baseX"),
    y: enemy.get("baseY"),
  };
}

// TODO: Use a memory node so that you can find it with a selector right from the start and you don't have to create a pos object. Replace the function with query inside the constructor.
// TODO: Improve map to find distances based on path distance 
function findEnemyExpansions(baseLocations, baseOne) {
  let firstClosestSquareDistance = Infinity;
  let firstClosestBaseLocation = null;
  let secondClosestSquareDistance = Infinity;
  let secondClosestBaseLocation = null;

  for (const baseLocation of baseLocations) {
    if ((baseLocation.x === baseOne.x) && (baseLocation.y === baseOne.y)) continue;

    const sd = squareDistance(baseLocation, baseOne);

    if (sd < firstClosestSquareDistance) {
      secondClosestBaseLocation = firstClosestBaseLocation;
      secondClosestSquareDistance = firstClosestSquareDistance;
      firstClosestBaseLocation = baseLocation;
      firstClosestSquareDistance = sd;
    } else if (sd < secondClosestSquareDistance) {
      secondClosestBaseLocation = baseLocation;
      secondClosestSquareDistance = sd;
    }
  }

  return [firstClosestBaseLocation, secondClosestBaseLocation];
}

function doesEnemyExpansionExist(enemies, agent) {
  for (const [_, enemy] of enemies) {
    if (BASES[enemy.unitType] && isInSightRange(agent.pos, enemy.pos)) {
      return enemy;
    }
  }
}

function doesPylonExist(units, pos) {
  for (const [_, unit] of units) {
    if ((unit.unitType === 60) && isSamePosition(unit.pos, pos)) {
      return unit;
    }
  }
}

function createMoveCommand(commands, agent, pos) {
  if (!agent || !pos) return;

  const order = agent.orders.length ? agent.orders[0] : { abilityId: 0 };

  if (!order || !order.abilityId && isCloseTo(agent.pos, pos)) return;

  if ((order.abilityId !== 16) || !order.targetWorldSpacePos || !isSamePosition(order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [agent.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
  }
}

function createAttackCommand(commands, agent, enemy) {
  if (!agent || !enemy) return;

  const order = agent.orders.length ? agent.orders[0] : { abilityId: 0 };

  if ((order.abilityId !== 23) || (order.targetUnitTag != enemy.tag)) {
    commands.push({ unitTags: [agent.tag], abilityId: 3674, targetUnitTag: enemy.tag, queueCommand: false });
  }
}


function createPylonCommand(commands, agent, pos) {
  if (!agent || !pos) return;

  const order = agent.orders.length ? agent.orders[0] : { abilityId: 0 };

  if ((order.abilityId !== 881) || !order.targetWorldSpacePos || !isSamePosition(order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [agent.tag], abilityId: 881, targetWorldSpacePos: pos, queueCommand: false });

    return true;
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isInSightRange(a, b) {
  return squareDistance(a, b) < 64;
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}

function getClosest(a, bs) {
  let closestDistance = Infinity;
  let closestPos = null;

  for (const b of bs) {
    const sd = squareDistance(a, b);

    if (sd < closestDistance) {
      closestDistance = sd;
      closestPos = b;
    }
  }

  return closestPos;
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
