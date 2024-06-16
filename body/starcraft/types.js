export const NORMAL_LOOPS_PER_SECOND = 16;

const units = new Map();
const upgrades = new Map();
const products = new Map();
const races = [[], [], [], []];

const IS_DEPOT = { Nexus: 1 };
const IS_DETECTOR = { Observer: 1, Overseer: 1, Raven: 1 };
const IS_EXTRACTOR = { Assimilator: 1 };
const IS_PYLON = { Pylon: 1 };
const IS_WORKER = { Drone: 1, MULE: 1, Probe: 1, SCV: 1 };

const RACE_PROTOSS = 3;

const ATTRIBUTE_STRUCTURE = 8;

class Types {

  product(abilityId) {
    return get(products, abilityId);
  }

  unit(key) {
    return get(units, key);
  }

  upgrade(key) {
    return get(upgrades, key);
  }

  list(race) {
    return races[race];
  }

  sync(data) {
    for (const unit of data.units) {
      if (!unit.available) continue;
      if (!unit.attributes.length) continue;

      const isNeutral = !unit.race;
      const isBuilding = (unit.attributes.indexOf(ATTRIBUTE_STRUCTURE) >= 0);
      const weapons = parseWeapons(unit);

      const type = this.unit(unit.name);

      type.id = unit.unitId;
      type.name = unit.name;

      type.attackGround = weapons.attackGround;
      type.attackAir = weapons.attackAir;
      type.damageGround = weapons.damageGround;
      type.damageAir = weapons.damageAir;
      type.rangeGround = weapons.rangeGround;
      type.rangeAir = weapons.rangeAir;
      type.weaponCooldown = weapons.weaponCooldown;

      type.isNeutral = isNeutral;
      type.isDepot = !!IS_DEPOT[unit.name];
      type.isPylon = !!IS_PYLON[unit.name];
      type.isWorker = !!IS_WORKER[unit.name];
      type.isWarrior = (weapons.damageGround + weapons.damageAir > 0) || IS_DETECTOR[unit.name];
      type.isExtractor = !!IS_EXTRACTOR[unit.name];
      type.isBuilding = isBuilding && !isNeutral;
      type.isMinerals = !!unit.hasMinerals;
      type.isVespene = !!unit.hasVespene && !unit.race;

      type.supplyProvided = unit.foodProvided;
      type.needsPower = (unit.race === RACE_PROTOSS) && !IS_DEPOT[unit.name] && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name];

      type.movementSpeed = unit.movementSpeed / NORMAL_LOOPS_PER_SECOND;
      type.sightRange = unit.sightRange;

      type.abilityId = unit.abilityId;
      type.buildTime = unit.buildTime;
      type.foodRequired = unit.foodRequired;
      type.mineralCost = unit.mineralCost;
      type.vespeneCost = unit.vespeneCost;
      type.techRequirement = unit.techRequirement;

      // Assume average of 10 seconds for 1 supply of production
      type.supplyConsumptionRate = (isBuilding && !IS_EXTRACTOR[unit.name] && !IS_PYLON[unit.name]) ? 1 / 10 / 22.4 : 0;

      units.set(unit.unitId, type);
      units.set(unit.name, type);

      races[unit.race].push(type);

      if (type.abilityId) {
        products.set(type.abilityId, type);
      }
    }

    for (const upgrade of data.upgrades) {
      if (upgrade.abilityId) {
        upgrades.set(upgrade.upgradeId, upgrade);
        upgrades.set(upgrade.name, upgrade);
      }
    }
  }

}

units.set("Building", { isBuilding: true });
units.set("Worker", { isWorker: true });
units.set("Warrior", { isWarrior: true });

function get(collection, key) {
  let type = collection.get(key);

  if (!type) {
    type = { name: "Other" };

    collection.set(key, type);
  }

  return type;
}

const GAME_SPEED = 1.4;
const WEAPON_GROUND = 1;
const WEAPON_AIR = 2;
const WEAPON_ANY = 3;

function parseWeapons(unit) {
  let attackGround = 0;
  let attackAir = 0;
  let damageGround = 0;
  let damageAir = 0;
  let rangeGround = 0;
  let rangeAir = 0;
  let weaponCooldown = Infinity;

  if (unit.name === "Sentry") {
    attackGround = 6;
    damageGround = 8.4;
    rangeGround = 5;
    attackAir = 6;
    damageAir = 8.4;
    rangeAir = 5;
  }

  for (const weapon of unit.weapons) {
    if ((weapon.type === WEAPON_GROUND) || (weapon.type === WEAPON_ANY)) {
      attackGround = weapon.damage;
      damageGround = Math.max(weapon.damage * weapon.attacks * GAME_SPEED / weapon.speed, damageGround);
      rangeGround = Math.max(weapon.range, rangeGround);
      weaponCooldown = Math.min((weapon.speed * NORMAL_LOOPS_PER_SECOND / weapon.attacks) * 0.9, weaponCooldown);
    }
    if ((weapon.type === WEAPON_AIR) || (weapon.type === WEAPON_ANY)) {
      attackAir = weapon.damage;
      damageAir = Math.max(weapon.damage * weapon.attacks * GAME_SPEED / weapon.speed, damageAir);
      rangeAir = Math.max(weapon.range, rangeGround);
      weaponCooldown = Math.min((weapon.speed * NORMAL_LOOPS_PER_SECOND / weapon.attacks) * 0.9, weaponCooldown);
    }
  }

  weaponCooldown = Math.max(weaponCooldown, 0);

  return { attackGround, attackAir, damageGround, damageAir, rangeGround, rangeAir, weaponCooldown };
}

export default new Types();
