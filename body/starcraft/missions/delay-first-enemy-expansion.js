import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Units from "../units.js";
import Board from "../map/board.js";
import Depot from "../map/depot.js";
import { VisibleCount } from "../memo/encounters.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

export default class DelayFirstEnemyExpansionMission extends Mission {

  job = null;

  run() {
    if (this.job || !Depot.home || !Enemy.base) return;

    const agent = selectAgent();
    const homePylonJob = [...Job.list()].find(job => job.output && job.output.isPylon);
    const enemyExpansionZone = getEnemyExpansionZone();

    if (agent && homePylonJob && homePylonJob.target && !homePylonJob.assignee && enemyExpansionZone) {
      console.log("Mission 'Delay first enemy expansion' starts");

      this.job = new AnnoyEnemy(homePylonJob, enemyExpansionZone);
      this.job.assign(agent);
    } else {
      console.log("Mission 'Delay first enemy expansion' will not start");
      this.job = "skip";
    }
  }

}

const MODE_KILL = 1;
const MODE_DAMAGE = 2;

class AnnoyEnemy extends Job {

  homePylonJob = null;
  enemyExpansionZone = null;
  enemyHarvestLine = null;
  mode = null;
  pylon = null;

  constructor(homePylonJob, enemyExpansionZone) {
    super("Probe");

    this.homePylonJob = homePylonJob;
    this.enemyExpansionZone = enemyExpansionZone;
    this.enemyHarvestLine = new HarvestLine(enemyExpansionZone);
    this.priority = 100;

    this.transition(this.goBuildHomePylon);
  }

  execute() {
    if (!this.assignee.isAlive) {
      console.log("Agent died. Mission 'Delay first enemy expansion' is over.");

      this.close(false);
    } else if (this.shouldGoHome()) {
      this.goHome();
    } else {
      this.act();
    }
  }

  transition(action) {
    this.act = action.bind(this);
  }

  shouldGoHome() {
    const agent = this.assignee;

    if ((this.mode === MODE_KILL) && agent && agent.zone) {
      for (const enemy of agent.zone.enemies) {
        if (enemy.type.isWarrior && !enemy.type.isWorker && isInRange(agent.body, enemy.body, enemy.type.rangeGround)) return true;
      }

      return false;
    } else {
      return (VisibleCount.Warrior > 0);
    }
  }

  goHome() {
    console.log("Mission 'Delay first enemy expansion' is over.");

    orderSlip(this.assignee);

    this.close(true);
  }

  goBuildHomePylon() {
    if (Resources.minerals >= 100) {
      this.homePylonJob.assignee = this.assignee;
      this.transition(this.goWaitForHomePylon);
    } else {
      orderMove(this.assignee, this.homePylonJob.target);
    }

    // Reserve minerals for the pylon
    Resources.minerals -= 100;
  }

  goWaitForHomePylon() {
    if (this.homePylonJob.isDone) {
      this.transition(this.goScoutExpansion);
    } else if (this.homePylonJob.isFailed) {
      this.transition(this.goHome);
    } else {
      // Keep a reserve of minerals for the pylon
      Resources.minerals -= 100;
    }
  }

  goScoutExpansion() {
    if (isInSightRange(this.assignee.body, this.enemyExpansionZone)) {
      this.transition(this.goApproachEnemyBase);
    } else {
      orderMove(this.assignee, this.enemyExpansionZone);
    }
  }

  goApproachEnemyBase() {
    if (findEnemyWorkerClosestToEnemyExpansion(this.enemyExpansionZone)) {
      this.transition(this.goAttackEnemyWorker);
    } else {
      orderMove(this.assignee, Enemy.base.harvestRally);
    }
  }

  goAttackEnemyWorker() {
    if (isAttacked(this.assignee)) {
      // Enemy worker fights back
      this.mode = MODE_DAMAGE;
      return this.transition(this.goGuardExpansion);
    }

    if (this.mode === MODE_KILL) {
      // Kill as many enemy workers as possible
      if (!this.target || !this.target.isAlive) {
        this.target = findEnemyWorkerToKill(this.assignee);
      }

      if (this.target) {
        return orderAttack(this.assignee, this.target);
      }
    } else {
      // Make sure the agent is always between the enemy workers and the expansion. Poke enemy workers to provoke them and if possible damage them
      const target = findEnemyWorkerClosestToEnemyExpansion(this.enemyExpansionZone);

      if (target) {
        if ((this.enemyHarvestLine.distance(target.body) > 0.5) && !isEnemyWorkerBuildingStructures(target)) {
          // The enemy worker is outside the harvest zone, presumably going to build an expansion
          return this.transition(this.goGuardExpansion);
        } else if (!this.mode && isDamaged(target)) {
          this.mode = MODE_KILL;
        }

        return orderAttack(this.assignee, target);
      }
    }

    orderMove(this.assignee, Enemy.base.harvestRally);
  }

