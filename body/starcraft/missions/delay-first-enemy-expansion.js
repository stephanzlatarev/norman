import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Depot from "../map/depot.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

export default class DelayFirstEnemyExpansionMission extends Mission {

  job = null;

  run() {
    if (this.job) return;

    if (this.pylonJob) {
      // Waiting for the pylon job to be assigned
      if (this.pylonJob.assignee) {
        this.pylonBuilder = this.pylonJob.assignee;
      }

      // Waiting for the pylon job to finish
      if (this.pylonJob.isDone) {
        this.job = new AnnoyEnemy();
        this.job.assign(this.pylonBuilder);
      } else if (this.pylonJob.isFailed) {
        this.job = true;
      }
    } else {
      // Waiting for the pylon job to appear
      this.pylonJob = Array.from(Job.list()).find(job => job.output && job.output.isPylon);
    }
  }

}

class AnnoyEnemy extends Job {

  basePos = null;
  baseDirection = null;
  baseEntranceLocked = false;
  baseEntrancePos = null;
  expansionPos = null;

  constructor() {
    super("Worker");

    this.priority = 100;
    this.transition(this.goScoutExpansion);
  }

  execute() {
    if (!this.assignee.isAlive) {
      console.log("Agent died. Mission 'Delay first enemy expansion' stopped.");

      this.close(false);
    } else {
      this.act();
    }
  }

  transition(action) {
    this.act = action.bind(this);
  }

  goHome() {
    console.log("Mission 'Delay first enemy expansion' accomplished.");

    this.close(true);
  }

  goScoutExpansion() {
    if (!this.basePos) {
      const depots = [...Depot.list()].sort((a, b) => (b.d - a.d));

      if (depots.length >= 2) {
        this.basePos = depots[0];
        this.expansionPos = depots[1];
      } else if (depots.length === 1) {
        this.basePos = depots[0];
      } else {
        this.transition(this.goHome);
      }
    }

    if (this.expansionPos) {
      if (isInSightRange(this.assignee.body, this.expansionPos)) {

        if (doesEnemyExpansionExist(this.assignee.body)) {
          // Enemy already built the expansion. We cannot block it
          this.expansionPos = null;
        }

        this.transition(this.goApproachEnemyBase);
      } else {
        orderMove(this.assignee, this.expansionPos);
      }
    } else {
      this.transition(this.goApproachEnemyBase);
    }
  }

  goApproachEnemyBase() {
    if (!this.baseEntranceLocked && (this.assignee.direction !== this.baseDirection)) {
      this.baseDirection = this.assignee.direction;
      this.baseEntrancePos = this.assignee.body;
    }

    const enemyWorker = findClosestEnemyWorker(this.baseEntrancePos);

    if (enemyWorker) {
      // Once we see the first enemy worker on the way to the enemy base, we'll no longer try to locate the position of the entrance to the base 
      this.baseEntranceLocked = true;

      this.transition(this.goAttackEnemyWorker);
    } else {
      orderMove(this.assignee, Enemy.base);
    }
  }

  goAttackEnemyWorker() {
    if (isAttacked(this.assignee)) {
      // Enemy worker fights back
      return this.transition(this.goApproachExpansion);
    }

    const enemyWorker = findClosestEnemyWorker(this.baseEntrancePos);

    if (enemyWorker) {
      orderAttack(this.assignee, enemyWorker);
    } else {
      orderMove(this.assignee, Enemy.base);
    }
  }

  goApproachExpansion() {
    if (!this.expansionPos) return this.transition(this.goHome);

    const enemyWorker = findClosestEnemyWorker(this.assignee.body);

    if (enemyWorker) {
      const squareDistanceToEnemyWorker = squareDistance(this.assignee.body, enemyWorker.body);
      const squareDistanceToExpansion = squareDistance(enemyWorker.body, this.expansionPos);

      if (squareDistanceToExpansion < 25) {
        // Enemy worker is too close to expansion plot. Try to block it
        return this.transition(this.goBlockExpansion);
      }

      if (squareDistanceToEnemyWorker > 25) {
        // Enemy worker is too far away. Maybe it backed off. Go back to enemy base
        if (!isAttacked(this.assignee)) {
          return this.transition(this.goAttackEnemyWorker);
        }
      }
    } else {
      return this.transition(this.goApproachEnemyBase);
    }

    orderMove(this.assignee, this.expansionPos);
  }

