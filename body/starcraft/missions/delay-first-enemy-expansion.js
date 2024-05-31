import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Types from "../types.js";
import Depot from "../map/depot.js";
import Map from "../map/map.js";
import { VisibleCount } from "../memo/encounters.js";
import Enemy from "../memo/enemy.js";
import Resources from "../memo/resources.js";

export default class DelayFirstEnemyExpansionMission extends Mission {

  job = null;

  run() {
    if (this.job || !Enemy.base) return;

    const home = Depot.list().find(depot => depot.isActive);
    const homePylonJob = [...Job.list()].find(job => job.output && job.output.isPylon);
    const { expansion, corridor } = findEnemyExpansion();

    if (home && homePylonJob && homePylonJob.target && !homePylonJob.assignee && expansion && corridor) {
      this.job = new AnnoyEnemy(home, homePylonJob, expansion, corridor);

      console.log("Mission 'Delay first enemy expansion' is started.");
    } else {
      this.job = "skip";
    }
  }

}

const MODE_KILL = 1;
const MODE_DAMAGE = 2;

class AnnoyEnemy extends Job {

  home = null;
  homePylonJob = null;
  expansion = null;
  corridor = null;
  mode = null;
  pylon = null;

  constructor(home, homePylonJob, expansion, corridor) {
    super("Worker");

    this.home = home;
    this.homePylonJob = homePylonJob;
    this.expansion = expansion;
    this.corridor = corridor;
    this.priority = 100;

    this.harvest = new HarvestLine(corridor);

    this.transition(this.goBuildHomePylon);
  }

  execute() {
    if (!this.assignee.isAlive) {
      console.log("Agent died. Mission 'Delay first enemy expansion' is over.");

      this.close(false);
    } else if (VisibleCount.Warrior) {
      this.goHome();
    } else {
      this.act();
    }
  }

  transition(action) {
    this.act = action.bind(this);
  }

  goHome() {
    console.log("Mission 'Delay first enemy expansion' is over.");

    orderSlip(this.assignee, this.home);

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
    if (isInSightRange(this.assignee.body, this.expansion)) {
      this.transition(this.goApproachEnemyBase);
    } else {
      orderMove(this.assignee, this.expansion);
    }
  }

  goApproachEnemyBase() {
    if (findEnemyWorkerClosestToCorridor(this.harvest, this.expansion, this.corridor)) {
      this.transition(this.goAttackEnemyWorker);
    } else {
      orderMove(this.assignee, Enemy.base.harvestRally);
    }
  }

  goAttackEnemyWorker() {
    if (isAttacked(this.assignee)) {
      // Enemy worker fights back
      this.mode = MODE_DAMAGE;
      return this.transition(this.goGuardCorridor);
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
      const target = findEnemyWorkerClosestToCorridor(this.harvest, this.expansion, this.corridor);

      if (target) {
        if (this.harvest.distance(target.body) > 0.5) {
          // The enemy worker is outside the harvest zone, presumably going to build an expansion
          return this.transition(this.goGuardCorridor);
        } else if (!this.mode && isDamaged(target)) {
          this.mode = MODE_KILL;
        }

        return orderAttack(this.assignee, target);
      }
    }

    orderMove(this.assignee, Enemy.base.harvestRally);
  }

  goGuardCorridor() {
    if (this.corridor.enemies.size || this.expansion.enemies.size) {
      // An enemy worker entered the corridor and is probably building an expansion
      this.transition(this.goBlockExpansion);
    } else if (this.assignee.zone === Enemy.base) {
      // The agent is still in the enemy base, so mineral walk to the expansion to avoid being blocked by enemy units
      orderSlip(this.assignee, this.expansion);
    } else if (this.assignee.zone === this.corridor) {
      // The agent is in the corridor, so move to the expansion
      orderMove(this.assignee, this.expansion);
    } else if (!isAttacked(this.assignee)) {
      // The agent is now healthy and no enemy worker tries to expand, so attack again
      this.transition(this.goAttackEnemyWorker);
    } else if (this.assignee.zone === this.expansion) {
      // The agent just entered the expansion zone, so stop to keep close to the corridor
      orderStop(this.assignee);
    }
  }

