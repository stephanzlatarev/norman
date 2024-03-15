import Depot from "../depot.js";
import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

export default class DelayFirstEnemyExpansionMission extends Mission {

  job = null;

  run() {
    if (!this.job) {
      this.job = new AnnoyEnemy();
    }
  }

}

class AnnoyEnemy extends Job {

  enemyExpansions = null;

  enemyWorker = null;
  pendingPylonPos = null;
  isBuildingPylon = false;

  constructor() {
    super("annoy enemy", 100, {
      assignee: { type: Types.unit("Worker") }
    });
  }

  execute() {
    if (!this.assignee.isAlive) {
      console.log("Agent died. Mission 'Delay first enemy expansion' stopped.");

      this.close(false);
    }

    if (!this.enemyExpansions) {
      const depots = [...Depot.list()].sort((a, b) => (b.d - a.d));

      this.enemyExpansions = (depots.length >= 2) ? depots.slice(1, 2) : [];
    }

    if (this.enemyExpansions.length) {
      const enemyExpansionPos = getClosest(this.assignee.body, this.enemyExpansions);

      if (isInSightRange(this.assignee.body, enemyExpansionPos)) {
        if (doesEnemyExpansionExist(this.assignee.body)) {
          this.enemyExpansions.length = 0;
        } else {
          this.enemyExpansions.splice(this.enemyExpansions.indexOf(enemyExpansionPos), 1);
          this.pendingPylonPos = enemyExpansionPos;
        }
      } else {
        orderMove(this.assignee, enemyExpansionPos);
      }
    } else if (this.isBuildingPylon) {
      if (this.pendingPylonPos) {
        if (doesPylonExist(this.pendingPylonPos)) {
          this.pendingPylonPos = null;
        } else if (Resources.minerals >= 100) {
          if (orderPylon(this.assignee, this.pendingPylonPos)) {
            Resources.minerals -= 100;
          }
        } else {
          orderMove(this.assignee, this.pendingPylonPos);
        }
      } else {
        console.log("Mission 'Delay first enemy expansion' accomplished.");

        return this.close(true);
      }
    } else if (this.assignee.armor.shield < this.assignee.armor.shieldMax) {
      // If enemy worker fights back then back off
      this.isBuildingPylon = true;

      if (this.pendingPylonPos) {
        orderMove(this.assignee, this.pendingPylonPos);
      }
    } else {
      // Currently, the agent locks on the closest enemy worker it sees first and attacks it.
      // TODO: Check if enemy worker fights back:
      //         - If we lose shield too quickly, back off but keep watching for workers going for an expansion.
      //         - Otherwise, kill enemy unit and then restore shield.
      // TODO: During weapon cooldown, position agent closer to path to expansion. Use "facing" to detect pos of last turn before seeing first enemy worker. Step back towards it.
      // TODO: (only if not expansion exists) If enemy worker goes towards the expansion, reserve minerals for a pylon and create the pylon at first position to block expansion.
      //       The assumption is that the agent reaches the 5x5 plot before the enemy worker reaches the center.

      if (!this.enemyWorker || !this.enemyWorker.isAlive) {
        this.enemyWorker = findClosestEnemyWorker(this.assignee.body);
      }

      if (this.enemyWorker) {
        orderAttack(this.assignee, this.enemyWorker);
      } else {
        orderMove(this.assignee, Enemy.base);
      }
    }

  }

}

function findClosestEnemyWorker(pos) {
  let closestSquareDistance = Infinity;
  let closestEnemyWorker = null;

  for (const enemy of Units.enemies().values()) {
    if (!enemy.type.isWorker) continue;
    if (!isCloseTo(enemy.body, pos)) continue;

    const sd = squareDistance(enemy.body, pos);

    if (sd < closestSquareDistance) {
      closestSquareDistance = sd;
      closestEnemyWorker = enemy;
    }
  }

  return closestEnemyWorker;
}

function doesEnemyExpansionExist(pos) {
  for (const enemy of Units.enemies().values()) {
    if (enemy.type.isBuilding && isInSightRange(enemy.body, pos)) {
      return enemy;
    }
  }
}

function doesPylonExist(pos) {
  for (const unit of Units.buildings().values()) {
    if (unit.type.isPylon && isSamePosition(unit.body, pos)) {
      return unit;
    }
  }
}

function orderAttack(agent, enemy) {
  if (!agent || !enemy) return;

  if ((agent.order.abilityId !== 23) || (agent.order.targetUnitTag !== enemy.tag)) {
    new Order(agent, 3674, enemy);
  }
}

function orderMove(agent, pos) {
  if (!agent || !agent.order || !agent.body || !pos) return;

  if (!agent.order.abilityId && isCloseTo(agent.body, pos)) return;

  if ((agent.order.abilityId !== 16) || !agent.order.targetWorldSpacePos || !isSamePosition(agent.order.targetWorldSpacePos, pos)) {
    new Order(agent, 16, pos);
  }
}

function orderPylon(agent, pos) {
  if (!agent || !pos) return;

  if ((agent.order.abilityId !== 881) || !agent.order.targetWorldSpacePos || !isSamePosition(agent.order.targetWorldSpacePos, pos)) {
    return new Order(agent, 881, pos);
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