  goBlockExpansion() {
    if (!this.expansionPos) return this.transition(this.goHome);

    if (isInjured(this.assignee)) {
      return this.transition(this.goBuildPylon);
    }

    const enemyWorker = findClosestEnemyWorker(this.baseEntrancePos);

    if (enemyWorker) {
      const squareDistanceToExpansion = squareDistance(enemyWorker.body, this.expansionPos);

      if ((squareDistanceToExpansion < 9) && (squareDistance(enemyWorker.body, this.expansionPos) > 9)) {
        // Agent is falling behind. Try to build pylon
        return this.transition(this.goBuildPylon);
      } else if (squareDistanceToExpansion > 25) {
        return this.transition(this.goApproachExpansion);
      }
    } else {
      return this.transition(this.goApproachEnemyBase);
    }

    const bx = this.expansionPos.x;
    const by = this.expansionPos.y;
    const ax = this.assignee.body.x;
    const ay = this.assignee.body.y;

    if (ax >= bx) {
      if (ay >= by) {
        // Agent is top-right relative to the base
        if (ay >= by + 1) {
          orderMove(this.assignee, { x: bx - 1.5, y: by + 1.5 });
        } else if ((ax >= bx + 1) && (ay <= by + 0.5)) {
          orderMove(this.assignee, { x: bx + 1.5, y: by + 1.5 });
        } else {
          orderMove(this.assignee, { x: bx, y: by + 1.5 });
        }
      } else {
        // Agent is bottom-right relative to the base
        if (ax >= bx + 1) {
          orderMove(this.assignee, { x: bx + 1.5, y: by + 1.5 });
        } else if ((ay <= by - 1) && (ax <= bx + 0.5)) {
          orderMove(this.assignee, { x: bx + 1.5, y: by - 1.5 });
        } else {
          orderMove(this.assignee, { x: bx + 1.5, y: by });
        }
      }
    } else {
      if (ay >= by) {
        // Agent is top-left relative to the base
        if (ax <= bx - 1) {
          orderMove(this.assignee, { x: bx - 1.5, y: by - 1.5 });
        } else if ((ay >= by + 1) && (ax >= bx - 0.5)) {
          orderMove(this.assignee, { x: bx - 1.5, y: by + 1.5 });
        } else {
          orderMove(this.assignee, { x: bx - 1.5, y: by });
        }
      } else {
        // Agent is bottom-left relative to the base
        if (ay <= by - 1) {
          orderMove(this.assignee, { x: bx + 1.5, y: by - 1.5 });
        } else if ((ax <= bx - 1) && (ay >= by - 0.5)) {
          orderMove(this.assignee, { x: bx - 1.5, y: by - 1.5 });
        } else {
          orderMove(this.assignee, { x: bx, y: by - 1.5 });
        }
      }
    }
  }

  // Build at edge of base plot if my worker is behind the enemy worker heading for expansion
  goBuildPylon() {
    if (!this.expansionPos) return this.transition(this.goHome);

    if (doesPylonExist(this.expansionPos)) {
      this.expansionPos = null;

      this.transition(this.goHome);
    } else if (Resources.minerals >= 100) {
      if (orderPylon(this.assignee, this.expansionPos)) {
        Resources.minerals -= 100;
      }
    } else {
      orderMove(this.assignee, this.expansionPos);
    }
  }

}

function isAttacked(agent) {
  return (agent.armor.shield < agent.armor.shieldMax);
}

function isInjured(agent) {
  return (agent.armor.health < agent.armor.healthMax);
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
    new Order(agent, 23, enemy);
  }
}

function orderMove(agent, pos) {
  if (!agent || !agent.order || !agent.body || !pos) return;

  if ((agent.order.abilityId !== 16) || !agent.order.targetWorldSpacePos || !isSamePosition(agent.order.targetWorldSpacePos, pos)) {
    new Order(agent, 16, pos);
  }
}

function orderPylon(agent, pos) {
  if (!agent || !pos) return;

  if ((agent.order.abilityId !== 881) || !agent.order.targetWorldSpacePos || !isSamePosition(agent.order.targetWorldSpacePos, pos)) {
    return new Order(agent, 881, pos).expect(Types.unit("Pylon"));
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isInSightRange(a, b) {
  return squareDistance(a, b) < 64;
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 10) && (Math.abs(a.y - b.y) <= 10);
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
