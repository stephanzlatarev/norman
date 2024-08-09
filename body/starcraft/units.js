import Types from "./types.js";
import Harvest from "./jobs/harvest.js";
import Resources from "./memo/resources.js";
import Depot from "./map/depot.js";
import GameMap from "./map/map.js";

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

  sync(units, me, enemy) {
    const alive = new Map();

    for (const unit of units) {
      alive.set(unit.tag, true);
    }

    const zombies = removeZombieUnits(resources, alive);

    removeDeadWorkers(alive);
    removeDeadUnits(buildings, alive);
    removeDeadUnits(warriors, alive);
    removeDeadUnits(hallucinations, alive);
    removeDeadUnits(enemies, alive);
    removeDeadUnits(obstacles, alive);

    for (const unit of units) {
      const type = Types.unit(unit.unitType);
      const group = findGroup(unit, type, me, enemy)

      syncUnit(group, unit, type, zombies, me, enemy);

      alive.set(unit.tag, true);
    }
  }

}

function findGroup(unit, type, me, enemy) {
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
  } else if (unit.owner === enemy.id) {
    if (!unit.isHallucination) {
      return enemies;
    }
  } else if (type.isMinerals || type.isVespene) {
    return resources;
  }

  return obstacles;
}

function syncUnit(units, unit, type, zombies, me, enemy) {
  let image = units.get(unit.tag);

  if (!image) {
    const zombie = findZombie(unit, type, zombies);

    if (zombie) {
      image = zombie;

      image.tag = unit.tag;
      image.nick = unit.tag.slice(unit.tag.length - 3);
    } else {
      image = {
        tag: unit.tag,
        nick: unit.tag.slice(unit.tag.length - 3),
        isOwn: (unit.owner === me.id),
        isEnemy: (unit.owner === enemy.id),
        type: type,
        body: {
          r: unit.radius,
          x: unit.pos.x,
          y: unit.pos.y,
          z: unit.pos.z,
        },
        weapon: {
          cooldown: 0,
          orbGround: type.rangeGround ? Math.ceil(type.rangeGround + unit.radius + 4) : 0,
        },
        armor: {
          healthMax: unit.healthMax,
          shieldMax: unit.shieldMax,
          totalMax: unit.healthMax + unit.shieldMax,
        }
      };
    }

    units.set(unit.tag, image);
  }

  if (image.type.id !== unit.unitType) {
    image.type = Types.unit(unit.unitType);
  }

  image.isAlive = true;
  image.isHallucination = unit.isHallucination;
  image.lastSeen = Resources.loop;
  image.buildProgress = unit.buildProgress;
  image.isActive = (unit.buildProgress >= 1) && (unit.isPowered || !image.type.needsPower);
  image.order = unit.orders.length ? { ...unit.orders[0], queue: unit.orders.length } : { abilityId: 0, queue: 0 };
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

  image.isSelected = unit.isSelected;

  if (image.type.isWorker) {
    image.isCarryingMinerals = isCarryingMinerals(unit);
    image.isCarryingVespene = isCarryingVespene(unit);
    image.isCarryingHarvest = image.isCarryingMinerals || image.isCarryingVespene;
  }

  if (image.isOwn) {
    if (image.type.isWorker) {
      if (!image.depot && !image.job) {
        const depot = findDepot(image.body, 10);

        if (depot) {
          depot.assignWorker(image);
        }
      }
    } else if (image.type.isDepot) {
      if (!image.depot) {
        image.depot = findDepot(image.body);
      }

      if (image.depot) {
        image.depot.isActive = image.isActive;
      }
    } else if (image.type.isExtractor) {
      if (!unit.vespeneContents) {
        image.isActive = false;
      }
    }

    if (image.type.isBuilding) {
      image.boost = getBoostPercentage(unit);
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

  addToZone(image);

  return image;
}

function addToZone(image) {
  if (GameMap.board && image) {
    const cell = GameMap.cell(image.body.x, image.body.y);

    image.cell = cell;

    if (cell.zone && cell.zone.cell) { // TODO: Make sure all zones have a central cell and remove "&& cell.zone.cell" part of the condition here
      cell.zone.addUnit(image);
    }
  }
}

function removeFromZone(image) {
  if (image && image.zone) {
    image.zone.removeUnit(image);
  }
}

function isWorkerInExtractor(worker) {
  return (worker.job instanceof Harvest) && worker.job.target && worker.job.target.type.isExtractor && (Resources.loop - worker.lastSeen < 35);
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
      if (worker.depot) {
        worker.depot.releaseWorker(worker);
      }

      worker.isAlive = false;
      workers.delete(tag);

      removeFromZone(worker);
    }
  }
}

function removeDeadUnits(units, alive) {
  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      unit.isAlive = false;
      units.delete(tag);

      removeFromZone(unit);
    }
  }
}

function removeZombieUnits(units, alive) {
  const list = [];

  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      list.push(unit);
      unit.isAlive = false;
      units.delete(tag);

      removeFromZone(unit);
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

function findDepot(pos, distance) {
  for (const depot of Depot.list()) {
    if (isAt(depot, pos, distance)) {
      return depot;
    }
  }
}

function isAt(object, pos, distance) {
  if (distance > 0) {
    return (Math.abs(object.x - pos.x) < distance) && (Math.abs(object.y - pos.y) < distance);
  }

  return (object.x === pos.x) && (object.y === pos.y);
}

export default new Units();
