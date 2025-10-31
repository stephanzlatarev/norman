import { Memory, Job, Order, Types, Units, Board, Depot, ActiveCount, Enemy, Resources, TotalCount, VisibleCount } from "./imports.js";

const RACE_PROTOSS = 3;

let agent = null;
let job = null;

export default function() {
  if (job) return;                        // Early scout mission is already running
  if (!Depot.home || !Enemy.base) return; // No target for early scouting
  if (ActiveCount.Pylon) return;          // Early scout moment has already passed

  if (!agent) agent = selectAgent();
  if (!agent) return;

  const homeWallSite = Depot.home.sites.find(site => site.isWall);
  const enemyExpansionZone = getEnemyExpansionZone();

  if (homeWallSite && enemyExpansionZone) {
    job = new EarlyScout(homeWallSite, enemyExpansionZone);
  } else {
    console.log("No early scout.");
    job = "skip";
  }
}

const MODE_KILL = 1;
const MODE_DAMAGE = 2;

class EarlyScout extends Job {

  hasDetectedEnemyExpansion = false;
  hasDetectedEnemyWarriors = false;
  hasDetectedEnemyWallOff = false;

  homeWallSite = null;
  enemyBaseRamp = null;
  enemyExpansionZone = null;
  enemyHarvestLine = null;
  pylon = null;

  constructor(homeWallSite, enemyExpansionZone) {
    super("Probe");

    this.homeWallSite = homeWallSite;
    this.enemyBaseRamp = getEnemyBaseRamp();
    this.enemyExpansionZone = enemyExpansionZone;
    this.enemyHarvestLine = new HarvestLine(enemyExpansionZone);
    this.priority = 100;

    this.transition(this.goScoutExpansion);

    Memory.FlagJobEarlyScout = true;
  }
  
  close(outcome) {
    super.close(outcome);

    Memory.FlagJobEarlyScout = false;
    Memory.EarlyScoutMode = false;
  }

  accepts(unit) {
    return (unit === agent) && findPylon();
  }

  execute() {
    const agent = this.assignee;

    if (!agent.isAlive) {
      console.log("Early scout died.");

      return this.close(false);
    }

    if ((Memory.LevelEnemyRush >= 3) && (Memory.EarlyScoutMode !== MODE_KILL)) {
      if (agent.zone === Depot.home) {
        console.log("Early scout retires due to extreme enemy rush.");

        return this.close(true);
      } else {
        return orderSlip(agent);
      }
    }

    if (!this.hasDetectedEnemyExpansion && isEnemyExpansionStarted(this.enemyExpansionZone)) {
      console.log("Early scout detected enemy expansion.");
      this.hasDetectedEnemyExpansion = true;
    }

    if (!this.hasDetectedEnemyWallOff && !this.hasDetectedEnemyWarriors && this.isInEnemyWarriorsRange()) {
      console.log("Early scout transitions to monitoring enemy expansions.");
      this.hasDetectedEnemyWarriors = true;

      this.transition(this.goMonitorEnemyExpansions);
    }

    if (!this.hasDetectedEnemyWallOff && isEnemyBaseWalledOff(agent, this.enemyBaseRamp)) {
      console.log("Early scout detected enemy wall off.");
      this.hasDetectedEnemyWallOff = true;
    }

    this.act();
  }

  transition(action) {
    console.log("Early scout transitions to", action.name);

    this.act = action.bind(this);
  }

  isInEnemyWarriorsRange() {
    const agent = this.assignee;

    if (agent && agent.zone) {
      for (const zone of agent.zone.range.zones) {
        for (const enemy of zone.threats) {
          if (enemy.type.isWorker) continue;
          if (!enemy.type.isWarrior) continue;
          if (!enemy.type.rangeGround) continue;

          if (isInRange(agent.body, enemy.body, enemy.type.rangeGround + 7)) return true;
        }
      }
    }
  }

  goScoutExpansion() {
    if (isWithinBlock(this.assignee.body, this.enemyExpansionZone, 2.5)) {
      this.transition(this.goApproachEnemyBase);
    } else {
      orderMove(this.assignee, this.enemyExpansionZone);
    }
  }

  goApproachEnemyBase() {
    const enemy = findEnemyWorkerClosestToEnemyExpansion(this.enemyExpansionZone);

    if (!enemy) {
      // Go closer to the enemy base to find enemy workers
      orderMove(this.assignee, Enemy.base.harvestRally);
    } else if (enemy.type.race === RACE_PROTOSS) {
      // Enemy is Protoss, so we're more concerned about proxy rushes than expansions
      this.transition(this.goSearchForEnemyGateway);
    } else {
      this.transition(this.goAttackEnemyWorker);
    }
  }

  goSearchForEnemyGateway() {
    if (VisibleCount.Gateway) {
      // The enemy Gateway has been found. Stop searching for it and continue with the scouting agenda
      this.transition(this.goAttackEnemyWorker);
    } else if (TotalCount.CyberneticsCore) {
      // The gateway should be there by this time. Stop searching for it and assume proxies
      this.transition(this.goAttackEnemyWorker);
    } else {
      // Circle around the base (without transitioning to that stage) while looking for the Gateway
      this.goCircleEnemyBase();
    }
  }

