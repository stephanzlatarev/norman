
//TODO:
// - add contact range beyond which warriors don't engage (exposure.isSuppressed=true). May depend on speed, e.g. timeToWalk < 20
// - check if warrior can hit this enemy
// - optimize calculation of distances (updateExposure) by keeping a threshold for change of pos until maybe in contact range

const MAX_MELEE_WARRIORS_PER_ENEMY = 3;

const listeners = new Map();

export default class Exposures {

  constructor(enemy) {
    this.enemy = enemy;
    this.estimateTimeToDie = Infinity;
    this.exposures = new Map();
  }

  update(warriors) {
    for (const warrior of this.exposures.keys()) {
      if (warrior.isDead) {
        this.exposures.delete(warrior);
      }
    }

    for (const warrior of warriors) {
      let exposure = this.exposures.get(warrior);

      if (exposure) {
        updateExposure(this.enemy, warrior, exposure);
      } else {
        exposure = createExposure(this.enemy, warrior);
        this.exposures.set(warrior, exposure);
      }

      warrior.canEngageInCombat = true;
    }

    estimateTimeToDie(this);
  }

  engage() {
    for (const warrior of this.warriors) {
      warrior.canEngageInCombat = false;
    }

    notifyListeners(this.warriors, this);

    return this.warriors;
  }

}

function createExposure(enemy, warrior) {
  const distanceX = (enemy.pos.x - warrior.pos.x);
  const distanceY = (enemy.pos.y - warrior.pos.y);
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY) - enemy.radius - warrior.radius - warrior.range;
  const timeToFire = warrior.cooldown;

  let timeToWalk = (distance / warrior.speed);
  if (warrior.mobility) {
    timeToWalk += warrior.mobility.penalty(enemy);
  }

  return {
    warrior: warrior,
    distance: distance,
    stepsToContact: Math.max(timeToWalk, timeToFire),
  };
}

function updateExposure(enemy, warrior, exposure) {
  const update = createExposure(enemy, warrior);
  exposure.distance = update.distance;
  exposure.stepsToContact = update.stepsToContact;
}

function estimateTimeToDie(one) {
  const exposures = [];

  for (const [warrior, exposure] of one.exposures) {
    if (warrior.canEngageInCombat) {
      exposures.push(exposure);
    }
  }

  exposures.sort(compareByDistanceAndDamage);

  const warriors = [];
  let health = one.enemy.health;
  let steps = 0;
  let dps = 0;
  let meleeWarriors = 0;

  for (const exposure of exposures) {
    if (exposure.warrior.range < 1) {
      if (meleeWarriors >= MAX_MELEE_WARRIORS_PER_ENEMY) {
        continue;
      } else {
        meleeWarriors++;
      }
    }

    // Update enemy health for the steps until the warrior gets into contact
    if (exposure.stepsToContact > steps) {
      health -= (exposure.stepsToContact - steps) * dps;
      steps = exposure.stepsToContact;

      // Check if enemy dies before this warrior arrives
      if (health <= 0) break;
    }

    // Add this warrior to list of attackers
    warriors.push(exposure.warrior);
    addListener(exposure.warrior, one);

    health -= exposure.warrior.damage;
    dps += exposure.warrior.dps;

    // Check if enemy dies at first hit by this warrior
    if (health <= 0) break;
  }

  one.warriors = warriors;

  if (health <= 0) {
    one.estimateTimeToDie = steps;
  } else if (dps > 0) {
    one.estimateTimeToDie = steps + health / dps;
  } else {
    one.estimateTimeToDie = Infinity;
  }
}

function compareByDistanceAndDamage(a, b) {
  if (a.stepsToContact !== b.stepsToContact) {
    return a.stepsToContact - b.stepsToContact;
  }

  return b.warrior.damage - a.warrior.damage;
}

function addListener(warrior, listener) {
  const list = listeners.get(warrior);

  if (list) {
    list.push(listener);
  } else {
    listeners.set(warrior, [listener]);
  }
}

function notifyListeners(warriors, excludeListener) {
  const set = new Set();

  for (const warrior of warriors) {
    const list = listeners.get(warrior);

    if (list) {
      for (const one of list) {
        set.add(one);
      }

      listeners.delete(warrior);
    }
  }

  for (const one of set) {
    if (one !== excludeListener) {
      estimateTimeToDie(one);
    }
  }
}