  goBlockExpansion() {
    if (isEnemyExpansionStarted(this.expansion)) return this.transition(this.goHome);

    if (isWithinBlock(this.assignee.body, this.expansion, 6) && !this.expansion.enemies.size) {
      return this.transition(this.goGuardCorridor);
    } else if (isInjured(this.assignee)) {
      // Block the expansion with a pylon
      if (this.expansion.buildings.size) {
        // The agent already built a pylon
        return this.transition(this.goCancelPylon);
      } else if (isAlmostDead(this.assignee)) {
        return this.transition(this.goHome);
      } else if (Resources.minerals >= 100) {
        const plot = findPylonPlot(this.expansion);

        if (!plot) {
          return this.transition(this.goHome);
        } else if (orderPylon(this.assignee, plot)) {
          Resources.minerals -= 100;

          return this.transition(this.goCancelPylon);
        }
      }
    }

    const bx = this.expansion.x;
    const by = this.expansion.y;
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
    if (!this.pylon) {
      this.pylon = [...this.expansion.buildings].find(_ => true);
    }

    if (this.pylon) {
      if (this.assignee.zone === this.expansion) {
        orderSlip(this.assignee, this.home);
      }

      if ((this.pylon.buildProgress >= 0.99) || (this.pylon.armor.health < 20)) {
        new Order(this.pylon, 3659).accept(true);

        this.transition(this.goHome);
      }
    }
  }

}

class HarvestLine {

  constructor(corridor) {
    const minerals = findClosestUnitToPos([...Enemy.base.minerals, ...Enemy.base.vespene], corridor);

    this.ax = Enemy.base.x;
    this.ay = Enemy.base.y;
    this.bx = minerals.body.x - this.ax;
    this.by = minerals.body.y - this.ay;
    this.ab = Math.sqrt(this.bx * this.bx + this.by * this.by);
    this.dc = 1;

    this.dc = Math.sign(this.distance(corridor));
  }

  distance(pos) {
    const cx = (pos.x - this.ax);
    const cy = (pos.y - this.ay);

    return (cy * this.bx - cx * this.by) * this.dc / this.ab;
  }

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

function findEnemyExpansion() {
  const passed = new Set();
  let hops = new Set();

  hops.add(Enemy.base);

  while (hops.size) {
    const nextHops = new Set();
    let expansion;
    let corridor;

    for (const hop of hops) {
      if (passed.has(hop)) continue;

      passed.add(hop);

      for (const path of hop.corridors) {
        for (const zone of path.zones) {
          if (passed.has(zone)) continue;
          if (zone === Enemy.base) continue;

          if (zone.isDepot) {
            if (!expansion || (expansion === zone)) {
              expansion = zone;
              corridor = path;
            } else {
              // At least two depots are found at this distance. There's no single expansion
              return;
            }
          }

          nextHops.add(zone);
        }
      }
    }

    if (expansion) {
      return { expansion: expansion, corridor: corridor };
    }

    hops = nextHops;
  }

  return { expansion: null, corridor: null };
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

function findEnemyWorkerClosestToCorridor(harvest, expansion, corridor) {
  let enemies;

  if (expansion.enemies.size) {
    enemies = expansion.enemies;
  } else if (corridor.enemies.size) {
    enemies = corridor.enemies;
  } else if (Enemy.base.enemies.size) {
    enemies = Enemy.base.enemies;
  } else {
    return;
  }

  const enemyWorkers = [...enemies].filter(enemy => !!enemy.type.isWorker);

  let closestDistance = -Infinity;
  let closestEnemyWorker = null;

  for (const enemyWorker of enemyWorkers) {
    const distance = harvest.distance(enemyWorker.body);

    if (distance > closestDistance) {
      closestDistance = distance;
      closestEnemyWorker = enemyWorker;
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
      if (Map.accepts(base, x, y, 2)) {
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

function orderSlip(agent, depot) {
  if (!agent || !agent.order || !agent.body || !depot) return;

  if (agent.order.abilityId !== 298) {
    new Order(agent, 298, depot.minerals[0]).accept(true);
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