  goAttackEnemyWorker() {
    if (isAttacked(this.assignee)) {
      if (this.hasDetectedEnemyExpansion) {
        return this.transition(this.goMonitorEnemyExpansions);
      } else {
        // Enemy worker fights back
        Memory.EarlyScoutMode = MODE_DAMAGE;
        this.target = null;

        return this.transition(this.goGuardExpansion);
      }
    }

    if (Memory.EarlyScoutMode === MODE_KILL) {
      // Kill as many enemy workers as possible
      if (!this.target || !this.target.isAlive) {
        this.target = findEnemyWorkerToKill(this.assignee);
      }

      if (this.target) {
        return orderAttack(this.assignee, this.target);
      }
    } else if (this.target && this.target.isAlive && isDamaged(this.target)) {
      Memory.EarlyScoutMode = MODE_KILL;

      return orderAttack(this.assignee, this.target);
    } else {
      // Make sure the agent is always between the enemy workers and the expansion. Poke enemy workers to provoke them and if possible damage them
      const target = findEnemyWorkerClosestToEnemyExpansion(this.enemyExpansionZone);

      if (target) {
        if (!this.hasDetectedEnemyExpansion && (this.enemyHarvestLine.distance(target.body) > 0.5) && !isEnemyWorkerBuildingStructures(target)) {
          // The enemy worker is outside the harvest zone, presumably going to build an expansion
          return this.transition(this.goGuardExpansion);
        } else if (!Memory.EarlyScoutMode && isDamaged(target)) {
          Memory.EarlyScoutMode = MODE_KILL;
        }

        this.target = target;

        return orderAttack(this.assignee, target);
      }
    }

    orderMove(this.assignee, Enemy.base.harvestRally);
  }

  goGuardExpansion() {
    if (this.hasDetectedEnemyExpansion) {
      // The enemy expansion is already started, so switch to next phase of scouting
      this.transition(this.goMonitorEnemyExpansions);
    } else if (areEnemyWorkersInZone(this.enemyExpansionZone)) {
      // An enemy worker entered the expansion zone and is probably building an expansion
      this.transition(this.goBlockExpansion);
    } else if (this.assignee.zone !== this.enemyExpansionZone) {
      // The agent is still away from the enemy expansion zone, so mineral walk to the expansion to avoid being blocked by enemy units
      if (isAtOrBehindEnemyBaseRamp(this.assignee, this.enemyBaseRamp)) {
        if (this.hasDetectedEnemyWallOff || !this.enemyBaseRamp.size) {
          return this.transition(this.goCircleEnemyBase);
        } else if (!isInVisibilityRangeOfEnemyBaseRamp(this.assignee, this.enemyBaseRamp)) {
          // Approach the ramp to get vision over it
          return orderMove(this.assignee, [...this.enemyBaseRamp][0]);
        }
      }

      orderSlip(this.assignee, this.enemyExpansionZone);
    } else if (isSlipping(this.assignee) || isEnemyWorkerClose(this.assignee)) {
      // An enemy worker is following the agent, so move to the expansion
      orderMove(this.assignee, this.enemyExpansionZone);
    } else if (!isAttacked(this.assignee)) {
      // The agent is now healthy and no enemy worker tries to expand, so attack again
      this.transition(this.goAttackEnemyWorker);
    } else {
      // The agent just entered the expansion zone, so stop to keep close to it
      orderStop(this.assignee);
    }
  }

  goCircleEnemyBase() {
    if (!this.enemyBaseCirclePath) this.enemyBaseCirclePath = findEnemyBaseCirclePath();

    const cell = findClosestCell(this.assignee.body, this.enemyBaseCirclePath);
    const index = this.enemyBaseCirclePath.indexOf(cell);
    const path = [...this.enemyBaseCirclePath.slice(index), ...this.enemyBaseCirclePath.slice(0, index)];

    for (const target of path) {
      if (!isInRange(this.assignee.body, target, 5)) {
        return orderMove(this.assignee, target);
      }
    }
  }