  goGuardExpansion() {
    if (isEnemyExpansionStarted(this.enemyExpansionZone)) return this.transition(this.goHome);

    if (areEnemyWorkersInZone(this.enemyExpansionZone)) {
      // An enemy worker entered the expansion zone and is probably building an expansion
      this.transition(this.goBlockExpansion);
    } else if (this.assignee.zone === Enemy.base) {
      // The agent is still in the enemy base, so mineral walk to the expansion to avoid being blocked by enemy units
      orderSlip(this.assignee);
    } else if (isSlipping(this.assignee) || isEnemyWorkerClose(this.assignee)) {
      // An enemy worker is following the agent, so move to the expansion
      orderMove(this.assignee, this.enemyExpansionZone);
    } else if (!isAttacked(this.assignee)) {
      // The agent is now healthy and no enemy worker tries to expand, so attack again
      this.transition(this.goAttackEnemyWorker);
    } else if (this.assignee.zone === this.enemyExpansionZone) {
      // The agent just entered the expansion zone, so stop to keep close to it
      orderStop(this.assignee);
    }
  }

  goBlockExpansion() {
    if (isEnemyExpansionStarted(this.enemyExpansionZone)) return this.transition(this.goHome);

    if (isWithinBlock(this.assignee.body, this.enemyExpansionZone, 6) && !areEnemyWorkersInZone(this.enemyExpansionZone)) {
      return this.transition(this.goGuardExpansion);
    } else if (isInjured(this.assignee)) {
      // Block the expansion with a pylon
      if (this.enemyExpansionZone.buildings.size) {
        // The agent already built a pylon
        return this.transition(this.goCancelPylon);
      } else if (isAlmostDead(this.assignee)) {
        return this.transition(this.goHome);
      } else if (Resources.minerals >= 100) {
        const plot = findPylonPlot(this.enemyExpansionZone);

        if (!plot) {
          return this.transition(this.goHome);
        } else if (orderPylon(this.assignee, plot)) {
          Resources.minerals -= 100;

          return this.transition(this.goCancelPylon);
        }
      }
    }

    const bx = this.enemyExpansionZone.x;
    const by = this.enemyExpansionZone.y;
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

  goCancelPylon() {
    if (!this.pylon && this.enemyExpansionZone.buildings.size) {
      for (const one of this.enemyExpansionZone.buildings) {
        this.pylon = one;
        break;
      }
    }

    if (this.pylon) {
      this.pylon.isDecoy = true;

      if (this.assignee.zone === this.enemyExpansionZone) {
        orderSlip(this.assignee);
      }

      if ((this.pylon.buildProgress >= 0.99) || (this.pylon.armor.health < 20)) {
        new Order(this.pylon, 3659).accept(true);

        this.transition(this.goHome);
      }
    }
  }

}

class HarvestLine {

  constructor(expansionZone) {
    const minerals = findClosestUnitToPos([...Enemy.base.minerals, ...Enemy.base.vespene], expansionZone);

    this.ax = Enemy.base.x;
    this.ay = Enemy.base.y;
    this.bx = minerals.body.x - this.ax;
    this.by = minerals.body.y - this.ay;
    this.ab = Math.sqrt(this.bx * this.bx + this.by * this.by);
    this.dc = 1;

    this.dc = Math.sign(this.distance(expansionZone));
  }

  distance(pos) {
    const cx = (pos.x - this.ax);
    const cy = (pos.y - this.ay);

    return (cy * this.bx - cx * this.by) * this.dc / this.ab;
  }

}

function selectAgent() {
  const selectUp = (Depot.home.exitRally.y > Depot.home.y);
  let agent;

  for (const worker of Depot.home.workers) {
    if (!agent) {
      agent = worker;
    } else if (selectUp && (worker.body.y > agent.body.y)) {
      agent = worker;
    } else if (!selectUp && (worker.body.y < agent.body.y)) {
      agent = worker;
    }
  }

  return agent;
}

function isInRange(a, b, range) {
  const squareDistance = (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  const squareRange = range * range;
  return (squareDistance <= squareRange);
}

function findClosestUnitToPos(units, pos) {
  let closestSquareDistance = Infinity;
  let closestUnit = null;

  for (const unit of units) {
    const sd = squareDistance(unit.body, pos);

    if (sd < closestSquareDistance) {
      closestSquareDistance = sd;
      closestUnit = unit;
    }
  }

  return closestUnit;
}

function getEnemyExpansionZone() {
  const traversed = new Set();
  let wave = new Set();
  let expansion = null;

  wave.add(Enemy.base);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      traversed.add(zone);

      for (const neighbor of zone.neighbors) {
        if (traversed.has(neighbor)) continue;

        if (neighbor.isDepot) {
          if (!expansion || (expansion === neighbor)) {
            expansion = neighbor;
          } else {
            // At least two depots are found at this distance. There's no single expansion
            return;
          }
        }

        next.add(neighbor);
      }
    }

    if (expansion) {
      return expansion;
    }

    wave = next;
  }
}

