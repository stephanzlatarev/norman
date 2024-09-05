import Resources from "../memo/resources.js";
import Detect from "../jobs/detect.js";

const ATTACK_BALANCE = 1.6;
const DEFEND_BALANCE = 0.7;

const battles = [];

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";
  static MODE_SMASH = "smash";

  static RANGE_FRONT = "front";
  static RANGE_BACK = "back";

  recruitedBalance = 0;
  deployedBalance = 0;

  mode = Battle.MODE_RALLY;
  range = Battle.RANGE_BACK;
  stations = [];

  detector;
  fighters;

  constructor(hotspot) {
    console.log("Battle", hotspot.center.name, "begins");

    this.hotspot = hotspot;
    this.zones = hotspot.center.range.zones;

    this.zone = hotspot.center;
    this.priority = 100 - this.zone.tier.level;

    this.detector = null;
    this.fighters = [];

    battles.push(this);
  }

  setHotspot(hotspot) {
    this.hotspot = hotspot;
    this.zones = hotspot.center.range.zones;

    if (this.zone !== hotspot.center) {
      console.log("Battle", this.zone.name, "moves to", hotspot.center.name);

      this.zone = hotspot.center;
      this.priority = 100 - this.zone.tier.level;

      if (this.detector) {
        this.detector.updateBattle(this);
      }

      for (const fighter of this.fighters) {
        fighter.updateBattle(this);
      }
    }
  }

  setStations(stations) {
    this.stations = stations;
  }

  getClosestStation(pos) {
    let closestStation;
    let closestDistance = Infinity;

    for (const station of this.stations) {
      const distance = calculateSquareDistance(pos, station);

      if (distance < closestDistance) {
        closestStation = station;
        closestDistance = distance;
      }
    }

    return closestStation;
  }

  run() {
    if (this.stations.length && this.fighters.find(fighter => !!fighter.assignee)) {
      // At least one fighter is assigned. We need detection
      if (!this.detector || this.detector.isDone || this.detector.isFailed) {
        this.detector = new Detect(this);
      }
    } else {
      // No fighters are assigned. We don't need detection yet
      if (this.detector) {
        this.detector.close(true);
        this.detector = null;
      }
    }

    this.recruitedBalance = calculateBalance(this, false);
    this.deployedBalance = calculateBalance(this, true);

    if ((Resources.supplyUsed > 190) && ((this.deployedBalance >= ATTACK_BALANCE) || areEnoughFightersRallied(this))) {
      this.mode = Battle.MODE_FIGHT;
      this.range = Battle.RANGE_FRONT;
    } else if (this.deployedBalance === Infinity) {
      this.mode = Battle.MODE_SMASH;
      this.range = Battle.RANGE_FRONT;
    } else {
      let shouldFight;

      if (this.zone.tier.level === 1) {
        shouldFight = (this.deployedBalance >= DEFEND_BALANCE) || areEnoughFightersRallied(this);
      } else if (this.zone.tier.level === 2) {
        shouldFight = (this.deployedBalance >= DEFEND_BALANCE);
      } else {
        shouldFight = (this.deployedBalance >= ATTACK_BALANCE);
      }

      if (shouldFight) {
        this.mode = Battle.MODE_FIGHT;
        this.range = Battle.RANGE_FRONT;
      } else {
        this.mode = Battle.MODE_RALLY;
        this.range = Battle.RANGE_BACK;
      }
    }
  }

  close() {
    const index = battles.indexOf(this);

    if (index >= 0) {
      console.log("Battle", this.zone.name, "ends");

      if (this.detector) this.detector.close(true);

      for (const job of [...this.fighters]) {
        job.close(true);
      }

      battles.splice(index, 1);
    }
  }

  static list() {
    return [...battles];
  }

}

function areEnoughFightersRallied(battle) {
  const zones = battle.zone.range.zones;

  let deployed = 0;
  let rallying = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (zones.has(warrior.zone)) {
        deployed++;
      } else {
        rallying++;
      }
    }
  }

  return (deployed > rallying * 4);
}

function calculateBalance(battle, isDeployed) {
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of battle.fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (isDeployed && !battle.zone.range.zones.has(warrior.zone) && !isCloseTo(warrior.body, fighter.station)) continue;

    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  for (const one of battle.zone.range.zones) {
    for (const enemy of one.threats) {
      if (!enemy.type.isWorker && (enemy.type.damageGround > 0)) {
        enemyDamage += enemy.type.damageGround;
        enemyHealth += enemy.armor.total;
      }
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;

  return (enemyStrength > 0) ? (warriorStrength / enemyStrength) : Infinity;
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function isCloseTo(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