  goBlockExpansion() {
    if (this.hasDetectedEnemyExpansion) return this.transition(this.goMonitorEnemyExpansions);

    if (isWithinBlock(this.assignee.body, this.enemyExpansionZone, 6) && !areEnemyWorkersInZone(this.enemyExpansionZone)) {
      return this.transition(this.goGuardExpansion);
    } else if (isInjured(this.assignee)) {
      // Block the expansion with a pylon
      if (this.enemyExpansionZone.buildings.size) {
        // The agent already built a pylon
        return this.transition(this.goCancelPylon);
      } else if (isAlmostDead(this.assignee)) {
        return this.transition(this.goMonitorEnemyExpansions);
      } else if (Resources.minerals >= 100) {
        const plot = findPylonPlot(this.enemyExpansionZone);

        if (!plot) {
          return this.transition(this.goMonitorEnemyExpansions);
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

        this.transition(this.goMonitorEnemyExpansions);
      }
    }
  }

  goMonitorEnemyExpansions() {
    const agent = this.assignee;

    if (agent.zone === Depot.home) {
      console.log("Early scout retires after being pushed back to home base.");
      this.close(true);
    } else if ((agent.zone === Enemy.base) || isAttacked(agent) || this.isInEnemyWarriorsRange()) {
      // Pull back to home base
      orderSlip(agent);
    } else if (!this.hasDetectedEnemyWarriors) {
      this.transition(this.goAttackEnemyWorker);
    } else {
      // Move towards the enemy base
      orderMove(agent, Enemy.base.harvestRally);
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
  for (const job of Job.list()) {
    if (job.assignee && job.output && (job.output.name === "Pylon")) {
      return job.assignee;
    }
  }
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

  wave.add(Enemy.base.cell);

  while (wave.size) {
    const next = new Set();

    for (const cell of wave) {
      traversed.add(cell);

      for (const neighbor of cell.neighbors) {
        if (!neighbor.isPath) continue;
        if (traversed.has(neighbor)) continue;

        if ((neighbor.zone !== Enemy.base) && neighbor.zone.isDepot) return neighbor.zone;

        next.add(neighbor);
      }
    }

    wave = next;
  }
}

function findEnemyBaseCirclePath() {
  const border = new Set(Enemy.base.border);
  const path = [];

  let cell = { x: 0, y: 0 };

  while (border.size) {
    const next = findClosestCell(cell, border);
    path.push(next);

    border.delete(next);
    for (const one of border) {
      if (isInRange(next, one, 4)) {
        border.delete(one);
      }
    }

    cell = next;
  }

  return path;
}

function getEnemyBaseRamp() {
  const zones = [Enemy.base, ...Enemy.base.neighbors];
  const candidates = [];
  let anchor = 0;

  for (const zone of zones) {
    for (const cell of zone.border) {
      for (const neighbor of cell.neighbors) {
        if (neighbor.isPath && !neighbor.isPlot) {
          if (!anchor || (zone.tier.level > anchor.zone.tier.level)) anchor = cell;

          candidates.push(cell);
          break;
        }
      }
    }
  }

  const ramp = new Set([anchor]);
  let goon = true;

  while (goon) {
    goon = false;

    for (const cell of candidates) {
      if (ramp.has(cell)) continue;

      for (const neighbor of cell.neighbors) {
        if (ramp.has(neighbor)) {
          ramp.add(cell);
          goon = true;
          break;
        }
      }
    }
  }

  return ramp;
}

function isAtOrBehindEnemyBaseRamp(agent, ramp) {
  if (!agent.zone || !agent.zone.tier) console.log("DEBUG: No tier Probe:", agent.tag, "zone:", agent.zone ? agent.zone.name : "-");
  if (!agent.zone || !agent.zone.tier) return false;

  for (const cell of ramp) {
    return (agent.zone.tier.level >= cell.zone.tier.level);
  }
}

function isInVisibilityRangeOfEnemyBaseRamp(agent, ramp) {
  for (const cell of ramp) {
    if (!isInRange(agent.body, cell, agent.type.sightRange - 2)) return false;
  }

  return true;
}

function isEnemyBaseWalledOff(agent, ramp) {
  // The agent must have visiblity over the ramp to determine if it is walled off
  if (!isAtOrBehindEnemyBaseRamp(agent, ramp)) return false;

  for (const cell of ramp) {
    if (cell.isPath) return false;
  }

  return true;
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
  let closestDistance = Infinity;
  let closestEnemyWorker = null;
  let closestIsBuilding = null;

  for (const unit of Units.enemies().values()) {
    // Ignore units that are not workers
    if (!unit.type.isWorker) continue;

    // Ignore units that scout us
    if (!unit.zone || !unit.zone.tier) continue;
    if (unit.zone.tier.level < expansion.tier.level) continue;

    const isBuilding = isEnemyWorkerBuildingStructures(unit);
    if (closestIsBuilding && !isBuilding) continue;

    const distance = squareDistance(unit.body, expansion);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestEnemyWorker = unit;
      closestIsBuilding = isBuilding;
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

function findPylon() {
  for (const unit of Units.buildings().values()) {
    if (unit.type.isPylon) {
      return unit;
    }
  }
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

function findClosestCell(pos, cells) {
  let closestSquareDistance = Infinity;
  let closestCell = null;

  for (const cell of cells) {
    const sd = squareDistance(cell, pos);

    if (sd < closestSquareDistance) {
      closestSquareDistance = sd;
      closestCell = cell;
    }
  }

  return closestCell;
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
  // Check if our early scout struck the enemy worker at least twice
  return (unit.armor.shield + unit.armor.health <= unit.armor.shieldMax + unit.armor.healthMax - 10);
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

function orderSlip(agent, zone) {
  if (!agent || !agent.order || !agent.body) return;

  if (agent.order.abilityId !== 298) {
    new Order(agent, 298, [...(zone || Depot.home).minerals][0]).accept(true);
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

function isWithinBlock(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}

function squareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
