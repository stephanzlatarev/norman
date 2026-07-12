import Types from "./types.js";
import Enemy from "./memo/enemy.js";
import Resources from "./memo/resources.js";
import Board from "./map/board.js";

const resources = new Map();
const workers = new Map();
const buildings = new Map();
const warriors = new Map();
const hallucinations = new Map();
const enemies = new Map();
const obstacles = new Map();

class Units {

  get(tag) {
    return resources.get(tag) || workers.get(tag) || buildings.get(tag) || warriors.get(tag) || enemies.get(tag) || obstacles.get(tag) || hallucinations.get(tag);
  }

  resources() {
    return resources;
  }

  workers() {
    return workers;
  }

  buildings() {
    return buildings;
  }

  warriors() {
    return warriors;
  }

  hallucinations() {
    return hallucinations;
  }

  enemies() {
    return enemies;
  }

  obstacles() {
    return obstacles;
  }

  sync(units, events, me) {
    const alive = new Map();

    if (events && events.deadUnits) {
      for (const tag of events.deadUnits) {
        let group = resources;
        let image = resources.get(tag);
        if (!image) { group = workers; image = workers.get(tag); }
        if (!image) { group = buildings; image = buildings.get(tag); }
        if (!image) { group = warriors; image = warriors.get(tag); }
        if (!image) { group = enemies; image = enemies.get(tag); }
        if (!image) { group = obstacles; image = obstacles.get(tag); }
        if (!image) { group = hallucinations; image = hallucinations.get(tag); }

        if (image) {
          image.sector.untrackUnit(image);

          removeImage(image, group, tag);
        }

        if ((group === obstacles) || (group === resources)) {
          Board.refresh(Resources.loop);
        }
      }
    }

    for (const unit of units) {
      alive.set(unit.tag, true);
    }

    const zombies = removeZombieUnits(resources, alive);

    removeDeadWorkers(alive);
    removeDeadUnits(buildings, alive);
    removeDeadUnits(warriors, alive);
    removeDeadUnits(hallucinations, alive);
    removeDeadUnits(enemies, alive, true);
    removeDeadUnits(obstacles, alive);

    for (const unit of units) {
      const type = Types.unit(unit.unitType);
      const group = findGroup(unit, type, me)

      syncUnit(group, unit, type, zombies, me);

      alive.set(unit.tag, true);
    }
  }

}

const INVALID_TARGET_TYPES = new Set([
  "AdeptPhaseShift",
  "Broodling",
  "Interceptor",
  "KD8Charge",
]);

class Unit {

  constructor(unit, isOwn, type) {
    this.setTag(unit.tag);
    this.isOwn = isOwn;
    this.isEnemy = !isOwn && (unit.owner !== Enemy.NEUTRAL_ID);
    this.type = type;
    this.body = {
      r: unit.radius,
      x: unit.pos.x,
      y: unit.pos.y,
      z: unit.pos.z,
    };
    this.weapon = {
      cooldown: 0,
    };
    this.armor = {
      healthMax: unit.healthMax,
      shieldMax: unit.shieldMax,
      totalMax: unit.healthMax + unit.shieldMax,
    };
  }

  setTag(tag) {
    this.tag = tag;
    this.nick = tag.slice(tag.length - 3);
  }

  canShootTarget(target, isInSight) {
    if (!target) return false;
    if (!target.isValidShootingTarget) return false;
    if (!target.isValidShootingTarget(isInSight)) return false;

    if (target.body.isGround && !this.type.damageGround) return false;
    if (target.body.isFlying && !this.type.damageAir) return false;

    return true;
  }

  isValidShootingTarget(isInSight) {
    if (isInSight) {
      if (!this.isVisible) return false;
      if (this.lastSeen < Resources.loop) return false;
    }

    if (!this.isEnemy) return false;
    if (!this.isAlive) return false;

    if (this.isHallucination) return false;
    if (this.type.isCocoon) return false;
    if (INVALID_TARGET_TYPES.has(this.type.name)) return false;

    return true;
  }

  // Check if the target is in the fire range of this unit.
  isTargetInFireRange(target, bufferRange = 0) {
    if (!target) return false;

    if (target.body.isGround && this.type.rangeGround) {
      return isInRange(this, target, this.type.rangeGround + bufferRange);
    } else if (target.body.isFlying && this.type.rangeAir) {
      return isInRange(this, target, this.type.rangeAir + bufferRange);
    }
  }
}

function findGroup(unit, type, me) {
  if (unit.owner === me.id) {
    if (unit.isHallucination) {
      return hallucinations;
    } else if (type.isWorker) {
      return workers;
    } else if (type.isWarrior) {
      return warriors;
    } else if (type.isBuilding) {
      return buildings;
    }
  } else if (unit.owner !== Enemy.NEUTRAL_ID) {
    if (!unit.isHallucination) {
      return enemies;
    }
  } else if (type.isMinerals || type.isVespene) {
    return resources;
  }

  return obstacles;
}

