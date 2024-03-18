import Types from "./types.js";
import Harvest from "./jobs/harvest.js";
import Hub from "./map/hub.js";
import Resources from "./memo/resources.js";
import Depot from "./map/depot.js";

const resources = new Map();
const workers = new Map();
const buildings = new Map();
const warriors = new Map();
const enemies = new Map();
const obstacles = new Map();

class Units {

  get(tag) {
    return resources.get(tag) || workers.get(tag) || buildings.get(tag) || warriors.get(tag) || enemies.get(tag) || obstacles.get(tag);
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
    if (type.isWorker) {
      return workers;
    } else if (type.isWarrior) {
      return warriors;
    } else if (type.isBuilding) {
      return buildings;
    }
  } else if (unit.owner === enemy.id) {
    return enemies;
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
          x: unit.pos.x,
          y: unit.pos.y,
        },
        armor: {
          healthMax: unit.healthMax,
          shieldMax: unit.shieldMax,
        }
      };
    }

    units.set(unit.tag, image);
  }

  image.isAlive = true;
  image.lastSeen = Resources.loop;
  image.isActive = (unit.buildProgress >= 1);
  image.order = unit.orders.length ? { ...unit.orders[0], queue: unit.orders.length } : { abilityId: 0, queue: 0 };
  image.direction = unit.facing;
  image.energy = unit.energy;
  image.body.x = unit.pos.x;
  image.body.y = unit.pos.y;
  image.armor.health = unit.health;
  image.armor.shield = unit.shield;

  image.isSelected = unit.isSelected;

  if (image.isOwn) {
    if (image.type.isWorker) {
      image.isCarryingHarvest = isCarryingHarvest(unit);

      if (!image.depot && !image.job) {
        const depot = findDepot(image.body, 10);

        if (depot) {
          depot.assignWorker(image);
        }
      }
    } else if (image.type.isDepot) {
      if (!image.depot) {
        image.depot = findDepot(image.body);
      } else if (unit.rallyTargets && unit.rallyTargets.length) {
        image.rally = unit.rallyTargets[0].point;
      }

      if (image.depot) {
        image.depot.isActive = image.isActive;
      }
    } else if (image.type.isPylon) {
      if (!image.hub && !image.nohub) {
        image.hub = findHub(image.body);
      }

      if (image.hub) {
        image.hub.pylonPlots[0].isFree = false;
        image.hub.isPowered = image.isActive;
      } else {
        image.nohub = !!findHub(image.body, 3);
      }
    }

    if (image.type.isBuilding) {
      image.boost = getBoostPercentage(unit);
    }
  }

  return image;
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
    }
  }
}

function removeDeadUnits(units, alive) {
  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      unit.isAlive = false;
      units.delete(tag);
    }
  }
}

function removeZombieUnits(units, alive) {
  const list = [];

  for (const [tag, unit] of units) {
    if (!alive.get(tag)) {
      list.push(unit);
      units.delete(tag);
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

function isCarryingHarvest(unit) {
  for (const buffId of unit.buffIds) {
    if (buffId === 271) return true;
    if (buffId === 272) return true;
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

function findHub(pos, distance) {
  for (const hub of Hub.list()) {
    if (isAt(hub, pos, distance)) {
      return hub;
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