function areEnemyWorkersInZone(zone) {
  for (const enemy of zone.enemies) {
    if (enemy.type.isWorker) {
      return true;
    }
  }
}

function isEnemyExpansionStarted(expansion) {
  if (expansion.isEnemyExpansionStarted) return true;

  for (const enemy of expansion.enemies) {
    if (enemy.type.isBuilding && isSamePosition(enemy.body, expansion)) {
      expansion.isEnemyExpansionStarted = true;
      return true;
    }
  }
}

function isEnemyWorkerBuildingStructures(worker) {
  if (worker.type.name !== "SCV") return false;

  for (const unit of Units.enemies().values()) {
    if ((unit.buildProgress < 1) && isWithinBlock(unit.body, worker.body, unit.body.r)) return true;
  }
}

function isEnemyWorkerClose(agent) {
  for (const enemy of Enemy.base.enemies) {
    if (enemy.type.isWorker && isInRange(enemy.body, agent.body, 3)) return true;
  }
}

function findEnemyWorkerClosestToEnemyExpansion(expansion) {
  let closestDistance = -Infinity;
  let closestEnemyWorker = null;

  for (const unit of Units.enemies().values()) {
    // Ignore units that are not workers
    if (!unit.type.isWorker) continue;

    // Ignore units that scout us
    if (unit.zone.tier.level < expansion.tier.level) continue;

    const distance = squareDistance(unit.body, expansion);

    if (distance > closestDistance) {
      closestDistance = distance;
      closestEnemyWorker = unit;
    }
  }

  return closestEnemyWorker;
}

function findEnemyWorkerToKill(agent) {
  let bestDistance = Infinity;
  let bestTarget = null;

  for (const enemyWorker of Enemy.base.enemies) {
    if (!enemyWorker.isCarryingMinerals) continue;

    const distance = squareDistance(agent.body, enemyWorker.body);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = enemyWorker;
    }
  }

  return bestTarget;
}

function findPylonPlot(base) {
  for (let x = base.x - 2.5; x < base.x + 2.5; x++) {
    for (let y = base.y - 2.5; y < base.y + 2.5; y++) {
      if (Board.accepts(x, y, 2)) {
        return { x, y };
      }
    }
  }
}

function isAttacked(agent) {
  return (agent.armor.shield < agent.armor.shieldMax);
}

function isInjured(agent) {
  return (agent.armor.health < agent.armor.healthMax);
}

function isAlmostDead(agent) {
  return (agent.armor.shield + agent.armor.health <= 5);
}

function isDamaged(unit) {
  return (unit.armor.shield + unit.armor.health < unit.armor.shieldMax + unit.armor.healthMax);
}

function isSlipping(agent) {
  return (agent.order.abilityId === 298);
}

function orderAttack(agent, enemy) {
  if (!agent || !enemy) return;

  if ((agent.order.abilityId !== 23) || (agent.order.targetUnitTag !== enemy.tag)) {
    new Order(agent, 23, enemy);
  }
}

function orderMove(agent, pos) {
  if (!agent || !agent.order || !agent.body || !pos) return;
  if (isSamePosition(agent.body, pos)) return;

  if ((agent.order.abilityId !== 16) || !agent.order.targetWorldSpacePos || !isSamePosition(agent.order.targetWorldSpacePos, pos)) {
    new Order(agent, 16, pos);
  }
}

function orderStop(agent) {
  if (!agent || !agent.order) return;

  if (agent.order.abilityId) {
    new Order(agent, 3665).accept(true);
  }
}

function orderSlip(agent) {
  if (!agent || !agent.order || !agent.body) return;

  if (agent.order.abilityId !== 298) {
    new Order(agent, 298, [...Depot.home.minerals][0]).accept(true);
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

function isWithinBlock(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