function syncUnit(units, unit, type, zombies, me) {
  let image = units.get(unit.tag);

  if (!image) {
    const zombie = findZombie(unit, type, zombies);

    if (zombie) {
      image = zombie;
      image.setTag(unit.tag);
    } else {
      image = new Unit(unit, (unit.owner === me.id), type);
    }

    units.set(unit.tag, image);
  }

  if (image.type.id !== unit.unitType) {
    image.type = Types.unit(unit.unitType);
  }

  const previousArmorTotal = image.armor.total;

  image.isAlive = true;
  image.isVisible = (unit.displayType === 1);
  image.isHallucination = unit.isHallucination;
  image.lastSeen = Resources.loop;
  image.lastPos = image.body ? { ...image.body } : { ...unit.pos };
  image.buildProgress = unit.buildProgress;
  image.isActive = (unit.buildProgress >= 1) && (unit.isPowered || !image.type.needsPower);
  image.order = unit.orders.length ? { ...unit.orders[0], queue: unit.orders.length } : { abilityId: 0, queue: 0 };
  image.queue = (unit.orders.length > 1) ? unit.orders : null;
  image.rally = (unit.rallyTargets && unit.rallyTargets.length) ? unit.rallyTargets[0].point : null;
  image.direction = unit.facing;
  image.energy = unit.energy;
  image.body.isFlying = unit.isFlying;
  image.body.isGround = !unit.isFlying;
  image.body.x = unit.pos.x;
  image.body.y = unit.pos.y;
  image.body.z = unit.pos.z;
  image.weapon.cooldown = Math.max(unit.weaponCooldown, 0);
  image.armor.health = unit.health;
  image.armor.shield = unit.shield;
  image.armor.total = unit.health + unit.shield;
  image.armor.previous = previousArmorTotal;
  image.isHit = (image.armor.total < image.armor.previous);

  image.isSelected = unit.isSelected;

  if (image.type.isWorker) {
    image.isCarryingMinerals = isCarryingMinerals(unit);
    image.isCarryingVespene = isCarryingVespene(unit);
    image.isCarryingHarvest = image.isCarryingMinerals || image.isCarryingVespene;
  }

  if (image.isOwn) {
    if (image.type.isExtractor) {
      if (!unit.vespeneContents) {
        image.isActive = false;
      }
    }

    if (image.type.isBuilding) {
      image.boost = getBoostPercentage(unit);
    }

    if (image.type.name === "Oracle") {
      image.isPulsarBeamOn = isPulsarBeamOn(unit);
    }
  } else if (image.type.isMinerals) {
    if (!unit.mineralContents) {
      image.isActive = false;
    }
  } else if (image.type.isVespene) {
    if (!unit.vespeneContents) {
      image.isActive = false;
    }
  }

  if (Board.cells) {
    const cell = Board.cell(image.body.x, image.body.y);

    image.cell = cell;

    cell.sector.addUnit(image);
    image.sector = cell.sector;

    if (cell.zone) {
      cell.zone.addUnit(image);
      image.zone = cell.zone;
    } else if (image.zone) {
      image.zone.removeUnit(image);
    }
  }

  return image;
}

function removeImage(image, group, tag, keepAlive) {
  if (image) {
    if (!keepAlive) {
      image.isAlive = false;
    }

    group.delete(tag);

    if (image.sector) {
      image.sector.removeUnit(image);
    }

    if (image.zone) {
      image.zone.removeUnit(image);
    }
  }
}

function isWorkerInExtractor(worker) {
  return worker.job && worker.job.isHarvestVespeneJob && (Resources.loop - worker.lastSeen < 35);
}

function getBoostPercentage(unit) {
  if (unit.buffDurationMax && unit.buffIds.length && (unit.buffIds.indexOf(281) >= 0)) {
    return unit.buffDurationRemain * 100 / unit.buffDurationMax; 
  }

  return 0;
}

function removeDeadWorkers(alive) {
  for (const [tag, worker] of workers) {
    if (!alive.get(tag) && !isWorkerInExtractor(worker)) {
      removeImage(worker, workers, tag);
    }
  }
}

function removeDeadUnits(units, alive, keepAlive) {
  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      removeImage(unit, units, tag, keepAlive);
    }
  }
}

function removeZombieUnits(units, alive) {
  const list = [];

  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      list.push(unit);
      removeImage(unit, units, tag);
    }
  }

  return list;
}

function findZombie(unit, type, zombies) {
  if (!type.isMinerals && !type.isVespene) return;

  for (const zombie of zombies) {
    if ((zombie.body.x === unit.pos.x) && (zombie.body.y === unit.pos.y)) {
      return zombie;
    }
  }
}

function isCarryingMinerals(unit) {
  for (const buffId of unit.buffIds) {
    if (buffId === 271) return true;
    if (buffId === 272) return true;
  }

  return false;
}

function isCarryingVespene(unit) {
  for (const buffId of unit.buffIds) {
    if (buffId === 273) return true;
    if (buffId === 274) return true;
    if (buffId === 275) return true;
  }

  return false;
}

function isPulsarBeamOn(unit) {
  for (const buffId of unit.buffIds) {
    if (buffId === 99) return true;
  }

  return false;
}

function isInRange(warrior, target, range) {
  const squareDistance = calculateSquareDistance(warrior.body, target.body);
  const totalRange = warrior.body.r + range + target.body.r;
  const squareRange = totalRange * totalRange;

  return (squareDistance <= squareRange);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

export default new Units();
